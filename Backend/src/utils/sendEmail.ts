import nodemailer from "nodemailer";

export const sendEmail = async (to: string, link: string) => {
  const emailUser = process.env.EMAIL_USER || process.env.SENDER_EMAIL;
  const emailPass = process.env.EMAIL_PASS || process.env.SENDER_PASSWORD;

  if (!emailUser || !emailPass) {
    throw new Error("Email credentials are not configured");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });

  await transporter.sendMail({
    from: `"Auth App" <${emailUser}>`,
    to,
    subject: "Reset Password",
    html: `
      <h3>Password Reset</h3>
      <p>Click below:</p>
      <a href="${link}">${link}</a>
    `,
  });
};