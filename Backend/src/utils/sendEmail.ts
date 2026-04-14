import { Resend } from "resend";
import { env } from "../config/env";

const resend = new Resend(env.RESEND_API_KEY);
const resendFrom = env.RESEND_FROM;

export const sendEmail = async (to: string, link: string) => {
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