const SibApiV3Sdk = require('@sendinblue/client');
// FIX: Added 'get' to the destructuring list
const { all, run, get } = require('../utils/db-async'); 

const checkExpiringDocuments = async (isTest = false) => {
    console.log(`--- RUNNING DOCUMENT CHECK (Test: ${isTest}) ---`);

    if (!process.env.BREVO_API_KEY) {
        console.error("Skipping: No BREVO_API_KEY");
        return;
    }

    // 1. Get Admin Email from DB (Dynamic)
    let adminEmail = process.env.ADMIN_EMAIL;
    try {
        const setting = await get(`SELECT value FROM settings WHERE key = 'admin_email'`);
        if (setting && setting.value) adminEmail = setting.value;
    } catch (err) {
        console.error("Error fetching admin email setting, using default.", err);
    }

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
    
    let query;

    if (!isTest) {
        // PRODUCTION
        query = `
            SELECT d.id, d.title, d.expiry_date, d.category
            FROM documents d
            WHERE 
                (date(d.expiry_date) = date('now', 'localtime', '+30 days') 
                AND NOT EXISTS (SELECT 1 FROM notification_logs nl WHERE nl.document_id = d.id AND nl.trigger_type = '30_day_warning'))
            OR 
                (date(d.expiry_date) = date('now', 'localtime', '+7 days') 
                AND NOT EXISTS (SELECT 1 FROM notification_logs nl WHERE nl.document_id = d.id AND nl.trigger_type = '7_day_warning'))
        `;
    } else {
        // TEST MODE
        query = `SELECT id, title, expiry_date, category FROM documents WHERE date(expiry_date) >= date('now') LIMIT 20`;
    }

    try {
        const documents = await all(query);
        if (documents.length === 0) return { success: true, count: 0 };

        let tableRows = documents.map(doc => {
            const daysLeft = Math.ceil((new Date(doc.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
            return `<tr>
                <td style="padding:5px; border-bottom:1px solid #ccc">${doc.title}</td>
                <td style="padding:5px; border-bottom:1px solid #ccc">${doc.expiry_date}</td>
                <td style="padding:5px; border-bottom:1px solid #ccc; font-weight:bold; color:red">${daysLeft} days left</td>
            </tr>`;
        }).join('');

        const emailHtml = `
            <h2>BPS Document Expiry Alert</h2>
            <p>The following documents need attention:</p>
            <table style="width:100%; border-collapse:collapse;">
                <tr style="background:#eee; text-align:left;"><th>Title</th><th>Expiry</th><th>Status</th></tr>
                ${tableRows}
            </table>
        `;

        const sendSmtpEmail = {
            to: [{ email: adminEmail, name: 'BPS Admin' }],
            sender: { email: process.env.SENDER_EMAIL, name: 'BPS System' }, 
            subject: `${isTest ? '[TEST] ' : '[ALERT] '} Document Expiry Summary`,
            htmlContent: emailHtml
        };

        await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log(`Email sent to ${adminEmail}`);
        
        if (!isTest) {
            for (const doc of documents) {
                const daysLeft = Math.ceil((new Date(doc.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
                const trigger = daysLeft <= 10 ? '7_day_warning' : '30_day_warning';
                await run('INSERT INTO notification_logs (document_id, trigger_type) VALUES (?, ?)', [doc.id, trigger]);
            }
        }
        return { success: true, count: documents.length };

    } catch (error) {
        // Expose the EXACT reason Brevo is rejecting your email
        const brevoError = error.response ? error.response.text : error.message;
        console.error("Notification Error Details:", brevoError);
        throw new Error(brevoError); // Throw the real error back to the frontend
    }
};

module.exports = { checkExpiringDocuments };