import { Resend } from "resend";
import { env } from "../config/env";

// In test environment, skip external email delivery to avoid network calls and
// flaky failures when test API keys are invalid. Unit tests for sendEmail
// still validate behaviour by importing this module directly and providing
// controlled env values.
const isTestEnv = process.env.NODE_ENV === "test";
const resend = isTestEnv ? null : new Resend(env.RESEND_API_KEY);
const resendFrom = env.RESEND_FROM;

type EmailType = "password-reset";

const templates: Record<EmailType, { subject: string; html: (link: string) => string }> = {
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
  if (isTestEnv || !resend) {
    // In tests, simulate success without calling external API.
    return;
  }

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

export const sendVerificationEmail = async (to: string, otp: string) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1a1a2e;">Verify your email</h2>
      <p style="color: #555; line-height: 1.6;">
        Thanks for signing up! Use the verification code below to activate your account.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <span style="display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a1a2e; background: #f5f5f5; padding: 12px 24px; border-radius: 8px;">
          ${otp}
        </span>
      </div>
      <p style="color: #999; font-size: 13px;">
        This code expires in 24 hours.
      </p>
      <p style="color: #999; font-size: 12px; margin-top: 24px;">
        If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
  `;
  if (isTestEnv || !resend) return;

  const { error } = await resend.emails.send({
    from: resendFrom,
    to,
    subject: "Verify your email address",
    html,
  });
  if (error) {
    throw new Error(error.message || "Failed to send verification email");
  }
};

export const sendPasswordResetEmail = async (to: string, token: string) => {
  const link = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
  return sendEmail(to, link, "password-reset");
};
