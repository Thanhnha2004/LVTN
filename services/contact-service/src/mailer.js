const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

async function sendContactNotification({
  ownerEmail,
  ownerName,
  buyerName,
  propertyTitle,
  message,
}) {
  await transporter.sendMail({
    from: `"BDS Platform" <${process.env.MAIL_USER}>`,
    to: ownerEmail,
    subject: `[BDS Platform] Yêu cầu liên hệ mới — ${propertyTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0D9488;">Bạn có yêu cầu liên hệ mới</h2>
        <p>Xin chào <strong>${ownerName}</strong>,</p>
        <p>Khách hàng <strong>${buyerName}</strong> đang quan tâm đến tin đăng của bạn:</p>
        <div style="background: #F0FDFA; border-left: 4px solid #0D9488; padding: 12px 16px; margin: 16px 0;">
          <p style="margin: 0; font-weight: bold;">🏠 ${propertyTitle}</p>
        </div>
        <p><strong>Nội dung liên hệ:</strong></p>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px 16px; border-radius: 8px;">
          <p style="margin: 0;">${message}</p>
        </div>
        <p style="margin-top: 24px;">Vui lòng đăng nhập vào hệ thống để phản hồi khách hàng.</p>
        <p style="color: #64748B; font-size: 12px;">Email này được gửi tự động từ BDS Platform.</p>
      </div>
    `,
  });
}

module.exports = { sendContactNotification };
