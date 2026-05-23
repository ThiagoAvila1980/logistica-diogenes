import { Resend } from "resend";
import { eq, sql, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/db/schema";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendCuttingAlertEmail(input: {
  osNumber: string;
  clientName: string;
  senderName: string;
  message: string;
}): Promise<void> {
  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL;

  const subject = `⚠️ Problema no corte — OS ${input.osNumber}`;
  const html = `
    <p><strong>OS:</strong> ${input.osNumber} — ${input.clientName}</p>
    <p><strong>Relatado por:</strong> ${input.senderName}</p>
    <hr />
    <p>${input.message.replace(/\n/g, "<br>")}</p>
  `;

  if (!resend || !from) {
    console.info("[cutting-alert:mock]", subject, input.message);
    return;
  }

  const db = getDb();
  const recipients = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(
      and(
        sql`${users.roles} && ARRAY['admin','gerente']::user_roles[]`,
        eq(users.active, true),
      ),
    );

  await Promise.allSettled(
    recipients.map((r) =>
      resend.emails.send({ from, to: r.email, subject, html }),
    ),
  );
}
