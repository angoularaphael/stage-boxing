/**
 * Facture PDF stage — mise en page boutique (pdf-layout + pdfkit).
 */
import PDFDocument from 'pdfkit';
import { STAGE } from './config.js';
import {
  clubForGym,
  clubEmitterRows,
  drawConditions,
  drawDetailTable,
  drawPageFooter,
  drawProHeader,
  drawSectionHeading,
  drawTwoParties,
  formatDateFr,
  formatEuros,
} from './pdf-layout.js';

function paymentLabel(order) {
  const method = order.payment?.method || '';
  const map = {
    paypal_once: 'PayPal (comptant)',
    paypal_4x: 'PayPal Pay Later (4x)',
    payplug_card: 'Carte bancaire (PayPlug)',
    cawl_card: 'Carte bancaire (CAWL)',
    scalapay: 'Carte bancaire en plusieurs fois (3x ou 4x)',
  };
  return map[method] || 'Carte bancaire';
}

function clubForStageOrder(order) {
  const gym = order?.club === 'portet' ? 'portet' : 'minimes';
  return clubForGym(gym);
}

function recipientRows(order) {
  const parentName = [order.parent?.first_name, order.parent?.last_name].filter(Boolean).join(' ') || 'Parent';
  const rows = [{ label: 'Nom', value: parentName }];
  if (order.parent?.email) rows.push({ label: 'Email', value: order.parent.email });
  if (order.parent?.phone) rows.push({ label: 'Téléphone', value: order.parent.phone });
  const childName = order.child
    ? [order.child.first_name, order.child.last_name].filter(Boolean).join(' ')
    : '';
  if (childName) rows.push({ label: 'Enfant inscrit', value: childName });
  if (order.child?.birthdate) rows.push({ label: 'Date de naissance', value: order.child.birthdate });
  return rows;
}

function renderStageInvoice(doc, order) {
  const club = clubForStageOrder(order);
  const shortId = String(order.id || '').replace(/^stg_/, '').slice(0, 12).toUpperCase();
  const invoiceNo = `FAC-STG-${shortId}`;
  const amount = Number(order.amount_cents || 0);
  const ht = Math.round(amount / 1.2);
  const tva = amount - ht;
  const clubLabel = order.club_label || club.brand || 'Boxing Center';
  const tarif = order.is_member ? 'Adhérent Boxing Center' : 'Non-adhérent';
  const payRef = order.payment?.payplug_id || order.payment?.payment_id || order.payment?.id || '';
  const childName = order.child
    ? [order.child.first_name, order.child.last_name].filter(Boolean).join(' ')
    : 'Enfant (fiche à compléter)';

  const descLines = [
    `Stage vacances enfants — ${STAGE.name}`,
    `${STAGE.dates_label} · ${STAGE.days} jours — ${STAGE.days * STAGE.sessions_per_day} séances`,
    `Salle : ${clubLabel}`,
    `Participant : ${childName}`,
    `Tarif : ${tarif}`,
  ].join('\n');

  drawProHeader(doc, {
    title: `Facture ${invoiceNo}`,
    date: order.payment?.paid_at || order.updated_at,
    ref: order.id,
    club,
  });

  drawTwoParties(doc, clubEmitterRows(club), recipientRows(order));

  drawSectionHeading(doc, 'Détail des prestations');

  drawDetailTable(doc, {
    columns: [
      { key: 'type', label: 'Type', width: 0.12 },
      { key: 'description', label: 'Description', width: 0.4 },
      { key: 'unit', label: 'PU HT', width: 0.16, align: 'right' },
      { key: 'qty', label: 'Qté', width: 0.08, align: 'center' },
      { key: 'vat', label: 'TVA', width: 0.08, align: 'center' },
      { key: 'total', label: 'Total HT', width: 0.16, align: 'right' },
    ],
    rows: [
      {
        type: 'Stage',
        description: descLines,
        unit: formatEuros(ht),
        qty: '1',
        vat: '20 %',
        total: formatEuros(ht),
        height: 72,
      },
    ],
    subtotalRows: [
      { label: 'Total HT', value: formatEuros(ht) },
      { label: 'TVA (20 %)', value: formatEuros(tva) },
    ],
    totalLabel: 'Total TTC',
    totalValue: formatEuros(amount),
  });

  const conditions = [
    { label: 'Conditions de règlement', value: 'À réception' },
    { label: 'Mode de règlement', value: paymentLabel(order) },
    { label: 'Statut', value: 'Acquitté' },
  ];
  if (payRef) conditions.push({ label: 'Réf. paiement', value: String(payRef) });

  drawConditions(doc, conditions);

  doc.moveDown(0.4);
  doc
    .fontSize(8)
    .fillColor('#6B7280')
    .font('Helvetica')
    .text(
      'Document comptable du club — distinct du reçu éventuel du prestataire de paiement. Conserver pour vos dossiers (remboursement, CE, Pass Sport, etc.).',
      { align: 'justify', lineGap: 2 }
    );

  drawPageFooter(doc, club);
}

/**
 * @returns {{ filename: string, content: Buffer, invoiceNo: string } | null}
 */
export function buildStageInvoicePdf(order) {
  if (!order || order.payment?.status !== 'paid') return null;

  const shortId = String(order.id || '').replace(/^stg_/, '').slice(0, 12).toUpperCase();
  const invoiceNo = `FAC-STG-${shortId}`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => {
      resolve({
        filename: `facture-${invoiceNo}.pdf`,
        content: Buffer.concat(chunks),
        invoiceNo,
      });
    });
    doc.on('error', reject);
    try {
      renderStageInvoice(doc, order);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
