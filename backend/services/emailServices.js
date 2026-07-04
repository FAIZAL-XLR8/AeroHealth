const nodemailer = require('nodemailer');
const validator = require('validator');
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
transporter.verify((error, success) => {
    if (error) {
    }
});
const sendOtpToEmail = async (email, otp) => {
     if (!validator.isEmail(email)) {
      return {
        success: false,
        error: 'Invalid email format. Please check and try again.'
      };
    }
      const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #06b6d4;"> AeroHealth Verification</h2>

      <p>Hi there,</p>

      <p>Your one-time password (OTP) to verify your AeroHealth account is:</p>

      <h1 style="background: #e0f7fa; color: #000; padding: 10px 20px; display: inline-block; border-radius: 5px; letter-spacing: 2px;">
        ${otp}
      </h1>

      <p><strong>This OTP is valid for the next 10 minutes.</strong> Please do not share this code with anyone.</p>

      <p>If you didn’t request this OTP, please ignore this email.</p>

      <p style="margin-top: 20px;">Thanks & Regards,<br/>AeroHealth Security Team</p>

      <hr style="margin: 30px 0;" />

      <small style="color: #777;">This is an automated message. Please do not reply.</small>
    </div>
  `;
  await transporter.sendMail({
        from: `"AeroHealth" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: " AeroHealth Verification OTP",
        html: html
    });
}

const sendApprovalEmail = async (email, name) => {
  if (!validator.isEmail(email)) return;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #10b981;"> AeroHealth Account Approved!</h2>
      <p>Dear Dr. ${name},</p>
      <p>Congratulations! Your onboarding application to join AeroHealth has been reviewed and approved by our medical validation team.</p>
      <p>You can now log in using your registered credentials to set up your clinic, manage slots, and consult with patients.</p>
      <p>Thanks & Regards,<br/>AeroHealth Admin Team</p>
      <hr style="margin: 30px 0;" />
      <small style="color: #777;">This is an automated message. Please do not reply.</small>
    </div>
  `;
  await transporter.sendMail({
    from: `"AeroHealth" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "AeroHealth Account Approved!",
    html: html
  });
};

const sendSuspensionEmail = async (email, name, reason) => {
  if (!validator.isEmail(email)) return;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #ef4444;">AeroHealth Account Suspended</h2>
      <p>Dear Dr. ${name},</p>
      <p>We regret to inform you that your doctor account on AeroHealth has been suspended by the administrator.</p>
      <p><strong>Reason for suspension:</strong></p>
      <blockquote style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0; border-radius: 4px; color: #7f1d1d; font-style: italic;">
        "${reason || 'No specific reason provided.'}"
      </blockquote>
      <p>If you believe this is a mistake or wish to appeal this decision, please contact our support team.</p>
      <p>Thanks & Regards,<br/>AeroHealth Admin Team</p>
      <hr style="margin: 30px 0;" />
      <small style="color: #777;">This is an automated message. Please do not reply.</small>
    </div>
  `;
  await transporter.sendMail({
    from: `"AeroHealth" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "AeroHealth Account Suspended",
    html: html
  });
};

const sendRejectionEmail = async (email, name, reason) => {
  if (!validator.isEmail(email)) return;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #ef4444;"> AeroHealth Doctor Application Status Update</h2>
      <p>Dear Dr. ${name},</p>
      <p>Thank you for your interest in joining AeroHealth. Your onboarding application has been reviewed by our medical validation panel.</p>
      <p>Unfortunately, your application was not approved for the following reason:</p>
      <blockquote style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0; border-radius: 4px; color: #7f1d1d; font-style: italic;">
        "${reason || 'No specific reasons provided.'}"
      </blockquote>
      <p>Please log in to your registration wizard, review your credentials, and re-upload a valid ID document matching the requirements (PDF, PNG, JPG).</p>
      <p>Thanks & Regards,<br/>AeroHealth Admin Team</p>
      <hr style="margin: 30px 0;" />
      <small style="color: #777;">This is an automated message. Please do not reply.</small>
    </div>
  `;
  await transporter.sendMail({
    from: `"AeroHealth" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: " AeroHealth Doctor Application Status Update",
    html: html
  });
};

module.exports = { sendOtpToEmail, sendApprovalEmail, sendSuspensionEmail, sendRejectionEmail };

