import nodemailer from "nodemailer";
import type { Locale } from "@svity/contracts";
import { themes } from "@svity/tokens";
import en from "@svity/i18n/messages/en.json" with { type: "json" };
import uk from "@svity/i18n/messages/uk.json" with { type: "json" };

export interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  send(email: Email): Promise<void>;
}

const escape = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

/** "Forgot password" e-mail in the account language. Text + simple HTML; no images, no tracking. */
/** One layout for every e-mail: title, text, a button, small print. Colours from the day theme. */
function layout(o: { locale: Locale; subject: string; title: string; body: string; button: string; link: string; notes: string[]; footer: string }, to: string): Email {
  const c = themes.day;
  const text = [o.title, "", o.body, o.link, "", ...o.notes, "", "—", o.footer].join("\n");
  const notes = o.notes.map((n) => `<p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:${c.textMuted}">${escape(n)}</p>`).join("\n");
  const html = `<!doctype html><html lang="${o.locale}"><body style="margin:0;padding:24px;background:${c.bg};font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:${c.text}">
<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px 28px">
<p style="margin:0 0 20px;font-family:Georgia,serif;letter-spacing:.2em;font-size:18px">SVITY</p>
<h1 style="margin:0 0 12px;font-family:Georgia,serif;font-weight:500;font-size:24px">${escape(o.title)}</h1>
<p style="margin:0 0 24px;line-height:1.5">${escape(o.body)}</p>
<p style="margin:0 0 24px"><a href="${escape(o.link)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:${c.accent};color:${c.accentText};text-decoration:none;font-weight:600">${escape(o.button)}</a></p>
${notes}
</div>
<p style="text-align:center;font-size:12px;color:${c.textMuted};margin:16px 0 0">${escape(o.footer)}</p>
</body></html>`;
  return { to, subject: o.subject, text, html };
}

export function passwordResetEmail(to: string, link: string, locale: Locale): Email {
  const m = (locale === "uk" ? uk : en).email.reset;
  return layout({ locale, subject: m.subject, title: m.title, body: m.body, button: m.button, link, notes: [m.expires, m.ignore], footer: m.footer }, to);
}

/** Prints e-mails to the API console. */
export const consoleMailer: Mailer = {
  async send(e) {
    console.log(`\n✉️  ${e.subject} → ${e.to}\n${e.text}\n`);
  },
};

/** Any SMTP server; locally Mailpit (inbox at http://localhost:8025). */
export function smtpMailer(url: string, from: string): Mailer {
  const transport = nodemailer.createTransport(url);
  return {
    async send(e) {
      await transport.sendMail({ from, ...e });
    },
  };
}

/** Mailgun HTTP API (production). EU region by default so data stays in the EU. */
export function mailgunMailer(opts: { apiKey: string; domain: string; from: string; apiBase?: string }): Mailer {
  const base = opts.apiBase ?? "https://api.eu.mailgun.net";
  const auth = `Basic ${Buffer.from(`api:${opts.apiKey}`).toString("base64")}`;
  return {
    async send(e) {
      const body = new URLSearchParams({ from: opts.from, to: e.to, subject: e.subject, text: e.text, html: e.html, "o:tracking": "no" });
      const res = await fetch(`${base}/v3/${opts.domain}/messages`, { method: "POST", headers: { authorization: auth }, body });
      if (!res.ok) throw new Error(`mailgun ${res.status}: ${(await res.text()).slice(0, 200)}`);
    },
  };
}

/** Picks the transport from the environment: MAIL_TRANSPORT = smtp | mailgun | console. */
export function mailerFromEnv(env: NodeJS.ProcessEnv): Mailer {
  const from = env.MAIL_FROM ?? "Svity <hello@svity.app>";
  switch (env.MAIL_TRANSPORT ?? "console") {
    case "smtp":
      return smtpMailer(env.SMTP_URL ?? "smtp://localhost:1025", from);
    case "mailgun":
      if (!env.MAILGUN_API_KEY || !env.MAILGUN_DOMAIN) throw new Error("MAILGUN_API_KEY and MAILGUN_DOMAIN are required");
      return mailgunMailer({ apiKey: env.MAILGUN_API_KEY, domain: env.MAILGUN_DOMAIN, from, apiBase: env.MAILGUN_API_BASE });
    case "console":
      return consoleMailer;
    default:
      throw new Error(`unknown MAIL_TRANSPORT: ${env.MAIL_TRANSPORT}`);
  }
}
