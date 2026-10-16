import '../lib/load-env.js';

process.env.BREVO_SENDER_NAME = 'David — Boxing Center';

const subject = 'Stage vacances octobre — Les Vacances des Boxeurs (adhérents)';

const html = `
<div style="font-family:Georgia,serif;font-size:16px;line-height:1.55;color:#1a1a1a;max-width:36rem">
<p>Bonjour,</p>
<p>Je me permets de vous écrire car votre enfant est inscrit chez Boxing Center et nous organisons, pendant les vacances de la Toussaint, une semaine de stage spécialement dédiée à nos jeunes boxeurs.</p>
<p>Du lundi 26 au samedi 31 octobre, nous proposons <strong>Les Vacances des Boxeurs</strong>, un stage ouvert aux filles et garçons de <strong>8 à 16 ans</strong>, quel que soit leur niveau.</p>
<p>Au programme : boxe technique, préparation physique, assauts adaptés et encadrés, défis collectifs, découverte du haut niveau, bowling et interclub pour terminer la semaine.</p>
<p>L'idée est simple : permettre aux enfants de progresser en boxe, prendre confiance, se dépasser et surtout passer une belle semaine ensemble, avec un encadrement sérieux assuré par nos coachs et des boxeurs professionnels du club.</p>
<p>Deux stages sont organisés, au <strong>Boxing Center Minimes</strong> et au <strong>Boxing Center Portet-sur-Garonne</strong>.</p>
<p>Nous avons souhaité proposer un tarif particulièrement accessible à nos adhérents :</p>
<p><strong>80 € la semaine complète</strong> pour les enfants inscrits chez Boxing Center, au lieu de 140 € pour les non-adhérents.</p>
<p>Les places sont limitées dans chaque salle afin de préserver la qualité de l'encadrement. Je vous conseille donc de réserver assez rapidement si votre enfant souhaite participer.</p>
<p>Pour découvrir le programme et inscrire votre enfant, tout se passe ici :<br>
<a href="https://stage.boxingcenter.fr/">https://stage.boxingcenter.fr/</a></p>
<p>J'espère que nous aurons le plaisir de retrouver votre enfant pendant cette semaine de stage !</p>
<p>Pour toute question sur le programme ou l'organisation, vous pouvez simplement répondre à ce mail.</p>
<p>À bientôt,<br><br>
<strong>David</strong><br>
Boxing Center<br>
<a href="mailto:boxingcenter31@gmail.com">boxingcenter31@gmail.com</a></p>
</div>`;

const recipients = ['boxingcenter31@gmail.com', 'boxingcentertls@gmail.com'];

const { sendMail } = await import('../lib/mail.js');

for (const to of recipients) {
  const r = await sendMail({ to, subject, html });
  console.log(to, JSON.stringify(r));
}
