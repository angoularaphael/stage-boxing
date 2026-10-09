import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedPaymentMethods, isMethodAllowed } from '../lib/clubs.js';

test('Portet: CB CAWL, PayPal 1x, PayPal 4x — pas Scalapay', () => {
  const methods = allowedPaymentMethods('portet');
  assert.deepEqual(methods, ['cawl_card', 'paypal_once', 'paypal_4x']);
  assert.equal(isMethodAllowed('portet', 'scalapay'), false);
});

test('Minimes: CB PayPlug, PayPal, PayPal 4x, Scalapay', () => {
  const methods = allowedPaymentMethods('minimes');
  assert.ok(methods.includes('payplug_card'));
  assert.ok(methods.includes('paypal_once'));
  assert.ok(methods.includes('paypal_4x'));
  assert.ok(methods.includes('scalapay'));
  assert.equal(isMethodAllowed('minimes', 'cawl_card'), false);
});
