import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM || process.env.EMAIL_FROM;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const sendEmail = async (to: string, link: string) => {
  if (!resend) {
    throw new Error("Resend API key is not configured");
  }

  if (!resendFrom) {
    throw new Error("Resend sender address is not configured");
  }

  const { error } = await resend.emails.send({
    from: resendFrom,
    to,
    subject: "Reset Password",
    html: `
      <h3>Password Reset</h3>
      <p>Click below:</p>
      <a href="${link}">${link}</a>
    `,
  });

  if (error) {
    throw new Error(error.message || "Failed to send email with Resend");
  }
};