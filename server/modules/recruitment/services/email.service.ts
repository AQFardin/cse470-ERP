// This is a placeholder email service. It logs what WOULD be sent instead of
// actually sending it — this lets you build and test the whole flow without
// needing real email credentials. When you're ready to send real emails,
// this is the only file you need to change (install `nodemailer`, configure
// it with real SMTP details, and replace the console.log calls below with
// actual transporter.sendMail() calls).

export async function sendConfirmationEmail(to: string, jobTitle: string, statusCheckUrl: string) {
  console.log(`
  ─── [EMAIL] Application Confirmation ───
  To: ${to}
  Subject: Your application for "${jobTitle}" was received

  Thanks for applying! We've received your application for the ${jobTitle} position.
  You can check your status anytime here: ${statusCheckUrl}
  ─────────────────────────────────────────
  `);
}

export async function sendStatusChangeEmail(
  to: string,
  jobTitle: string,
  newStatus: string,
  statusCheckUrl: string
) {
  console.log(`
  ─── [EMAIL] Status Update ───
  To: ${to}
  Subject: Update on your application for "${jobTitle}"

  Your application status has changed to: ${newStatus}
  Check full details here: ${statusCheckUrl}
  ──────────────────────────────
  `);
}
