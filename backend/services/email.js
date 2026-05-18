// BRD 5.2 - Email Notification Integration
const nodemailer = require('nodemailer');

// Configure transport using Gmail
// In production, these should be securely stored in process.env
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'atomquest.bot@gmail.com',
        pass: process.env.EMAIL_PASS || 'dummy-app-password'
    }
});

/**
 * Sends an email notification.
 * If credentials are not properly set, it logs to the console to prevent crashing the demo.
 */
async function sendEmail(to, subject, htmlContent) {
    try {
        if (!process.env.EMAIL_PASS) {
            console.log(`\n📧 [EMAIL MOCK] To: ${to}\nSubject: ${subject}\nBody: ${htmlContent.replace(/<[^>]*>?/gm, '')}\n`);
            return true;
        }

        const info = await transporter.sendMail({
            from: '"AtomQuest Portal" <atomquest.bot@gmail.com>',
            to,
            subject,
            html: htmlContent
        });
        console.log(`[EMAIL] Sent to ${to}: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`[EMAIL ERROR] Failed to send email to ${to}:`, error.message);
        return false;
    }
}

// Pre-defined templates for the Portal Workflow
const EmailTemplates = {
    goalSubmitted: (employeeName, managerName, portalUrl) => ({
        subject: 'Action Required: Goals Submitted for Approval',
        html: `<p>Hi ${managerName},</p>
               <p><strong>${employeeName}</strong> has submitted their Quarterly Goal Sheet for your review.</p>
               <p>Please log into the AtomQuest Portal to approve or return the goals for rework.</p>
               <p><a href="${portalUrl}/manager">Click here to view Team Dashboard</a></p>`
    }),

    goalApproved: (employeeName, portalUrl) => ({
        subject: 'Goal Sheet Approved & Locked',
        html: `<p>Hi ${employeeName},</p>
               <p>Your Manager has officially <strong>approved</strong> your Goal Sheet.</p>
               <p>Your goals are now locked. You can begin tracking your achievement against these targets during the active Check-in window.</p>
               <p><a href="${portalUrl}/employee">View Your Goals</a></p>`
    }),

    goalReturned: (employeeName, portalUrl) => ({
        subject: 'Goal Sheet Returned for Rework',
        html: `<p>Hi ${employeeName},</p>
               <p>Your Manager has returned your Goal Sheet for rework. Please review their feedback and resubmit.</p>
               <p><a href="${portalUrl}/employee">Edit Your Goals</a></p>`
    })
};

module.exports = { sendEmail, EmailTemplates };
