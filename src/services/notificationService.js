const SibApiV3Sdk = require('@sendinblue/client');
const { all, run } = require('../utils/db-async');

const checkExpiringDocuments = async (isTest = false) => {
    console.log(`--- RUNNING DOCUMENT CHECK (Test Mode: ${isTest}) ---`);

    if (!process.env.BREVO_API_KEY) {
        console.error("SKIPPING: Missing BREVO_API_KEY");
        return;
    }

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    apiInstance.setApiKey(
        SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, 
        process.env.BREVO_API_KEY
    );
    
    let query;
    let queryParams = [];

    // 1. QUERY SELECTION
    if (!isTest) {
        // PRODUCTION: Strict dates (7 days or 30 days exactly)
        query = `
            SELECT d.id, d.title, d.expiry_date, d.category
            FROM documents d
            WHERE 
                (date(d.expiry_date) = date('now', '+30 days') 
                AND NOT EXISTS (SELECT 1 FROM notification_logs nl WHERE nl.document_id = d.id AND nl.trigger_type = '30_day_warning'))
            OR 
                (date(d.expiry_date) = date('now', '+7 days') 
                AND NOT EXISTS (SELECT 1 FROM notification_logs nl WHERE nl.document_id = d.id AND nl.trigger_type = '7_day_warning'))
        `;
    } else {
        // TEST MODE: Get ALL active documents expiring in the next 365 days (Mockup scenario)
        // We limit to 20 just to keep the email readable for the demo
        query = `
            SELECT d.id, d.title, d.expiry_date, d.category
            FROM documents d
            WHERE date(d.expiry_date) > date('now') 
            ORDER BY d.expiry_date ASC
            LIMIT 20
        `;
    }

    try {
        const documents = await all(query, queryParams);

        if (documents.length === 0) {
            console.log('No expiring documents found.');
            return { success: true, count: 0 };
        }

        console.log(`Found ${documents.length} documents. Preparing summary email...`);

        // 2. BUILD EMAIL CONTENT (HTML TABLE)
        // This solves the "100 emails" problem. We make one table.
        let tableRows = documents.map(doc => {
            const daysLeft = Math.ceil((new Date(doc.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
            const color = daysLeft <= 30 ? 'red' : 'black';
            return `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${doc.title}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${doc.category}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${doc.expiry_date}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; color: ${color}; font-weight: bold;">${daysLeft} days</td>
                </tr>
            `;
        }).join('');

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2e3b97; border-bottom: 2px solid #ff9831; padding-bottom: 10px;">
                    ${isTest ? '[TEST RUN] ' : ''}BPS Document Expiration Alert
                </h2>
                <p>The following ${documents.length} document(s) are approaching their expiration date:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <thead>
                        <tr style="background-color: #f3f4f6; text-align: left;">
                            <th style="padding: 10px;">Document</th>
                            <th style="padding: 10px;">Category</th>
                            <th style="padding: 10px;">Expiry Date</th>
                            <th style="padding: 10px;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>

                <p style="margin-top: 30px; font-size: 12px; color: #666;">
                    Please log in to the BPS System to update these records.<br>
                    This is an automated message.
                </p>
            </div>
        `;

        // 3. SEND ONE SUMMARY EMAIL
        const sendSmtpEmail = {
            to: [{ email: process.env.ADMIN_EMAIL, name: 'BPS Admin' }], 
            sender: { email: process.env.SENDER_EMAIL, name: 'BPS System' }, 
            subject: `${isTest ? '[TEST] ' : '[ALERT] '} Daily Document Expiry Summary (${documents.length} Items)`,
            htmlContent: emailHtml
        };

        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`✅ Summary email sent successfully.`);

        // 4. LOGGING (Only in Production)
        // We still log individual documents so we don't include them in tomorrow's digest (if we are using the 7/30 day logic)
        if (!isTest) {
            for (const doc of documents) {
                const daysLeft = Math.ceil((new Date(doc.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
                const triggerType = daysLeft <= 10 ? '7_day_warning' : '30_day_warning';
                await run('INSERT INTO notification_logs (document_id, trigger_type) VALUES (?, ?)', [doc.id, triggerType]);
            }
        }

        return { success: true, count: documents.length };

    } catch (error) {
        console.error("❌ Notification Error:", error.message);
        throw error;
    }
};

module.exports = { checkExpiringDocuments };