import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutReserveMs, countsTowardStock } from '../lib/orders.js';

test('paid / form_pending / complete comptent pour le stock', () => {
  assert.equal(countsTowardStock({ status: 'paid' }), true);
  assert.equal(countsTowardStock({ status: 'form_pending' }), true);
  assert.equal(countsTowardStock({ status: 'complete' }), true);
  assert.equal(countsTowardStock({ status: 'draft' }), false);
});

test('checkout recent reserve une place', () => {
  const now = Date.now();
  const order = {
    status: 'checkout',
    created_at: new Date(now - 60_000).toISOString(),
    updated_at: new Date(now - 60_000).toISOString(),
  };
  assert.equal(countsTowardStock(order, now), true);
});

test('checkout expire ne reserve plus', () => {
  const now = Date.now();
  const old = now - checkoutReserveMs() - 5_000;
  const order = {
    status: 'checkout',
    created_at: new Date(old).toISOString(),
    updated_at: new Date(old).toISOString(),
  };
  assert.equal(countsTowardStock(order, now), false);
});
