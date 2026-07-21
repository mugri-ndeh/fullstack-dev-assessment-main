import { getMailer, EMAIL_FROM } from "../lib/mailer";

export interface AssignmentEmailCourse {
  name: string;
  date: string; // YYYY-MM-DD
  subjects: string[];
  location: string;
  participants: number;
  notes: string | null;
  price: number;
  trainerPrice: number;
}

export interface EmailResult {
  sent: boolean;
  to: string;
  error?: string;
}

// All interpolated values are HTML-escaped: course/trainer fields are user
// input and must not be able to inject markup into the email.
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const eur = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

function assignmentEmailHtml(
  trainerName: string,
  course: AssignmentEmailCourse
): string {
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 12px;color:#64748b;font-size:14px;white-space:nowrap;">${label}</td>
      <td style="padding:8px 12px;color:#0f172a;font-size:14px;font-weight:500;">${value}</td>
    </tr>`;

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:linear-gradient(90deg,#1e293b,#334155);padding:20px 28px;">
        <span style="color:#ffffff;font-size:18px;font-weight:bold;">Kodschul Management Hub</span>
      </div>
      <div style="padding:28px;">
        <h1 style="margin:0 0 8px;font-size:20px;color:#0f172a;">New course assignment</h1>
        <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">
          Hello ${esc(trainerName)},<br/>
          you have been assigned as the trainer for the following course.
        </p>
        <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;">
          ${row("Course", esc(course.name))}
          ${row("Date", esc(course.date))}
          ${row("Subjects", esc(course.subjects.join(", ")))}
          ${row("Location", esc(course.location))}
          ${row("Participants", String(course.participants))}
          ${row("Your fee", eur(course.trainerPrice))}
          ${row("Course price", eur(course.price))}
          ${course.notes ? row("Notes", esc(course.notes)) : ""}
        </table>
        <p style="margin:20px 0 0;color:#475569;font-size:14px;line-height:1.6;">
          Please confirm your availability with the course coordinator.<br/>
          If you cannot take this course, reply to this email as soon as possible.
        </p>
      </div>
      <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;">
        <span style="color:#94a3b8;font-size:12px;">
          This is an automated notification from the Seminar Management System.
        </span>
      </div>
    </div>
  </body>
</html>`;
}

function assignmentEmailText(
  trainerName: string,
  course: AssignmentEmailCourse
): string {
  return [
    `Hello ${trainerName},`,
    ``,
    `you have been assigned as the trainer for the following course:`,
    ``,
    `Course:       ${course.name}`,
    `Date:         ${course.date}`,
    `Subjects:     ${course.subjects.join(", ")}`,
    `Location:     ${course.location}`,
    `Participants: ${course.participants}`,
    `Your fee:     ${eur(course.trainerPrice)}`,
    `Course price: ${eur(course.price)}`,
    ...(course.notes ? [`Notes:        ${course.notes}`] : []),
    ``,
    `Please confirm your availability with the course coordinator.`,
  ].join("\n");
}

/**
 * Sends the assignment notification. NEVER throws: the assignment itself is
 * already committed by the time this runs, and a mail outage must not undo
 * it or crash the request. Failures are logged and reported to the caller
 * so the UI can inform the user.
 */
export async function sendTrainerAssignmentEmail(
  trainer: { name: string; email: string },
  course: AssignmentEmailCourse
): Promise<EmailResult> {
  try {
    await getMailer().sendMail({
      from: EMAIL_FROM,
      to: `"${trainer.name.replace(/"/g, "")}" <${trainer.email}>`,
      subject: `Course assignment: ${course.name} (${course.date})`,
      text: assignmentEmailText(trainer.name, course),
      html: assignmentEmailHtml(trainer.name, course),
    });
    return { sent: true, to: trainer.email };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[email] failed to send assignment notification to ${trainer.email}:`,
      message
    );
    return { sent: false, to: trainer.email, error: message };
  }
}
