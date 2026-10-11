/** La liste du sac se souvient de ce qui est déjà prêt (dans ce navigateur seulement). */
import { stock } from './ui.js';

const CLE = 'vdb-sac';

export function kit() {
  const liste = document.querySelector('[data-kit]');
  if (!liste) return;
  const total = document.querySelector('[data-kit-total]');
  const cases = [...liste.querySelectorAll('input[type="checkbox"]')];
  const pris = new Set(stock.lire(CLE, []));
  cases.forEach((c) => {
    c.checked = pris.has(c.value);
  });
  const maj = () => {
    const n = cases.filter((c) => c.checked).length;
    if (total) total.textContent = n === cases.length ? 'Le sac est prêt.' : `${n} sur ${cases.length} dans le sac`;
  };
  liste.addEventListener('change', () => {
    stock.ecrire(CLE, cases.filter((c) => c.checked).map((c) => c.value));
    maj();
  });
  maj();
}
