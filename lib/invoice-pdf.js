/**
 * Facture PDF stage (sans dependance lourde) — emetteur Portet = Noble Art Portésien,
 * Minimes = SAS Boxing Center (meme logique que BOXPLUS).
 */
import { STAGE } from './config.js';

const EMITTERS = {
  portet: {
    name: 'NOBLE ART PORTESIEN',
    brand: 'Noble Art Portésien',
    legal: 'Association loi 1901',
    address: '61 route d\'Espagne',
    city: '31120 Portet-sur-Garonne',
    siret: '444 152 482 00022',
    tva: 'FR80444152482',
    email: 'nobleartportesien@gmail.com',
    phone: '06 87 90 02 16',
  },
  minimes: {
    name: 'SAS BOXING CENTER',
    brand: 'Boxing Center',
    legal: 'SAS',
    address: '12 rue de Fenouillet',
    city: '31200 Toulouse',
    siret: '821 817 889 00016',
    tva: 'FR 82 821 817 889',
    email: 'boxingcenter31@gmail.com',
    phone: '09 54 14 74 72',
  },
};

function emitterFor(club) {
  return EMITTERS[String(club || '').toLowerCase()] || EMITTERS.minimes;
}

function euros(cents) {
  return `${(Number(cents || 0) / 100).toFixed(2).replace('.', ',')} EUR`;
}

function dateFr(iso) {
  if (!iso) {
    return new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function paymentLabel(order) {
  const method = order.payment?.method || '';
  const map = {
    paypal_once: 'PayPal (comptant)',
    paypal_4x: 'PayPal Pay Later (4x)',
    payplug_card: 'Carte bancaire (PayPlug)',
    cawl_card: 'Carte bancaire (CAWL)',
    scalapay: 'Scalapay',
  };
  return map[method] || method || 'Paiement en ligne';
}

function asciiFr(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[œŒ]/g, (c) => (c === 'œ' ? 'oe' : 'OE'))
    .replace(/[æÆ]/g, (c) => (c === 'æ' ? 'ae' : 'AE'))
    .replace(/€/g, 'EUR')
    .replace(/[^\x20-\x7E\n]/g, '?');
}

function pdfEscape(text) {
  return asciiFr(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildPdf(lines) {
  const contentLines = ['BT', '/F1 11 Tf', '14 TL', '50 780 Td'];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line === '') {
      contentLines.push('0 -18 Td');
      continue;
    }
    if (line.startsWith('## ')) {
      contentLines.push('/F1 16 Tf', `(${pdfEscape(line.slice(3))}) Tj`, '0 -22 Td', '/F1 11 Tf');
      continue;
    }
    if (line.startsWith('# ')) {
      contentLines.push('/F1 14 Tf', `(${pdfEscape(line.slice(2))}) Tj`, '0 -20 Td', '/F1 11 Tf');
      continue;
    }
    contentLines.push(`(${pdfEscape(line)}) Tj`, '0 -16 Td');
  }
  contentLines.push('ET');
  const stream = contentLines.join('\n');
  const objects = [];
  objects.push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n');
  objects.push('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n');
  objects.push(
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n'
  );
  objects.push(
    `4 0 obj<< /Length ${Buffer.byteLength(stream, 'utf8')} >>stream\n${stream}\nendstream\nendobj\n`
  );
  objects.push('5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n');

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }
  const xref = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

/**
 * @returns {{ filename: string, content: Buffer, invoiceNo: string } | null}
 */
export function buildStageInvoicePdf(order) {
  if (!order) return null;
  const paid = order.payment?.status === 'paid';
  if (!paid) return null;

  const emitter = emitterFor(order.club);
  const invoiceNo = `FAC-STG-${String(order.id || '').replace(/^stg_/, '').slice(0, 12).toUpperCase()}`;
  const parentName = [order.parent?.first_name, order.parent?.last_name].filter(Boolean).join(' ') || 'Parent';
  const childName = order.child
    ? [order.child.first_name, order.child.last_name].filter(Boolean).join(' ')
    : 'Enfant (fiche a completer)';
  const amount = Number(order.amount_cents || 0);
  const ht = Math.round(amount / 1.2);
  const tva = amount - ht;

  const lines = [
    `## Facture ${invoiceNo}`,
    `# ${emitter.brand}`,
    emitter.name,
    emitter.legal || '',
    emitter.address,
    emitter.city,
    `SIRET ${emitter.siret}`,
    `TVA ${emitter.tva}`,
    `${emitter.email} — ${emitter.phone}`,
    '',
    `Date : ${dateFr(order.payment?.paid_at || order.updated_at)}`,
    `Reference commande : ${order.id}`,
    '',
    '# Client',
    parentName,
    order.parent?.email || '',
    order.parent?.phone || '',
    '',
    '# Detail',
    `Stage : ${STAGE.name}`,
    `Dates : ${STAGE.dates_label}`,
    `Club : ${order.club_label || order.club}`,
    `Enfant : ${childName}`,
    `Tarif : ${order.is_member ? 'Adherent' : 'Non-adherent'}`,
    `Paiement : ${paymentLabel(order)}`,
    '',
    `Montant HT : ${euros(ht)}`,
    `TVA (20 %) : ${euros(tva)}`,
    `Total TTC acquitte : ${euros(amount)}`,
    '',
    'Document generique — conserver pour vos dossiers.',
    'Boxing Center / Noble Art Portesien',
  ].filter((l) => l !== undefined);

  const content = buildPdf(lines);
  return {
    filename: `facture-${invoiceNo}.pdf`,
    content,
    invoiceNo,
  };
}
