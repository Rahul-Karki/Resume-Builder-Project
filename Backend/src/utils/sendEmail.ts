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

class BrevoProvider implements EmailProvider {
  private readonly apiKey: string;
  private readonly from: string;
  private readonly ready: boolean;

  constructor() {
    this.apiKey = env.BREVO_API_KEY;
    this.from = env.BREVO_FROM || "noreply@yourdomain.com";
    this.ready = !!this.apiKey;
  }

  async send(payload: EmailPayload): Promise<void> {
    if (!this.ready) {
      logger.warn({ to: payload.to }, "BREVO_API_KEY not set — email skipped");
      return;
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": this.apiKey,
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: this.from },
        to: [{ email: payload.to }],
        subject: payload.subject,
        htmlContent: payload.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Brevo API error (${response.status}): ${body}`);
    }
  }
}

class ResendProvider implements EmailProvider {
  private readonly apiKey: string;
  private readonly from: string;
  private readonly ready: boolean;

  constructor() {
    this.apiKey = env.RESEND_API_KEY;
    this.from = env.RESEND_FROM || "onboarding@resend.dev";
    this.ready = !!this.apiKey;
  }

  async send(payload: EmailPayload): Promise<void> {
    if (!this.ready) {
      logger.warn({ to: payload.to }, "RESEND_API_KEY not set — email skipped");
      return;
    }

    const { Resend } = await import("resend");
    const client = new Resend(this.apiKey);

    const { error } = await client.emails.send({
      from: this.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });

    if (error) {
      throw new Error(error.message || "Resend email failed");
    }
  }
}

class ConsoleProvider implements EmailProvider {
  async send(payload: EmailPayload): Promise<void> {
    logger.info(
      { to: payload.to, subject: payload.subject },
      `[ConsoleEmail] ${payload.subject} -> ${payload.to}`,
    );
  }
}

function createProvider(): EmailProvider {
  switch (env.EMAIL_PROVIDER) {
    case "brevo":
      return new BrevoProvider();
    case "resend":
      return new ResendProvider();
    case "console":
      return new ConsoleProvider();
    default:
      return new ConsoleProvider();
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
