import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCartePng, buildCarteSvg, cardDataFromOrder } from '../lib/carte-mail.js';
import { buildStageInvoicePdf } from '../lib/invoice-pdf.js';
import { buildStageAgendaIcs } from '../lib/agenda-ics.js';
import { isAmountEligibleForScalapay, SCALAPAY_MIN_CENTS, SCALAPAY_MAX_CENTS } from '../lib/payplug.js';

function sampleOrder(club = 'minimes') {
  return {
    id: 'stg_abcd1234efgh',
    club,
    club_label: club === 'portet' ? 'Boxing Center Portet' : 'Boxing Center Minimes',
    is_member: club === 'minimes',
    amount_cents: club === 'minimes' ? 8000 : 14000,
    access_token: 'tok-test',
    parent: {
      first_name: 'Parent',
      last_name: 'Demo',
      email: 'parent@example.com',
      phone: '0611223344',
    },
    child: {
      first_name: 'Leo',
      last_name: 'Demo',
      age: 10,
      level: 'Debutant',
      practice_years: '1',
      birthdate: '2016-05-01',
    },
    payment: {
      status: 'paid',
      method: 'payplug_card',
      paid_at: '2026-10-12T12:00:00.000Z',
      payplug_id: 'pay_test',
    },
  };
}

test('carte mail : HTML + SVG personnalises par salle', () => {
  for (const club of ['portet', 'minimes']) {
    const order = sampleOrder(club);
    const data = cardDataFromOrder(order);
    assert.equal(data.prenom, 'Leo');
    assert.equal(data.serie, 'EFGH');
    assert.ok(data.club.coachs.length >= 3);
    const carte = buildCarteSvg(order);
    assert.match(carte.filename, /\.svg$/);
    assert.ok(carte.html.includes('Leo'));
    assert.ok(carte.content.toString('utf8').includes('VALIDEE'));
    assert.ok(carte.content.toString('utf8').includes(data.club.court.toUpperCase()));
  }
});

test('carte mail : PNG pour Brevo (pas de SVG en piece jointe)', async () => {
  const png = await buildCartePng(sampleOrder('minimes'));
  assert.ok(png?.content?.length > 500);
  assert.match(png.filename, /\.png$/);
  assert.equal(png.content[0], 0x89);
  assert.equal(png.content[1], 0x50);
});

test('facture : emetteur BOXPLUS selon la salle + infos stage', () => {
  const portet = buildStageInvoicePdf(sampleOrder('portet'));
  const minimes = buildStageInvoicePdf(sampleOrder('minimes'));
  assert.ok(portet && minimes);
  assert.match(portet.content.toString('latin1'), /Noble Art Portesien|NOBLE ART PORTESIEN/);
  assert.match(minimes.content.toString('latin1'), /SAS BOXING CENTER|Boxing Center/);
  assert.match(portet.content.toString('latin1'), /Vacances des Boxeurs/);
  assert.match(portet.content.toString('latin1'), /12 seances|6 jours/);
  assert.match(minimes.content.toString('latin1'), /12 seances|6 jours/);
});

test('agenda ics : 12 evenements', () => {
  const ics = buildStageAgendaIcs(sampleOrder('minimes'));
  assert.equal((ics.text.match(/BEGIN:VEVENT/g) || []).length, 12);
  assert.ok(ics.text.includes('BEGIN:VCALENDAR'));
});

test('Scalapay : 80 EUR et 140 EUR sont dans les bornes', () => {
  assert.equal(SCALAPAY_MIN_CENTS, 500);
  assert.equal(SCALAPAY_MAX_CENTS, 200000);
  assert.equal(isAmountEligibleForScalapay(8000), true);
  assert.equal(isAmountEligibleForScalapay(14000), true);
});
