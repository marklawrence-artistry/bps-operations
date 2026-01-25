const SibApiV3Sdk = require('@sendinblue/client');
const { all, run } = require('../utils/db-async');

const checkExpiringDocuments = async () => {
    console.log('--- RUNNING DAILY DOCUMENT CHECK ---');

    // 1. VALIDATE ENV VARIABLES
    if (!process.env.BREVO_API_KEY) {
        console.error("SKIPPING: Missing BREVO_API_KEY in .env");
        return;
    }

    // 2. CONFIGURE BREVO
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    apiInstance.setApiKey(
        SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, 
        process.env.BREVO_API_KEY
    );
    
    // 3. STRICT PRODUCTION QUERY
    // Only selects documents expiring in EXACTLY 30 days or 7 days
    // AND ensures we haven't already logged a notification for them.
    const query = `
        SELECT d.id, d.title, d.expiry_date
        FROM documents d
        WHERE 
            (date(d.expiry_date) = date('now', '+30 days') 
            AND NOT EXISTS (SELECT 1 FROM notification_logs nl WHERE nl.document_id = d.id AND nl.trigger_type = '30_day_warning'))
        OR 
            (date(d.expiry_date) = date('now', '+7 days') 
            AND NOT EXISTS (SELECT 1 FROM notification_logs nl WHERE nl.document_id = d.id AND nl.trigger_type = '7_day_warning'))
    `;

    try {
        const documents = await all(query);

        if (documents.length === 0) {
            console.log('No expiring documents found today.');
            return;
        }

        console.log(`Found ${documents.length} documents expiring soon.`);

        for (const doc of documents) {
            const today = new Date();
            const expiryDate = new Date(doc.expiry_date);
            const diffTime = expiryDate - today;
            const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

            // Prepare Email
            const sendSmtpEmail = {
                to: [{ email: process.env.ADMIN_EMAIL, name: 'BPS Admin' }], 
                sender: { email: process.env.SENDER_EMAIL, name: process.env.SENDER_NAME || 'BPS System' }, 
                subject: `[BPS ALERT] Document Expiry: ${doc.title}`,
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                        <h2 style="color: #d35400;">Document Expiration Warning</h2>
                        <p>The document <strong>${doc.title}</strong> is expiring soon.</p>
                        <hr>
                        <p><strong>Expiry Date:</strong> ${doc.expiry_date}</p>
                        <p><strong>Days Remaining:</strong> ${daysUntilExpiry} days</p>
                        <br>
                        <p style="font-size: 12px; color: #888;">This is an automated system notification.</p>
                    </div>
                `
            };

            // Send Email
            await apiInstance.sendTransacEmail(sendSmtpEmail);
            console.log(`✅ Email sent for: ${doc.title}`);

            // Log to Database (Prevents duplicate emails tomorrow)
            const triggerType = daysUntilExpiry <= 10 ? '7_day_warning' : '30_day_warning';
            await run('INSERT INTO notification_logs (document_id, trigger_type) VALUES (?, ?)', [doc.id, triggerType]);
        }
    } catch (error) {
        console.error("❌ Notification Service Error:", error.message);
        if(error.response) console.error(error.response.body);
    }
};

module.exports = { checkExpiringDocuments };