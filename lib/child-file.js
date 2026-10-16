/** Fiche enfant obligatoire avant documents / statut « complete ». */

export function childFileMissing(child) {
  if (!child || typeof child !== 'object') return 'fiche enfant';
  const t = (v) => String(v || '').trim();
  if (!t(child.first_name)) return 'prénom';
  if (!t(child.last_name)) return 'nom';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t(child.birthdate))) return 'date de naissance';
  if (!t(child.weight)) return 'poids';
  if (!t(child.level)) return 'niveau';
  if (!t(child.practice_years)) return 'années de pratique';
  if (!t(child.emergency_name)) return 'contact urgence';
  if (!t(child.emergency_phone)) return 'téléphone urgence';
  if (!t(child.lunch_break)) return 'pause midi';
  return '';
}

export function isChildFileComplete(child) {
  return !childFileMissing(child);
}
