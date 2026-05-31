import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "../observability";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

interface EmailProvider {
  send(payload: EmailPayload): Promise<void>;
}

class ConsoleProvider implements EmailProvider {
  async send(payload: EmailPayload): Promise<void> {
    logger.info(
      { to: payload.to, subject: payload.subject },
      `[ConsoleEmail] ${payload.subject} -> ${payload.to}`,
    );
  }
}

class NodemailerProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor() {
    this.from = env.EMAIL_FROM;
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER || undefined,
        pass: env.SMTP_PASS || undefined,
      },
    });
  }

  async send(payload: EmailPayload): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
  }
}

function createProvider(): EmailProvider {
  switch (env.EMAIL_PROVIDER) {
    case "nodemailer":
      return new NodemailerProvider();
    case "console":
      return new ConsoleProvider();
    default:
      return new NodemailerProvider();
  }
}

const provider = createProvider();

const TEMPLATES = {
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
} as const;

export const sendEmail = async (to: string, link: string, type: keyof typeof TEMPLATES = "password-reset") => {
  if (env.NODE_ENV === "test") return;

  const template = TEMPLATES[type];
  await provider.send({ to, subject: template.subject, html: template.html(link) });
};

export const sendVerificationEmail = async (to: string, otp: string) => {
  if (env.NODE_ENV === "test") return;

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
      <p style="color: #999; font-size: 13px;">This code expires in 24 hours.</p>
      <p style="color: #999; font-size: 12px; margin-top: 24px;">
        If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
  `;

  await provider.send({ to, subject: "Verify your email address", html });
};

export const sendPasswordResetEmail = async (to: string, token: string) => {
  const link = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
  return sendEmail(to, link, "password-reset");
};
