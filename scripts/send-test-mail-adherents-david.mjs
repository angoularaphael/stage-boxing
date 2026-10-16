import '../lib/load-env.js';

process.env.BREVO_SENDER_NAME = 'David de Boxing Center';
delete process.env.RESEND_API_KEY;

const { adherentsMailPayload } = await import('../lib/mail-adherents-stage.js');
const { sendMailBrevo } = await import('../lib/mail.js');

const recipients = ['boxingcenter31@gmail.com', 'boxingcentertls@gmail.com'];

for (const to of recipients) {
  const mail = adherentsMailPayload();
  const r = await sendMailBrevo({ to, subject: mail.subject, ...mail });
  console.log(to, JSON.stringify(r));
}
