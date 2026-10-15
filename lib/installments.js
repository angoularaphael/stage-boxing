/** Echéances indicatives avant redirection PayPal 4x ou CB fractionné (aligné boutique). */

function formatFrDate(d) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function datesEvery30Days(count) {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i * 30);
    return formatFrDate(d);
  });
}

function fmtEuro(amount) {
  return Number(amount).toFixed(2).replace('.', ',');
}

export function paypal4xScheduleHtml(totalEuro) {
  const quart = totalEuro / 4;
  const q = fmtEuro(quart);
  const dates = datesEvery30Days(4);
  return `
<div class="echeances__inner">
  <p class="echeances__title">PayPal 4× sans frais (si votre compte est éligible)</p>
  <p class="echeances__lead">Montant total ${fmtEuro(totalEuro)} €. PayPal affiche le total ; le 4× n’apparaît que si vous êtes éligible (Pay Later).</p>
  <ul class="echeances__liste">
    <li><strong>${dates[0]}</strong> — 1<sup>re</sup> échéance : ${q} €</li>
    <li><strong>${dates[1]}</strong> — 2<sup>e</sup> échéance : ${q} €</li>
    <li><strong>${dates[2]}</strong> — 3<sup>e</sup> échéance : ${q} €</li>
    <li><strong>${dates[3]}</strong> — 4<sup>e</sup> échéance : ${q} €</li>
  </ul>
  <p class="echeances__note">Dates indicatives à partir d’aujourd’hui, espacement d’environ 30 jours.</p>
</div>`;
}

export function scalapayScheduleHtml(totalEuro) {
  const t3 = totalEuro / 3;
  const total4 = totalEuro * 1.015;
  const t4 = total4 / 4;
  const d3 = datesEvery30Days(3);
  const d4 = datesEvery30Days(4);
  return `
<div class="echeances__inner">
  <p class="echeances__title">Carte bancaire en plusieurs fois — prochaines échéances (indicatif)</p>
  <p class="echeances__lead">Paiement par <strong>CB</strong> : vous choisissez <strong>3× sans frais</strong> ou <strong>4× avec 1,5&nbsp;% de frais</strong> (à votre charge).</p>
  <p class="echeances__sous">Option 3× sans frais — total ${fmtEuro(totalEuro)} €</p>
  <ul class="echeances__liste">
    <li><strong>${d3[0]}</strong> — ${fmtEuro(t3)} €</li>
    <li><strong>${d3[1]}</strong> — ${fmtEuro(t3)} €</li>
    <li><strong>${d3[2]}</strong> — ${fmtEuro(t3)} €</li>
  </ul>
  <p class="echeances__sous">Option 4× avec frais — total ${fmtEuro(total4)} €</p>
  <ul class="echeances__liste">
    <li><strong>${d4[0]}</strong> — ${fmtEuro(t4)} €</li>
    <li><strong>${d4[1]}</strong> — ${fmtEuro(t4)} €</li>
    <li><strong>${d4[2]}</strong> — ${fmtEuro(t4)} €</li>
    <li><strong>${d4[3]}</strong> — ${fmtEuro(t4)} €</li>
  </ul>
  <p class="echeances__note">Le détail exact s’affiche sur la page de paiement CB avant validation.</p>
</div>`;
}

export function installmentScheduleHtml(methodId, totalEuro) {
  if (methodId === 'paypal_4x') return paypal4xScheduleHtml(totalEuro);
  if (methodId === 'scalapay') return scalapayScheduleHtml(totalEuro);
  return '';
}
