import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verifyOrderPayment } from '../lib/payment-verify.js';

const isPaidTrue = () => true;

function order(provider, providerId = 'pay_OWN') {
  return {
    id: 'stg_own',
    amount_cents: 8000,
    currency: 'EUR',
    club: 'minimes',
    payment: { provider, provider_id: providerId, status: 'pending' },
  };
}

function payplugStore(payments) {
  const calls = [];
  return {
    calls,
    deps: {
      payplug: {
        retrieve: async (id) => {
          calls.push(id);
          return payments[id] || null;
        },
        isPaid: (p) => p?.is_paid === true,
      },
    },
  };
}

const ownPayplug = {
  id: 'pay_OWN',
  is_paid: false,
  amount: 8000,
  currency: 'EUR',
  metadata: { order_id: 'stg_own' },
};
const foreignPayplug = {
  id: 'pay_FOREIGN',
  is_paid: true,
  amount: 8000,
  currency: 'EUR',
  metadata: { order_id: 'stg_other' },
};

test('confirm-payment ne lit jamais provider_id du navigateur', () => {
  const src = readFileSync(new URL('../api/confirm-payment.js', import.meta.url), 'utf8');
  assert.equal(/body\.provider_id/.test(src), false);
});

test('paiement etranger paye : la commande reste non payee', async () => {
  const { deps, calls } = payplugStore({ pay_OWN: ownPayplug, pay_FOREIGN: foreignPayplug });
  const res = await verifyOrderPayment(order('payplug', 'pay_OWN'), deps);
  assert.equal(res.paid, false);
  assert.deepEqual(calls, ['pay_OWN']);
});

test('id stocke pointant vers un paiement d une autre commande : refuse', async () => {
  const { deps } = payplugStore({ pay_FOREIGN: foreignPayplug });
  const res = await verifyOrderPayment(order('payplug', 'pay_FOREIGN'), deps);
  assert.equal(res.paid, false);
  assert.equal(res.reason, 'mismatch');
});

test('PayPlug montant ou devise faux : refuse', async () => {
  const bad = { ...ownPayplug, is_paid: true, amount: 100 };
  const { deps } = payplugStore({ pay_OWN: bad });
  assert.equal((await verifyOrderPayment(order('payplug'), deps)).paid, false);
  const usd = { ...ownPayplug, is_paid: true, currency: 'USD' };
  const s2 = payplugStore({ pay_OWN: usd });
  assert.equal((await verifyOrderPayment(order('payplug'), s2.deps)).paid, false);
});

test('PayPlug paiement propre et paye : accepte', async () => {
  const { deps } = payplugStore({ pay_OWN: { ...ownPayplug, is_paid: true } });
  assert.equal((await verifyOrderPayment(order('payplug'), deps)).paid, true);
});

function paypalDeps(ppOrder) {
  return { paypal: { capture: async () => ppOrder, isPaid: isPaidTrue } };
}

function pp({ id = 'PP_OWN', ref = 'stg_own', value = '80.00', cur = 'EUR' } = {}) {
  return {
    id,
    status: 'COMPLETED',
    purchase_units: [
      {
        reference_id: ref,
        payments: {
          captures: [{ status: 'COMPLETED', amount: { value, currency_code: cur } }],
        },
      },
    ],
  };
}

test('PayPal : propre accepte, etranger / montant faux refuses', async () => {
  const o = order('paypal', 'PP_OWN');
  assert.equal((await verifyOrderPayment(o, paypalDeps(pp()))).paid, true);
  assert.equal((await verifyOrderPayment(o, paypalDeps(pp({ id: 'PP_X' })))).paid, false);
  assert.equal((await verifyOrderPayment(o, paypalDeps(pp({ ref: 'stg_other' })))).paid, false);
  assert.equal((await verifyOrderPayment(o, paypalDeps(pp({ value: '1.00' })))).paid, false);
});

test('CAWL : montant faux ou reference etrangere refuses', async () => {
  const co = (ref, amount) => ({
    createdPaymentOutput: {
      payment: {
        status: 'CAPTURED',
        paymentOutput: {
          amountOfMoney: { amount, currencyCode: 'EUR' },
          references: { merchantReference: ref },
        },
      },
    },
  });
  const deps = (c) => ({ cawl: { get: async () => c, isPaid: isPaidTrue } });
  const o = order('cawl', 'hc_1');
  assert.equal((await verifyOrderPayment(o, deps(co('stg_own', 8000)))).paid, true);
  assert.equal((await verifyOrderPayment(o, deps(co('stg_other', 8000)))).paid, false);
  assert.equal((await verifyOrderPayment(o, deps(co('stg_own', 100)))).paid, false);
});

test('sans provider_id stocke : refuse', async () => {
  const res = await verifyOrderPayment(order('payplug', null), {});
  assert.equal(res.paid, false);
});
