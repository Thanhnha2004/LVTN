const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/**
 * Gửi email chứa mã OTP 6 số
 */
async function sendOtpEmail({ toEmail, toName, otp }) {
  await transporter.sendMail({
    from: `"BDS Platform" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: `[BDS Platform] Mã xác minh email của bạn: ${otp}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0D9488;">Xác minh địa chỉ email</h2>
        <p>Xin chào <strong>${toName}</strong>,</p>
        <p>Mã OTP xác minh tài khoản của bạn là:</p>
        <div style="
          font-size: 36px;
          font-weight: bold;
          letter-spacing: 12px;
          color: #0D9488;
          background: #F0FDFA;
          border: 2px solid #0D9488;
          border-radius: 8px;
          padding: 16px 24px;
          text-align: center;
          margin: 24px 0;
        ">${otp}</div>
        <p>Mã có hiệu lực trong <strong>10 phút</strong>.</p>
        <p>Nếu bạn không yêu cầu xác minh này, vui lòng bỏ qua email này.</p>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;"/>
        <p style="color: #64748B; font-size: 12px;">
          Email này được gửi tự động từ BDS Platform. Vui lòng không trả lời.
        </p>
      </div>
    `,
  });
}

module.exports = { sendOtpEmail };
