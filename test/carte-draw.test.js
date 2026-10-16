import assert from 'node:assert/strict';
import { test } from 'node:test';
import { portraitPourCarte } from '../lib/carte-draw.js';
import { buildCartePng, cardDataFromOrder } from '../lib/carte-mail.js';

test('portraitPourCarte : selfie oui, scan Pass Sport non', () => {
  assert.equal(portraitPourCarte(800, 1000), true);
  assert.equal(portraitPourCarte(595, 842), false);
});

test('carte PNG serveur : meme pipeline que le canvas navigateur', async () => {
  const order = {
    id: 'stg_test12345678',
    club: 'minimes',
    child: {
      first_name: 'Thomas',
      last_name: 'Demo',
      age: 9,
      level: 'Debutant',
      practice_years: '2',
    },
  };
  const png = await buildCartePng(order);
  assert.ok(png.content?.length > 5000);
  assert.match(png.filename, /\.png$/);
  assert.ok(png.html.includes('data:image/png;base64,'));
  const data = cardDataFromOrder(order);
  assert.equal(data.nom, 'Demo');
});
