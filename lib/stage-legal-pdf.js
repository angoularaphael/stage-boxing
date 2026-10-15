/**
 * PDF des documents du stage signés par le parent (comme la boutique BOXPLUS).
 */
import PDFDocument from 'pdfkit';
import { DOCUMENTS, DROIT_IMAGE, VERSION_DOCUMENTS } from '../src/data/documents.js';
import { STAGE } from './config.js';
import {
  NAVY,
  MUTED,
  drawPageFooter,
  drawSectionHeading,
  clubForGym,
  formatDateFr,
} from './pdf-layout.js';

function parseSignature(raw) {
  if (!raw) return null;
  try {
    const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!o || typeof o !== 'object') return null;
    return o;
  } catch {
    return null;
  }
}

function slugFilename(title) {
  return (
    String(title || 'document')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) + '.pdf'
  );
}

function pdfBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

function drawParagraphs(doc, paragraphs) {
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  for (const p of paragraphs || []) {
    if (!p) continue;
    if (doc.y > doc.page.height - 80) doc.addPage();
    doc.fontSize(9).fillColor('#374151').font('Helvetica').text(p, {
      width,
      align: 'justify',
      lineGap: 3,
    });
    doc.moveDown(0.35);
  }
}

function drawSignature(doc, sig, order) {
  const left = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  if (doc.y > doc.page.height - 160) doc.addPage();
  drawSectionHeading(doc, 'Signature du responsable légal');
  const parentName = sig?.nom || [order.parent?.first_name, order.parent?.last_name].filter(Boolean).join(' ');
  const lieu = sig?.lieu || '—';
  const dateIso = sig?.date || order.documents?.accepted_at;
  const dateTxt = dateIso ? formatDateFr(dateIso) : formatDateFr(new Date().toISOString());
  doc.fontSize(9).fillColor('#374151').font('Helvetica');
  doc.text(`Nom : ${parentName}`, { width });
  doc.text(`Fait à ${lieu}, le ${dateTxt}`, { width });
  doc.moveDown(0.3);
  const b64 = sig?.image ? String(sig.image).split(',').pop() : '';
  if (b64 && b64.length > 40) {
    try {
      const buf = Buffer.from(b64, 'base64');
      doc.image(buf, left, doc.y, { fit: [width, 90], align: 'left' });
      doc.y += 96;
    } catch {
      doc.fontSize(8).fillColor(MUTED).text('(Tracé de signature non lisible)', { width });
    }
  }
  doc.moveDown(0.4);
}

function renderDocumentPdf(order, docDef, sig) {
  const club = clubForGym(order.club === 'portet' ? 'portet' : 'minimes');
  const childName = order.child
    ? [order.child.first_name, order.child.last_name].filter(Boolean).join(' ')
    : '—';

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const done = pdfBuffer(doc);

  doc.fontSize(16).fillColor(NAVY).font('Helvetica-Bold').text(docDef.titre, { lineGap: 2 });
  doc.moveDown(0.3);
  doc.fontSize(8).fillColor(MUTED).font('Helvetica').text(`Stage ${STAGE.name} — ${STAGE.dates_label}`);
  doc.text(`Enfant : ${childName} · Club : ${order.club_label || club.brand}`);
  doc.text(`Version des documents : ${VERSION_DOCUMENTS}`);
  doc.moveDown(0.8);

  doc.fontSize(9).fillColor(NAVY).font('Helvetica-Bold').text(docDef.accord || '', { lineGap: 2 });
  doc.moveDown(0.6);

  for (const section of docDef.sections || []) {
    if (section.h) {
      drawSectionHeading(doc, section.h);
    }
    drawParagraphs(doc, section.p);
  }

  drawSignature(doc, sig, order);
  drawPageFooter(doc, club);
  doc.end();
  return done;
}

/**
 * @returns {Promise<Array<{ filename: string, content: Buffer }>>}
 */
export async function buildStageSignedDocumentPdfs(order) {
  if (!order?.documents) return [];
  const sig = parseSignature(order.documents.signature);
  const out = [];

  for (const docDef of DOCUMENTS) {
    const key = docDef.cle;
    if (!order.documents[key]) continue;
    const content = await renderDocumentPdf(order, docDef, sig);
    if (content?.length > 500) {
      out.push({ filename: slugFilename(docDef.titre), content });
    }
  }

  if (order.documents.image_rights === true || order.documents.image_rights === 'yes') {
    const pseudo = {
      titre: DROIT_IMAGE.titre,
      accord: DROIT_IMAGE.oui,
      sections: [{ p: [DROIT_IMAGE.oui] }],
    };
    const content = await renderDocumentPdf(order, pseudo, sig);
    if (content?.length > 500) out.push({ filename: 'Droit-a-l-image-autorise.pdf', content });
  } else if (order.documents.image_rights === false || order.documents.image_rights === 'no') {
    const pseudo = {
      titre: DROIT_IMAGE.titre,
      accord: DROIT_IMAGE.non,
      sections: [{ p: [DROIT_IMAGE.non] }],
    };
    const content = await renderDocumentPdf(order, pseudo, sig);
    if (content?.length > 500) out.push({ filename: 'Droit-a-l-image-refuse.pdf', content });
  }

  return out;
}
