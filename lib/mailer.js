const nodemailer = require('nodemailer');
require('dotenv').config();

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || 'techshad04@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || 'jqesnvkkbqwxzjqv';
const SMTP_FROM = process.env.SMTP_FROM || `"CoachConnect" <${SMTP_USER}>`;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

async function verifySmtp() {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    console.error('SMTP connection failed:', error);
    return false;
  }
}

async function sendOtpEmail(toEmail, otpCode, purpose = 'verify', recipientName) {
  try {
    const greeting = recipientName ? `Hello ${recipientName},` : 'Hello,';
    
    let actionTitle = 'Verification Code';
    let actionDescription = 'Please use the 6-digit verification code below to authenticate your request.';
    
    if (purpose === 'signup') {
      actionTitle = 'Confirm Your Registration';
      actionDescription = 'Welcome to CoachConnect! Use the 6-digit code below to verify your email address and activate your account.';
    } else if (purpose === 'signin') {
      actionTitle = 'Sign In to Your Account';
      actionDescription = 'We received a sign-in request for your CoachConnect account. Use the code below to securely log in.';
    } else if (purpose === 'coach_application') {
      actionTitle = 'Coach Application Verification';
      actionDescription = 'Thank you for applying to be a verified coach on CoachConnect. Use this code to confirm your email.';
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CoachConnect Verification Code</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      color: #1e293b;
    }
    .email-container {
      max-width: 560px;
      margin: 36px auto;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    }
    .header-banner {
      background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
      padding: 32px 32px 28px;
      text-align: center;
      color: #ffffff;
    }
    .brand-logo {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.5px;
      margin-bottom: 6px;
    }
    .brand-tagline {
      font-size: 13px;
      opacity: 0.9;
      font-weight: 500;
    }
    .content-body {
      padding: 36px 32px 28px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 12px;
    }
    .description {
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin-bottom: 28px;
    }
    .otp-wrapper {
      text-align: center;
      margin: 28px 0;
      padding: 24px 20px;
      background: #fef2f2;
      border-radius: 16px;
      border: 1px dashed #f87171;
    }
    .otp-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 800;
      color: #dc2626;
      margin-bottom: 10px;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 900;
      letter-spacing: 8px;
      color: #b91c1c;
      display: inline-block;
      padding: 4px 8px;
    }
    .validity-notice {
      font-size: 12px;
      color: #64748b;
      margin-top: 10px;
    }
    .security-note {
      padding: 16px;
      background: #f8fafc;
      border-radius: 12px;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
      margin-top: 24px;
      border: 1px solid #edf2f7;
    }
    .footer {
      background: #f1f5f9;
      padding: 20px 32px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header-banner">
      <div class="brand-logo">COACHCONNECT</div>
      <div class="brand-tagline">Verified Top 1% Professional Mentors & Coaches</div>
    </div>
    
    <div class="content-body">
      <div class="greeting">${greeting}</div>
      <div class="description">
        <strong>${actionTitle}:</strong> ${actionDescription}
      </div>

      <div class="otp-wrapper">
        <div class="otp-label">Your 6-Digit One-Time Password</div>
        <div class="otp-code">${otpCode}</div>
        <div class="validity-notice">⏳ Code expires in <strong>10 minutes</strong>. Do not share it with anyone.</div>
      </div>

      <div class="security-note">
        <strong>Security Tip:</strong> CoachConnect staff will never ask for your verification code or password over email or phone. If you did not initiate this request, you can safely ignore this email.
      </div>
    </div>

    <div class="footer">
      © ${new Date().getFullYear()} CoachConnect Inc. All rights reserved.<br>
      Sent with Google Workspace SMTP from ${SMTP_USER}
    </div>
  </div>
</body>
</html>
    `;

    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to: toEmail,
      subject: `[${otpCode}] Your CoachConnect Verification Code`,
      text: `${greeting}\n\nYour CoachConnect verification code is: ${otpCode}\n\nThis code is valid for 10 minutes.\nIf you did not request this code, please ignore this email.`,
      html: htmlContent,
    });

    console.log(`[SMTP] Verification email sent to ${toEmail}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[SMTP] Failed to send OTP email:', error);
    return { success: false, error: error.message || 'Failed to dispatch email' };
  }
}

module.exports = {
  transporter,
  verifySmtp,
  sendOtpEmail
};

