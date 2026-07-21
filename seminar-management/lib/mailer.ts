import nodemailer from "nodemailer";

// SMTP transport — Mailhog in dev (no auth, no TLS), swappable to any real
// SMTP host via env. Singleton on globalThis so hot reload doesn't leak
// connection pools (same pattern as lib/prisma).
const globalForMailer = globalThis as unknown as {
  mailer?: nodemailer.Transporter;
};

export function getMailer(): nodemailer.Transporter {
  if (!globalForMailer.mailer) {
    globalForMailer.mailer = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "localhost",
      port: Number(process.env.SMTP_PORT || 1025),
      secure: false,
      // Mailhog needs no auth; a production host would add auth: {...} here.
    });
  }
  return globalForMailer.mailer;
}

export const EMAIL_FROM =
  process.env.EMAIL_FROM || "Seminar Management <noreply@seminar.local>";
