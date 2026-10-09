import test from 'node:test';
import assert from 'node:assert/strict';
import { priceGuestCents, priceMemberCents, resolveAmountCents } from '../lib/config.js';

test('tarifs par defaut 140 / 80', () => {
  assert.equal(priceGuestCents(), 14000);
  assert.equal(priceMemberCents(), 8000);
  assert.equal(resolveAmountCents(false), 14000);
  assert.equal(resolveAmountCents(true), 8000);
});
