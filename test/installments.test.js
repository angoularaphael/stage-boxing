import assert from 'node:assert/strict';
import { test } from 'node:test';
import { installmentScheduleHtml, paypal4xScheduleHtml, scalapayScheduleHtml } from '../lib/installments.js';

test('echeances PayPal 4x : quatre lignes de montant', () => {
  const html = paypal4xScheduleHtml(80);
  assert.match(html, /4×/);
  assert.match(html, /20,00 €/);
  assert.match(html, /échéance/);
});

test('echeances Scalapay : 3x et 4x', () => {
  const html = scalapayScheduleHtml(80);
  assert.match(html, /3×/);
  assert.match(html, /4×/);
  assert.match(html, /1,5/);
});

test('installmentScheduleHtml : vide pour CB comptant', () => {
  assert.equal(installmentScheduleHtml('payplug_card', 80), '');
});
