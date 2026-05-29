import { Resend } from "resend";
import { env } from "../config/env";

const resend = new Resend(env.RESEND_API_KEY);
const resendFrom = env.RESEND_FROM;

type EmailType = "verification" | "password-reset";

const templates: Record<EmailType, { subject: string; html: (link: string) => string }> = {
  "verification": {
    subject: "Verify your email address",
    html: (link: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a2e;">Verify your email</h2>
        <p style="color: #555; line-height: 1.6;">
          Thanks for signing up! Click the button below to verify your email address.
        </p>
        <a href="${link}" style="display: inline-block; padding: 12px 24px; background: #1a1a2e; color: #fff; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Verify Email
        </a>
        <p style="color: #999; font-size: 13px;">
          Or copy this link: <a href="${link}" style="color: #666;">${link}</a>
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
    `,
  },
  "password-reset": {
    subject: "Reset your password",
    html: (link: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a2e;">Reset your password</h2>
        <p style="color: #555; line-height: 1.6;">
          Click the button below to reset your password. This link expires in 1 hour.
        </p>
        <a href="${link}" style="display: inline-block; padding: 12px 24px; background: #1a1a2e; color: #fff; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #999; font-size: 13px;">
          Or copy this link: <a href="${link}" style="color: #666;">${link}</a>
        </p>
      </div>
    `,
  },
};

export const sendEmail = async (to: string, link: string, type: EmailType = "password-reset") => {
  const template = templates[type];
  const { error } = await resend.emails.send({
    from: resendFrom,
    to,
    subject: template.subject,
    html: template.html(link),
  });

  if (error) {
    throw new Error(error.message || "Failed to send email with Resend");
  }
};

export const sendVerificationEmail = async (to: string, token: string) => {
  const link = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;
  return sendEmail(to, link, "verification");
};

export const sendPasswordResetEmail = async (to: string, token: string) => {
  const link = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
  return sendEmail(to, link, "password-reset");
};
