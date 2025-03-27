import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export const sendVerificationCode = async (to: string, code: string) => {
  const mailOptions = {
    from: `"Entry-MVP 通知系統" <${process.env.GMAIL_USER}>`,
    to,
    subject: "【Entry-MVP】驗證碼通知",
    html: `<p>您好，您的驗證碼為：</p><h2>${code}</h2><p>10 分鐘內有效，請儘速處理</p>`,
  };

  await transporter.sendMail(mailOptions);
};
