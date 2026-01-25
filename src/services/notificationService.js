const SibApiV3Sdk = require('@sendinblue/client');
const { all, run } = require('../utils/db-async');

const checkExpiringDocuments = async () => {
    console.log('Running scheduled task: Checking for expiring documents...');

    // Configure Brevo API
    let defaultClient = SibApiV3Sdk.ApiClient.instance;
    let apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    
    // SQL to find documents expiring in 30 or 7 days that we haven't sent a notification for yet.
    const query = `
        SELECT 
            d.id, 
            d.title, 
            d.expiry_date
        FROM documents d
        WHERE 
            (
                -- Check for 30-day warning
                date(d.expiry_date) = date('now', '+30 days') AND
                NOT EXISTS (
                    SELECT 1 FROM notification_logs nl 
                    WHERE nl.document_id = d.id AND nl.trigger_type = '30_day_warning'
                )
            ) OR (
                -- Check for 7-day warning
                date(d.expiry_date) = date('now', '+7 days') AND
                NOT EXISTS (
                    SELECT 1 FROM notification_logs nl 
                    WHERE nl.document_id = d.id AND nl.trigger_type = '7_day_warning'
                )
            )
    `;

    try {
        const documents = await all(query);
        if (documents.length === 0) {
            console.log('No documents require notification today.');
            return;
        }

        for (const doc of documents) {
            const today = new Date();
            const expiryDate = new Date(doc.expiry_date);
            const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            
            let triggerType = '';
            if (daysUntilExpiry <= 7) {
                triggerType = '7_day_warning';
            } else if (daysUntilExpiry <= 30) {
                triggerType = '30_day_warning';
            }

            console.log(`Sending ${triggerType} for document: ${doc.title}`);

            // Define the email
            const sendSmtpEmail = {
                to: [{ email: 'markyliherr@gmail.com', name: 'BPS Admin' }], // The recipient
                sender: { email: 'marklawrencecatubay@gmail.com', name: 'BPS System' }, // IMPORTANT: Use an authorized sender email
                subject: `❗ Document Expiry Warning: ${doc.title}`,
                htmlContent: `
                    <h1>Document Expiry Alert</h1>
                    <p>This is an automated notification from the BPS Records Management System.</p>
                    <p>The following document is approaching its expiration date:</p>
                    <ul>
                        <li><strong>Document:</strong> ${doc.title}</li>
                        <li><strong>Expires On:</strong> ${doc.expiry_date}</li>
                        <li><strong>Days Remaining:</strong> ${daysUntilExpiry}</li>
                    </ul>
                    <p>Please take the necessary action to renew it.</p>
                `
            };

            // Send the email
            await apiInstance.sendTransacEmail(sendSmtpEmail);
            
            // Log that the notification was sent to prevent duplicates
            await run(
                'INSERT INTO notification_logs (document_id, trigger_type) VALUES (?, ?)',
                [doc.id, triggerType]
            );

            console.log(`Notification sent successfully for document ID ${doc.id}`);
        }
    } catch (error) {
        console.error('Error in notification service:', error.response ? error.response.body : error);
    }
};

module.exports = { checkExpiringDocuments };