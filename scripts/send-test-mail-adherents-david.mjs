import '../lib/load-env.js';

process.env.BREVO_SENDER_NAME = 'David — Boxing Center';

const { adherentsMailPayload } = await import('../lib/mail-adherents-stage.js');
const { sendMail } = await import('../lib/mail.js');

const recipients = ['boxingcenter31@gmail.com', 'boxingcentertls@gmail.com'];

for (const to of recipients) {
  const mail = adherentsMailPayload();
  const r = await sendMail({ to, subject: mail.subject, ...mail });
  console.log(to, JSON.stringify(r));
}
