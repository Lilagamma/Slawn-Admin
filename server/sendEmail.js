const sgMail = require('@sendgrid/mail');

// Load the SendGrid API key from .env
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send an email using SendGrid
 * @param {string} to - recipient email
 * @param {string} subject - subject line
 * @param {string} text - plain text body
 * @param {string} html - HTML body (optional)
 */
async function sendEmail(to, subject, text, html = '') {
  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL, // also from .env
    subject,
    text,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    if (error.response) {
      console.error(error.response.body);
    }
  }
}

module.exports = sendEmail;
