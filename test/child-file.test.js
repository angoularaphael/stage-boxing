import test from 'node:test';
import assert from 'node:assert/strict';
import { childFileMissing, isChildFileComplete } from '../lib/child-file.js';

test('photo seule ne suffit pas pour valider la fiche', () => {
  assert.equal(isChildFileComplete({ photo_url: 'https://x' }), false);
  assert.equal(childFileMissing({ photo_url: 'https://x' }), 'prénom');
});

test('fiche complete acceptee', () => {
  const child = {
    first_name: 'Leo',
    last_name: 'Martin',
    birthdate: '2014-03-14',
    weight: '38',
    level: 'Débutant',
    practice_years: 'Débutant',
    emergency_name: 'Maman',
    emergency_phone: '0612345678',
    lunch_break: 'reste à la salle sous surveillance',
  };
  assert.equal(childFileMissing(child), '');
  assert.equal(isChildFileComplete(child), true);
});
