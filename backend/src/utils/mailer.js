const nodemailer = require("nodemailer");

let transporter = null;

/**
 * EMAIL_MODE:
 *  - "smtp"        → send real emails
 *  - "console"     → print only
 *  - "both"        → print + send
 *  - "console,smtp"
 */
function parseModes() {
  const raw = (process.env.EMAIL_MODE || "smtp").toLowerCase().trim();

  if (raw === "both") return { console: true, smtp: true };

  const parts = raw.split(",").map(s => s.trim()).filter(Boolean);
  const modes = new Set(parts.length ? parts : ["smtp"]);

  return {
    console: modes.has("console"),
    smtp: modes.has("smtp"),
  };
}

function ensureTransporter() {
  if (transporter) return transporter;

  // Support legacy names without requiring env changes.
  const host = process.env.MAIL_HOST || process.env.SMTP_HOST;
  const port = Number(process.env.MAIL_PORT || process.env.SMTP_PORT || 587);
  const user = process.env.MAIL_USER || process.env.SMTP_USER;
  const pass = process.env.MAIL_PASS || process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "Mail config missing (MAIL_HOST/MAIL_USER/MAIL_PASS or SMTP_HOST/SMTP_USER/SMTP_PASS)"
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },

    // prevent hanging
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
  });

  return transporter;
}

function getFrom() {
  const email = process.env.MAIL_FROM || process.env.MAIL_USER || process.env.SMTP_USER;
  const name = process.env.MAIL_SENDER_NAME || "System";
  return `${name} <${email}>`;
}

/**
 * sendMail({ to, subject, html?, text? })
 */
async function sendMail({ to, subject, html, text }) {
  if (!to || !subject) {
    throw new Error("sendMail requires 'to' and 'subject'");
  }

  const modes = parseModes();

  // ---------- Console mode ----------
  if (modes.console) {
    console.log("\n=========== EMAIL (DEBUG) ===========");
    console.log("TO     :", to);
    console.log("SUBJECT:", subject);
    if (text) console.log("TEXT   :", text);
    if (html) console.log("HTML   :", html);
    console.log("====================================\n");
  }

  // ---------- SMTP mode ----------
  if (modes.smtp) {
    const t = ensureTransporter();

    await t.sendMail({
      from: getFrom(),
      to,
      subject,
      text,
      html,
    });
  }

  return { success: true };
}

module.exports = { sendMail };

// Backwards compatible export name (some controllers import sendEmail)
module.exports.sendEmail = sendMail;


