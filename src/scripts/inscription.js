/**
 * Le tunnel d'inscription. Il parle à l'API du stage sans la modifier :
 *   GET  /api/checkout?club=…          prix, moyens de paiement, places
 *   POST /api/checkout                 crée la commande, renvoie l'URL du prestataire
 *   POST /api/confirm-payment          au retour du prestataire
 *   GET  /api/order?id=…&token=…       reprise depuis l'e-mail
 *   POST /api/order {action:'child'}   fiche enfant
 *   POST /api/order {action:'documents'} documents + signature
 * Chaque envoi est verrouillé : un clic = une requête.
 */
import { lirePlaces, textePlaces } from './places.js';
import { incliner, gyroscope } from './cartes.js';
import { reduit } from './ui.js';
import { carteEnImage, agendaIcs, telecharger } from './carte-enfant.js';
import { padSignature } from './signature.js';
import {
  paymentMethodCheckoutDetail,
  paymentMethodCheckoutLabel,
} from '../../lib/payment-labels.js';
import { installmentScheduleHtml } from '../../lib/installments.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ETAPES = ['club', 'tarif', 'panier', 'paiement', 'enfant', 'documents', 'fin'];
const NOMS = { club: 'Club', tarif: 'Tarif', panier: 'Panier', paiement: 'Paiement', attente: 'Paiement', enfant: 'Fiche enfant', documents: 'Documents', fin: 'Confirmé' };
const SESSION = 'vdb-inscription';
const AGE_AU = { a: 2026, m: 10, j: 26 };
const fmt = (n) => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 });

function lireSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION) || '{}');
  } catch {
    return {};
  }
}
function ecrireSession(v) {
  try {
    sessionStorage.setItem(SESSION, JSON.stringify({ ...lireSession(), ...v }));
  } catch {
    /* navigation privée */
  }
}

async function api(chemin, opts = {}) {
  const res = await fetch(chemin, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.message || data.error || `Erreur ${res.status}`);
    e.status = res.status;
    e.code = data.code || data.error || null;
    throw e;
  }
  return data;
}

/** Âge au premier jour du stage, comme le calcule l'API. */
export function ageAuStage(a, m, j) {
  let age = AGE_AU.a - a;
  if (m > AGE_AU.m || (m === AGE_AU.m && j > AGE_AU.j)) age -= 1;
  return age;
}
function dateValide(a, m, j) {
  if (!a || !m || !j) return false;
  const d = new Date(Date.UTC(a, m - 1, j));
  return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === j;
}
const chiffres = (s) => String(s || '').replace(/\D/g, '');
const emailOk = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim());
const telOk = (s) => chiffres(s).length >= 10;
/** Scalapay (PayPlug) exige un mobile FR 06/07 — un fixe 01–05 passe telOk mais casse le checkout. */
const mobileFrOk = (s) => {
  let d = chiffres(s);
  if (d.startsWith('33') && d.length >= 11) d = `0${d.slice(2)}`;
  return /^0[67]\d{8}$/.test(d);
};
/** Les trois champs jour / mois / année d'un préfixe : « p » avant le paiement, « e » dans la fiche. */
const lireTroisChamps = (prefixe) => ({
  j: Number(chiffres(document.getElementById(`${prefixe}-jour`).value)),
  m: Number(chiffres(document.getElementById(`${prefixe}-mois`).value)),
  a: Number(chiffres(document.getElementById(`${prefixe}-annee`).value)),
});
/**
 * Les trois cases jour / mois / année : on passe seul à la case suivante (ou en tapant « / ») ; une date
 * collée (« 14/03/2014 », « 14032014 ») se répartit dans les trois cases.
 */
function brancherDate(champs, apres) {
  const repartir = (texte) => {
    const morceaux = String(texte).split(/\D+/).filter(Boolean);
    const brut = chiffres(texte);
    if (morceaux.length !== 3 && brut.length !== 8) return false;
    const [j, m, a] = morceaux.length === 3 ? morceaux : [brut.slice(0, 2), brut.slice(2, 4), brut.slice(4, 8)];
    champs[0].value = j.slice(0, 2).padStart(2, '0');
    champs[1].value = m.slice(0, 2).padStart(2, '0');
    champs[2].value = a.slice(0, 4);
    champs[2].focus();
    apres();
    return true;
  };
  champs.forEach((input, i, tous) => {
    input.addEventListener('paste', (ev) => {
      if (repartir(ev.clipboardData?.getData('text') || '')) ev.preventDefault();
    });
    input.addEventListener('input', () => {
      const brut = chiffres(input.value);
      // « 1/ » dans le jour ou le mois : la case est finie, on passe à la suivante
      if (/\D/.test(input.value) && brut && tous[i + 1]) {
        input.value = brut.slice(0, 2).padStart(2, '0');
        tous[i + 1].focus();
        return apres();
      }
      input.value = brut.slice(0, Number(input.maxLength));
      if (input.value.length === Number(input.maxLength) && tous[i + 1]) tous[i + 1].focus();
      apres();
    });
  });
}
/** Le message à montrer, ou '' quand la date est valide et que l'enfant a 8 à 16 ans le premier jour du stage. */
function erreurAge({ j, m, a }) {
  if (!(String(a).length === 4 && dateValide(a, m, j))) return 'Indiquez une date de naissance complète et valide, par exemple 14 3 2014.';
  const age = ageAuStage(a, m, j);
  if (age < 8 || age > 16) return `Le stage accueille les enfants de 8 à 16 ans au 26 octobre 2026 ; votre enfant aura ${age} ans.`;
  return '';
}

export async function inscription() {
  const D = JSON.parse($('#donnees-tunnel').textContent);
  const tunnel = $('[data-tunnel]');
  const alerte = $('[data-alerte]');
  const carte = $('[data-carte-enfant]');
  const params = new URLSearchParams(window.location.search);
  const session = lireSession();
  const etat = {
    club: null,
    tarif: null,
    declare: false,
    methodes: {},
    order: null,
    token: null,
    envoi: false,
    enfant: {},
    docs: new Set(),
    image: null,
  };

  /* ---------- utilitaires d'affichage ---------- */
  const dire = (msg, ok = false) => {
    alerte.hidden = !msg;
    alerte.classList.toggle('is-ok', ok);
    alerte.innerHTML = msg || '';
    if (msg) alerte.scrollIntoView({ block: 'nearest', behavior: reduit() ? 'auto' : 'smooth' });
  };
  const contactClub = (id) => {
    const c = D.clubs[id || etat.club || 'portet'];
    return `<a href="tel:${c.telHref}">${c.tel}</a> ou <a href="mailto:${c.email}">${c.email}</a>`;
  };
  const erreurChamp = (cle, msg) => {
    const p = $(`[data-erreur-pour="${cle}"]`);
    const input = document.getElementById(cle);
    if (p) {
      p.textContent = msg || '';
      p.classList.toggle('is-visible', !!msg);
    }
    if (input) {
      if (msg) {
        input.setAttribute('aria-invalid', 'true');
        if (p) input.setAttribute('aria-errormessage', p.id || (p.id = `err-${cle}`));
      } else input.removeAttribute('aria-invalid');
    }
    return !msg;
  };
  const premiereErreur = (form) => {
    const el = form.querySelector('[aria-invalid="true"]') || form.querySelector('.champ__erreur.is-visible');
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: reduit() ? 'auto' : 'smooth' });
      if (el.focus) el.focus({ preventScroll: true });
    }
  };

  // le premier écran s'affiche sans voler le défilement ni le focus ; ensuite, chaque étape prend le focus sur sa question
  let premierEcran = true;
  function aller(id) {
    $$('[data-panneau]').forEach((p) => {
      p.hidden = p.dataset.panneau !== id;
    });
    const idx = ETAPES.indexOf(id === 'attente' ? 'paiement' : id);
    $$('[data-etape-pastille]').forEach((li, i) => {
      li.classList.toggle('is-fait', i < idx);
      li.classList.toggle('is-actuel', i === idx);
      if (i === idx) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
    $('[data-etape-texte]').textContent = `Étape ${idx + 1} sur ${ETAPES.length} · ${NOMS[id]}`;
    $('[data-etape-barre]').style.setProperty('--p', `${((idx + 1) / ETAPES.length) * 100}%`);
    tunnel.classList.toggle('is-fiche', id === 'enfant');
    tunnel.classList.toggle('is-docs', id === 'documents');
    tunnel.classList.toggle('is-fin', id === 'fin');
    const aide = $('[data-carte-aide]');
    if (aide) {
      aide.textContent =
        id === 'enfant'
          ? 'Sa carte se construit pendant que vous remplissez la fiche.'
          : id === 'documents'
            ? 'Chaque document validé appose son tampon sur sa carte.'
            : id === 'fin'
              ? 'Sa carte est validée. Elle rejoint celles de ses coachs.'
              : 'La carte de votre enfant se construit pendant que vous remplissez sa fiche, après le paiement.';
    }
    const h = $(`[data-panneau="${id}"] h1`);
    if (h && !premierEcran) {
      h.setAttribute('tabindex', '-1');
      window.scrollTo({ top: 0, behavior: reduit() ? 'auto' : 'smooth' });
      setTimeout(() => h.focus({ preventScroll: true }), 50);
    }
    premierEcran = false;
    ecrireSession({ etape: id });
  }
  /** L'adresse ne garde que la commande et sa clé : un rechargement reprend au bon écran, sans rejouer le retour du paiement. */
  const nettoyerAdresse = () => {
    if (!etat.order?.id || !etat.token) return;
    history.replaceState(history.state, '', `/inscription?order=${encodeURIComponent(etat.order.id)}&token=${encodeURIComponent(etat.token)}`);
  };

  /* ---------- récapitulatif et carte ---------- */
  function majRecap() {
    const c = etat.club ? D.clubs[etat.club] : null;
    tunnel.dataset.club = etat.club || '';
    carte.dataset.club = etat.club || '';
    $('[data-r-club]').textContent = c ? c.nom : '—';
    $('[data-c-club]').textContent = c ? c.court : 'Club';
    $('[data-c-coachs]').textContent = c ? `Avec ${c.coachs.slice(0, -1).join(', ')} et ${c.coachs[c.coachs.length - 1]}` : 'Ses coachs pour la semaine';
    const prix = etat.tarif === 'adherent' ? D.prix.adherent : etat.tarif === 'non-adherent' ? D.prix.nonAdherent : null;
    $('[data-r-tarif]').textContent = prix ? `${etat.tarif === 'adherent' ? 'Adhérent' : 'Non-adhérent'} · ${prix} €` : '—';
    $$('[data-choix-club]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.choixClub === etat.club)));
    $$('[data-choix-tarif]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.choixTarif === etat.tarif)));
  }
  const montant = () => (etat.tarif === 'adherent' ? D.prix.adherent : D.prix.nonAdherent);

  const appliquerPhotoCarte = (url) => {
    const img = $('[data-c-photo]');
    const mono = $('[data-c-initiales]');
    if (url) {
      img.src = url;
      img.hidden = false;
      img.alt = '';
      carte.classList.add('has-photo');
      mono.hidden = true;
    } else {
      img.removeAttribute('src');
      img.hidden = true;
      carte.classList.remove('has-photo');
      mono.hidden = false;
    }
  };

  function majCarte() {
    const e = etat.enfant;
    const prenom = (e.prenom || '').trim();
    const nomEl = $('[data-c-prenom]');
    const avant = nomEl.textContent;
    nomEl.textContent = prenom || 'Son prénom';
    if (prenom && avant !== nomEl.textContent) {
      carte.classList.remove('is-ecrit');
      void carte.offsetWidth;
      carte.classList.add('is-ecrit');
    }
    appliquerPhotoCarte(e.photo_url || '');
    const ini = `${(prenom[0] || '').toUpperCase()}${((e.nom || '').trim()[0] || '').toUpperCase()}`;
    if (!e.photo_url) $('[data-c-initiales]').textContent = ini || '?';
    $('[data-c-niveau]').textContent = e.niveau || 'Boxeur du stage';
    $('[data-c-age]').textContent = Number.isFinite(e.age) && e.age >= 8 && e.age <= 16 ? `${e.age} ans${e.pratique ? ` · ${e.pratique === 'Débutant' ? 'débutant' : `${e.pratique} de pratique`}` : ''}` : '8–16 ans';
    if (etat.order?.id) $('[data-c-serie]').textContent = `N° ${String(etat.order.id).slice(-4).toUpperCase()}`;
    if (prenom && !matchMedia('(hover: hover)').matches && typeof DeviceOrientationEvent !== 'undefined') $('[data-gyro]').hidden = false;
  }
  function tamponner(cle, oui) {
    const t = $(`[data-tampon="${cle}"]`);
    if (!t) return;
    if (oui && !t.classList.contains('is-pose')) {
      t.classList.add('is-pose');
      if (navigator.vibrate && !reduit()) navigator.vibrate(12);
    } else if (!oui) t.classList.remove('is-pose');
  }

  // la carte s'incline sous la souris ; sur téléphone, avec le gyroscope après accord
  const appliquer = incliner(carte, { force: 9 });
  $('[data-gyro]')?.addEventListener('click', async () => {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== 'granted') return;
      }
      carte.classList.add('is-suit');
      carte.style.setProperty('--holo', '1');
      gyroscope(appliquer);
      $('[data-gyro]').hidden = true;
    } catch {
      /* pas de gyroscope : la carte reste immobile */
    }
  });

  /* ---------- étape 1 : club ---------- */
  ['portet', 'minimes'].forEach((club) => {
    lirePlaces(club)
      .then((v) => {
        etat.methodes[club] = v.methodes;
        const el = $(`[data-places-club="${club}"]`);
        if (el) el.textContent = textePlaces(v);
        if (v.restantes <= 0) {
          const b = $(`[data-choix-club="${club}"]`);
          if (b) {
            b.disabled = true;
            b.setAttribute('aria-disabled', 'true');
          }
        }
      })
      .catch(() => {});
  });
  $$('[data-choix-club]').forEach((b) =>
    b.addEventListener('click', () => {
      etat.club = b.dataset.choixClub;
      ecrireSession({ club: etat.club });
      majRecap();
      majCarte();
      setTimeout(() => aller('tarif'), reduit() ? 0 : 220);
    }),
  );

  /* ---------- étape 2 : tarif ---------- */
  const decl = $('[data-declaration]');
  const declare = $('[data-declare]');
  const suiteTarif = $('[data-suite="panier"]');
  const majTarif = () => {
    decl.hidden = etat.tarif !== 'adherent';
    suiteTarif.disabled = !(etat.tarif === 'non-adherent' || (etat.tarif === 'adherent' && declare.checked));
  };
  $$('[data-choix-tarif]').forEach((b) =>
    b.addEventListener('click', () => {
      etat.tarif = b.dataset.choixTarif;
      ecrireSession({ tarif: etat.tarif });
      majRecap();
      majTarif();
      if (etat.tarif === 'non-adherent') {
        majPanier();
        setTimeout(() => aller('panier'), reduit() ? 0 : 220);
      } else declare.focus();
    }),
  );
  declare.addEventListener('change', () => {
    etat.declare = declare.checked;
    decl.classList.remove('is-erreur');
    majTarif();
  });
  suiteTarif.addEventListener('click', () => {
    if (etat.tarif === 'adherent' && !declare.checked) {
      decl.classList.add('is-erreur');
      return;
    }
    majPanier();
    aller('panier');
  });

  /* ---------- étape 3 : panier ---------- */
  const panier = $('[data-panier]');
  const ajouter = $('[data-ajouter]');
  function majPanier() {
    const c = D.clubs[etat.club];
    const p = montant();
    $('[data-p-nom]').textContent = `Stage enfant — ${etat.tarif === 'adherent' ? 'Adhérent' : 'Non-adhérent'}`;
    $('[data-p-club]').textContent = c ? `${c.nom} · ${c.adresse}` : '';
    $('[data-p-prix]').textContent = String(p);
    $('[data-p-total]').textContent = String(p);
    // la ligne « plusieurs fois » ne nomme que ce que l'API propose vraiment pour ce club ;
    // Scalapay comme ses échéances au paiement (lib/installments.js) : 3 fois sans frais ou 4 fois avec 1,5 % de frais
    const ids = (etat.methodes[etat.club] || []).map((m) => m.id);
    const enPlusieurs = [
      ids.includes('paypal_4x') ? `en 4 fois avec PayPal (4 × ${fmt(p / 4)} €) si vous y êtes éligible` : '',
      ids.includes('scalapay') ? 'en CB en 3 fois sans frais ou en 4 fois avec 1,5 % de frais' : '',
    ].filter(Boolean);
    $('[data-p-4x]').textContent = enPlusieurs.length ? `Payable en une fois, ou ${enPlusieurs.join(', ou ')}.` : '';
    panier.classList.remove('is-ajoute');
    ajouter.textContent = 'Ajouter au panier';
    ajouter.disabled = false;
  }
  ajouter.addEventListener('click', () => {
    if (ajouter.disabled) return;
    ajouter.disabled = true;
    panier.classList.add('is-ajoute');
    ajouter.textContent = 'Dans votre panier ✓';
    setTimeout(() => {
      majPaiement();
      aller('paiement');
    }, reduit() ? 0 : 520);
  });

  /* ---------- étape 4 : paiement ---------- */
  const formPaie = $('[data-form-paiement]');
  const btnPayer = $('[data-payer]');
  formPaie.addEventListener('change', (ev) => {
    if (ev.target?.name === 'method') majEcheances();
  });
  const LIBELLES = {
    cawl_card: ['Carte bancaire', 'Paiement comptant par CB'],
    payplug_card: ['Carte bancaire', 'Paiement comptant par CB'],
    paypal_once: ['PayPal', 'Paiement comptant'],
    paypal_4x: ['PayPal en plusieurs fois', 'Selon votre éligibilité chez PayPal'],
    scalapay: [paymentMethodCheckoutLabel('scalapay'), paymentMethodCheckoutDetail('scalapay')],
  };
  async function majPaiement() {
    const p = montant();
    $('[data-payer-montant]').textContent = `${p} €`;
    const zone = $('[data-methodes]');
    let methodes = etat.methodes[etat.club];
    if (!methodes) {
      try {
        methodes = (await lirePlaces(etat.club)).methodes;
        etat.methodes[etat.club] = methodes;
      } catch {
        methodes = [];
      }
    }
    zone.innerHTML = '';
    if (!methodes.length) {
      zone.innerHTML = `<p class="alerte">Le paiement en ligne n’est pas disponible pour le moment. Pour réserver la place de votre enfant, appelez le club : ${contactClub()}.</p>`;
      btnPayer.disabled = true;
      return;
    }
    btnPayer.disabled = false;
    methodes.forEach((m, i) => {
      const [nom, detail] = LIBELLES[m.id] || [m.label, ''];
      const somme =
        m.id === 'paypal_4x' ? `dès 4 × ${fmt(p / 4)} €` : m.id === 'scalapay' ? `dès 3 × ${fmt(p / 3)} €` : `${p} €`;
      const label = document.createElement('label');
      label.className = 'methode';
      label.innerHTML = `<input type="radio" name="method" value="${m.id}" ${i === 0 ? 'checked' : ''} /><span class="radio__rond" aria-hidden="true"></span><span class="methode__nom">${nom}<small>${detail}</small></span><span class="methode__montant">${somme}</span>`;
      zone.appendChild(label);
    });
    majEcheances();
  }

  function majEcheances() {
    const bloc = $('[data-echeances]');
    if (!bloc) return;
    const methode = formPaie.querySelector('input[name="method"]:checked')?.value;
    const html = installmentScheduleHtml(methode, montant());
    if (html) {
      bloc.innerHTML = html;
      bloc.hidden = false;
    } else {
      bloc.innerHTML = '';
      bloc.hidden = true;
    }
  }
  // la date de naissance avant de payer : un enfant hors des 8–16 ans ne paie pas pour rien
  const champsDatePaie = $$('[data-date-paie]');
  const majAgePaie = () => {
    const d = lireTroisChamps('p');
    const sortie = $('[data-age-paie]');
    if (String(d.a).length === 4 && dateValide(d.a, d.m, d.j)) {
      const age = ageAuStage(d.a, d.m, d.j);
      const dansLaTranche = age >= 8 && age <= 16;
      sortie.textContent = dansLaTranche ? `${age} ans le 26 octobre 2026` : `${age} ans le 26 octobre 2026 : le stage accueille les 8 à 16 ans.`;
      sortie.classList.toggle('is-hors', !dansLaTranche);
      if (dansLaTranche) {
        erreurChamp('p-date', '');
        champsDatePaie.forEach((i) => i.removeAttribute('aria-invalid'));
      }
    } else {
      sortie.textContent = '';
      sortie.classList.remove('is-hors');
    }
  };
  brancherDate(champsDatePaie, majAgePaie);
  const remplirDate = (prefixe, n) => {
    if (!n?.a) return false;
    if (['jour', 'mois', 'annee'].some((k) => document.getElementById(`${prefixe}-${k}`).value)) return false;
    document.getElementById(`${prefixe}-jour`).value = String(n.j).padStart(2, '0');
    document.getElementById(`${prefixe}-mois`).value = String(n.m).padStart(2, '0');
    document.getElementById(`${prefixe}-annee`).value = String(n.a);
    return true;
  };

  // préremplissage : session (« inscrire un autre enfant »)
  const parent = session.parent || {};
  [['p-prenom', 'first_name'], ['p-nom', 'last_name'], ['p-email', 'email'], ['p-tel', 'phone']].forEach(([id, k]) => {
    if (parent[k]) $(`#${id}`).value = parent[k];
  });

  // retour arrière depuis la page du prestataire (page restaurée telle quelle) : le bouton redevient cliquable
  let libellePayer = '';
  window.addEventListener('pageshow', (ev) => {
    if (!ev.persisted || !libellePayer) return;
    etat.envoi = false;
    btnPayer.disabled = false;
    btnPayer.innerHTML = libellePayer;
  });

  formPaie.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (etat.envoi) return;
    dire('');
    const v = (id) => $(`#${id}`).value.trim();
    let ok = true;
    const naissance = lireTroisChamps('p');
    const msgDate = erreurAge(naissance);
    ok = erreurChamp('p-date', msgDate) && ok;
    if (msgDate) $('#p-jour').setAttribute('aria-invalid', 'true');
    else champsDatePaie.forEach((i) => i.removeAttribute('aria-invalid'));
    ok = erreurChamp('p-prenom', v('p-prenom') ? '' : 'Indiquez votre prénom.') && ok;
    ok = erreurChamp('p-nom', v('p-nom') ? '' : 'Indiquez votre nom.') && ok;
    ok = erreurChamp('p-email', emailOk(v('p-email')) ? '' : 'Indiquez une adresse e-mail valide, par exemple prenom@exemple.fr.') && ok;
    const methode = formPaie.querySelector('input[name="method"]:checked')?.value;
    const tel = v('p-tel');
    let msgTel = '';
    if (!telOk(tel)) msgTel = 'Indiquez un numéro de téléphone à 10 chiffres.';
    else if (methode === 'scalapay' && !mobileFrOk(tel)) {
      msgTel = 'Pour le paiement CB en plusieurs fois, indiquez un mobile français (06 ou 07), pas un fixe.';
    }
    ok = erreurChamp('p-tel', msgTel) && ok;
    ok = erreurChamp('methode', methode ? '' : 'Choisissez un moyen de paiement.') && ok;
    if (!ok) return premiereErreur(formPaie);
    if (etat.tarif === 'adherent' && !declare.checked) {
      aller('tarif');
      decl.classList.add('is-erreur');
      return;
    }
    etat.envoi = true;
    btnPayer.disabled = true;
    libellePayer = btnPayer.innerHTML;
    btnPayer.textContent = 'Redirection vers le paiement…';
    const parentSaisi = { first_name: v('p-prenom'), last_name: v('p-nom'), email: v('p-email'), phone: v('p-tel') };
    ecrireSession({ parent: parentSaisi, club: etat.club, tarif: etat.tarif, naissance });
    try {
      const r = await api('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          club: etat.club,
          method: methode,
          is_member: etat.tarif === 'adherent',
          member_declare: etat.tarif === 'adherent' ? declare.checked : true,
          parent_email: parentSaisi.email,
          parent_phone: parentSaisi.phone,
          parent_first_name: parentSaisi.first_name,
          parent_last_name: parentSaisi.last_name,
        }),
      });
      ecrireSession({ order: r.order_id, token: r.access_token });
      window.location.assign(r.redirect_url);
    } catch (e) {
      etat.envoi = false;
      btnPayer.disabled = false;
      btnPayer.innerHTML = libellePayer;
      if (e.status === 409) {
        const autre = etat.club === 'portet' ? 'minimes' : 'portet';
        dire(`Il n’y a plus de place au ${D.clubs[etat.club].nom}. Le même stage a lieu ${D.clubs[autre].a} : <a href="/inscription?club=${autre}${etat.tarif ? `&tarif=${etat.tarif}` : ''}">choisir ce club</a>.`);
      } else if (e.code === 'method_forbidden') {
        dire('Ce moyen de paiement n’est pas proposé pour ce club. Choisissez-en un autre.');
      } else if (e.code === 'payplug_customer_incomplete' || /mobile|06 ou 07|telephone/i.test(e.message || '')) {
        dire(e.message || 'Pour le paiement CB en plusieurs fois, indiquez un mobile français (06 ou 07).');
        erreurChamp('p-tel', e.message || 'Mobile 06 ou 07 requis pour le paiement CB en plusieurs fois.');
        $('#p-tel')?.focus();
      } else if (e.message && e.message !== `Erreur ${e.status}`) {
        dire(`${e.message} Si le problème continue, appelez le club : ${contactClub()}.`);
      } else {
        dire(`Le paiement n’a pas pu démarrer. Réessayez dans un instant ; si le problème continue, appelez le club : ${contactClub()}.`);
      }
    }
  });

  /* ---------- retour du prestataire ---------- */
  const panneauAttente = $('[data-panneau="attente"]');
  const titreAttente = $('#q-attente');
  const TITRE_ATTENTE = titreAttente.textContent;
  const TEXTE_ATTENTE = $('[data-attente-texte]').textContent;
  async function confirmer(essai = 0) {
    const texte = $('[data-attente-texte]');
    if (essai === 0) {
      panneauAttente.classList.remove('is-echec');
      titreAttente.textContent = TITRE_ATTENTE;
      texte.textContent = TEXTE_ATTENTE;
    }
    aller('attente');
    $('[data-attente-actions]').hidden = true;
    try {
      const r = await api('/api/confirm-payment', {
        method: 'POST',
        body: JSON.stringify({ order_id: etat.order?.id || params.get('order'), token: etat.token }),
      });
      charger(r.order);
      nettoyerAdresse();
      if (r.order?.status !== 'complete') $('[data-ok-paye]').hidden = false;
      return router(r.order);
    } catch (e) {
      if (e.status === 402 && essai < 4) {
        texte.textContent = 'Le prestataire n’a pas encore confirmé le paiement. Nouvelle vérification dans quelques secondes…';
        setTimeout(() => confirmer(essai + 1), 2500);
        return;
      }
      // la commande a peut-être été payée entre-temps (notification du prestataire) : on relit avant de conclure
      try {
        const o = await api(`/api/order?id=${encodeURIComponent(etat.order?.id || params.get('order'))}&token=${encodeURIComponent(etat.token)}`);
        if (o.order) charger(o.order);
        if (o.order?.payment?.status === 'paid') {
          nettoyerAdresse();
          if (o.order.status !== 'complete') $('[data-ok-paye]').hidden = false;
          return router(o.order);
        }
      } catch {
        /* on affiche le message ci-dessous */
      }
      panneauAttente.classList.add('is-echec');
      titreAttente.textContent = 'Le paiement n’est pas confirmé';
      texte.innerHTML = `S’il a été refusé ou annulé, rien n’a été prélevé : vous pouvez choisir un autre moyen de paiement. Si le prestataire vous a affiché « paiement accepté », ne payez pas une deuxième fois : vous recevrez un e-mail avec le lien pour finir l’inscription. Une question : ${contactClub()}.`;
      $('[data-attente-actions]').hidden = false;
      $('[data-autre-moyen]').hidden = !etat.club;
    }
  }
  $('[data-reessayer]').addEventListener('click', () => confirmer(0));
  $('[data-autre-moyen]').addEventListener('click', () => {
    // la commande impayée expire seule ; le paiement suivant en crée une nouvelle
    etat.order = null;
    etat.token = null;
    ecrireSession({ order: null, token: null });
    history.replaceState(history.state, '', `/inscription?club=${encodeURIComponent(etat.club)}`);
    if (remplirDate('p', lireSession().naissance)) majAgePaie();
    majPanier();
    majPaiement();
    aller('paiement');
  });

  function charger(order) {
    etat.order = order;
    if (order?.club) etat.club = order.club;
    etat.tarif = order?.is_member ? 'adherent' : 'non-adherent';
    if (order?.is_member) {
      declare.checked = true;
      etat.declare = true;
    }
    majRecap();
    // la fiche reprend les coordonnées données au paiement
    if (order?.parent) {
      if (order.parent.phone && !$('#e-tel1').value) $('#e-tel1').value = order.parent.phone;
      if (order.parent.email && !$('#e-email').value) $('#e-email').value = order.parent.email;
      const signataire = [order.parent.first_name, order.parent.last_name].filter(Boolean).join(' ');
      if (signataire && !$('#s-nom').value) $('#s-nom').value = signataire;
      ['p-prenom', 'p-nom', 'p-email', 'p-tel'].forEach((id, i) => {
        const val = [order.parent.first_name, order.parent.last_name, order.parent.email, order.parent.phone][i];
        if (val && !$(`#${id}`).value) $(`#${id}`).value = val;
      });
    }
    if (order?.child) {
      const c = order.child;
      etat.enfant.prenom = c.first_name;
      etat.enfant.nom = c.last_name;
      etat.enfant.age = c.age;
      etat.enfant.pratique = c.practice_years;
      const niv = /Niveau : (.+)/.exec(c.notes || '');
      etat.enfant.niveau = c.level || (niv ? niv[1].trim() : '');
      if (c.photo_url) {
        etat.enfant.photo_url = c.photo_url;
        const prev = $('[data-photo-apercu]');
        if (prev) {
          prev.src = c.photo_url;
          prev.hidden = false;
        }
      }
    }
    majCarte();
  }

  function router(order) {
    if (order.status === 'complete') {
      DOCS_CLES.forEach((k) => tamponner(k, true));
      etat.image = order.documents?.image_rights ?? null;
      return finir(order, { deja: true });
    }
    if (order.payment?.status === 'paid') {
      // la date de naissance donnée avant le paiement n'est pas à retaper dans la fiche
      if (!order.child && remplirDate('e', lireSession().naissance)) majAge();
      return aller(order.child ? 'documents' : 'enfant');
    }
    majPanier();
    majPaiement();
    return aller('paiement');
  }

  /* ---------- étape 5 : fiche enfant ---------- */
  const formEnfant = $('[data-form-enfant]');

  async function fichierVersJpegBlob(file, maxDim = 1600, quality = 0.86) {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
    bmp.close();
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', quality));
  }

  async function envoyerPhotoEnfant(file) {
    if (!etat.order?.id || !etat.token) {
      erreurChamp('e-photo', 'Paiement requis avant d’ajouter la photo.');
      return;
    }
    const etatEl = $('[data-photo-etat]');
    erreurChamp('e-photo', '');
    if (etatEl) etatEl.textContent = 'Envoi de la photo…';
    try {
      const blob = await fichierVersJpegBlob(file);
      if (!blob || blob.size > 1.8 * 1024 * 1024) {
        erreurChamp('e-photo', 'Photo trop lourde. Choisissez une image plus petite.');
        if (etatEl) etatEl.textContent = '';
        return;
      }
      const b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result || '').split(',')[1] || '');
        r.onerror = () => rej(new Error('read'));
        r.readAsDataURL(blob);
      });
      const r = await api('/api/child-photo', {
        method: 'POST',
        body: JSON.stringify({
          order_id: etat.order.id,
          token: etat.token,
          mime: 'image/jpeg',
          data: b64,
        }),
      });
      etat.enfant.photo_url = r.photo_url;
      const prev = $('[data-photo-apercu]');
      if (prev) {
        prev.src = r.photo_url;
        prev.hidden = false;
      }
      majCarte();
      if (etatEl) etatEl.textContent = 'Photo enregistrée sur la carte.';
    } catch (e) {
      const msg =
        e.status === 503
          ? 'Le stockage photo n’est pas disponible pour le moment. Réessayez plus tard ou continuez sans photo.'
          : e.message && e.message !== 'cloudinary_failed'
            ? e.message
            : 'La photo n’a pas pu être enregistrée. Réessayez.';
      erreurChamp('e-photo', msg);
      if (etatEl) etatEl.textContent = '';
    }
  }

  $$('[data-photo-fichier], [data-photo-camera]').forEach((input) => {
    input.addEventListener('change', () => {
      const f = input.files?.[0];
      input.value = '';
      if (f) void envoyerPhotoEnfant(f);
    });
  });
  const lireDate = () => lireTroisChamps('e');
  const majAge = () => {
    const { j, m, a } = lireDate();
    const sortie = $('[data-age]');
    if (String(a).length === 4 && dateValide(a, m, j)) {
      const age = ageAuStage(a, m, j);
      etat.enfant.age = age;
      sortie.textContent = age >= 8 && age <= 16 ? `${age} ans le 26 octobre 2026` : `${age} ans le 26 octobre 2026 : le stage accueille les 8 à 16 ans.`;
    } else {
      etat.enfant.age = NaN;
      sortie.textContent = '';
    }
    majCarte();
  };
  brancherDate($$('[data-date]'), majAge);
  formEnfant.addEventListener('input', (ev) => {
    const cible = ev.target;
    const lien = cible.dataset?.versCarte;
    if (lien === 'prenom') etat.enfant.prenom = cible.value;
    if (lien === 'nom') etat.enfant.nom = cible.value;
    if (lien === 'pratique') etat.enfant.pratique = cible.value;
    if (lien === 'niveau' && cible.checked) etat.enfant.niveau = cible.value;
    if (cible.getAttribute('aria-invalid') === 'true' && cible.value) erreurChamp(cible.id, '');
    majCarte();
  });
  formEnfant.addEventListener('change', (ev) => {
    if (ev.target.name === 'niveau') {
      etat.enfant.niveau = ev.target.value;
      erreurChamp('e-niveau', '');
      majCarte();
    }
    if (ev.target.name === 'midi') erreurChamp('e-midi', '');
    if (ev.target.id === 'e-pratique') {
      etat.enfant.pratique = ev.target.value;
      majCarte();
    }
  });

  formEnfant.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (etat.envoi) return;
    dire('');
    const f = new FormData(formEnfant);
    const v = (k) => String(f.get(k) || '').trim();
    const { j, m, a } = lireDate();
    let ok = true;
    ok = erreurChamp('e-prenom', v('first_name') ? '' : 'Indiquez le prénom de votre enfant.') && ok;
    ok = erreurChamp('e-nom', v('last_name') ? '' : 'Indiquez le nom de votre enfant.') && ok;
    const msgDate = erreurAge({ j, m, a });
    ok = erreurChamp('e-date', msgDate) && ok;
    if (msgDate) $('#e-jour').setAttribute('aria-invalid', 'true');
    else $$('[data-date]').forEach((i) => i.removeAttribute('aria-invalid'));
    const poids = Number(v('poids').replace(',', '.'));
    ok = erreurChamp('e-poids', poids >= 15 && poids <= 150 ? '' : 'Indiquez le poids en kilos, par exemple 38.') && ok;
    ok = erreurChamp('e-pratique', v('practice_years') ? '' : 'Choisissez les années de pratique (« Débutant » s’il commence).') && ok;
    ok = erreurChamp('e-niveau', v('niveau') ? '' : 'Choisissez le niveau de votre enfant.') && ok;
    ok = erreurChamp('e-tel1', telOk(v('parent_phone')) ? '' : 'Indiquez un numéro à 10 chiffres.') && ok;
    ok = erreurChamp('e-email', emailOk(v('parent_email')) ? '' : 'Indiquez une adresse e-mail valide.') && ok;
    ok = erreurChamp('e-urgence', v('urgence_nom') ? '' : 'Indiquez qui appeler en cas d’urgence.') && ok;
    ok = erreurChamp('e-urgence-tel', telOk(v('urgence_tel')) ? '' : 'Indiquez son numéro à 10 chiffres.') && ok;
    ok = erreurChamp('e-midi', v('midi') ? '' : 'Indiquez ce que fait votre enfant pendant la pause du midi.') && ok;
    if (!ok) return premiereErreur(formEnfant);

    // l'API ne garde que quelques champs : le reste voyage dans « notes », une ligne par information,
    // lisible dans l'e-mail de l'équipe et relue par l'admin
    const ligne = (libelle, val) => `${libelle} : ${val || '—'}`;
    const notes = [
      ligne('Poids', `${String(poids).replace('.', ',')} kg`),
      ligne('Niveau', v('niveau')),
      ligne('Matchs disputés en compétition', v('combats')),
      ligne('Contact d’urgence', `${v('urgence_nom')} — ${v('urgence_tel')}`),
      ligne('Allergies', v('allergies')),
      ligne('Traitement médical', v('traitement')),
      ligne('Blessure ou problème médical', v('blessure')),
      ligne('Pause du midi', v('midi')),
      ligne('Observations', v('notes_libres')),
    ].join('\n');
    const naissance = `${a}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
    etat.envoi = true;
    const bouton = $('[data-valider-enfant]');
    bouton.disabled = true;
    try {
      const r = await api('/api/order', {
        method: 'POST',
        body: JSON.stringify({
          action: 'child',
          order_id: etat.order?.id,
          token: etat.token,
          first_name: v('first_name'),
          last_name: v('last_name'),
          birthdate: naissance,
          practice_years: v('practice_years'),
          // champs structurés de l'API (commit 5c3cc24) ; « notes » garde le résumé lisible pour l'équipe
          notes,
          weight: String(poids).replace('.', ','),
          level: v('niveau'),
          fights_count: v('combats'),
          emergency_name: v('urgence_nom'),
          emergency_phone: v('urgence_tel'),
          allergies: v('allergies'),
          treatment: v('traitement'),
          injury: v('blessure'),
          lunch_break: v('midi'),
          parent_phone: v('parent_phone'),
          parent_phone_2: v('parent_phone_2'),
          parent_email: v('parent_email'),
          photo_url: etat.enfant.photo_url || undefined,
        }),
      });
      etat.order = r.order;
      etat.enfant.midi = v('midi');
      majCarte();
      aller('documents');
    } catch (e) {
      if (e.status === 409) return dejaFinalisee();
      dire(e.status === 404 ? `Nous ne retrouvons pas cette inscription. Utilisez le lien reçu par e-mail, ou appelez le club : ${contactClub()}.` : `La fiche n’a pas pu être enregistrée. Réessayez ; si le problème continue : ${contactClub()}.`);
    } finally {
      etat.envoi = false;
      bouton.disabled = false;
    }
  });

  /* ---------- étape 6 : documents ---------- */
  const formDocs = $('[data-form-docs]');
  const DOCS_CLES = D.docs.map((d) => d.cle);
  const pad = padSignature($('[data-pad]'), {
    surTrait: () => {
      $('.pad').classList.add('is-signe');
      erreurChamp('signature', '');
    },
    surVide: () => $('.pad').classList.remove('is-signe'),
  });
  $('[data-pad-effacer]').addEventListener('click', () => pad.effacer());
  formDocs.addEventListener('change', (ev) => {
    const t = ev.target;
    if (DOCS_CLES.includes(t.name)) {
      tamponner(t.name, t.checked);
      t.closest('.doc')?.classList.toggle('is-valide', t.checked);
      t.closest('.declaration')?.classList.remove('is-erreur');
    }
    if (t.name === 'image_rights') {
      etat.image = t.value === 'oui';
      erreurChamp('image', '');
    }
  });
  formDocs.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (etat.envoi) return;
    dire('');
    let ok = true;
    DOCS_CLES.forEach((k) => {
      const c = formDocs.querySelector(`input[name="${k}"]`);
      c.closest('.declaration').classList.toggle('is-erreur', !c.checked);
      if (!c.checked) ok = false;
    });
    const image = formDocs.querySelector('input[name="image_rights"]:checked')?.value;
    ok = erreurChamp('image', image ? '' : 'Indiquez si vous autorisez ou non l’utilisation de l’image de votre enfant.') && ok;
    const nom = $('#s-nom').value.trim();
    const lieu = $('#s-lieu').value.trim();
    ok = erreurChamp('s-nom', nom ? '' : 'Indiquez votre nom et votre prénom.') && ok;
    ok = erreurChamp('s-lieu', lieu ? '' : 'Indiquez la ville.') && ok;
    ok = erreurChamp('signature', pad.vide() ? 'Signez dans le cadre, avec le doigt ou la souris.' : '') && ok;
    if (!ok) {
      if (DOCS_CLES.some((k) => !formDocs.querySelector(`input[name="${k}"]`).checked)) {
        dire('Validez chacun des documents pour finaliser l’inscription.');
      }
      return premiereErreur(formDocs);
    }
    etat.envoi = true;
    const bouton = $('[data-finaliser]');
    bouton.disabled = true;
    const date = new Date();
    // l'API conserve un champ « signature » (texte) : on y range le tracé et le « fait à … le … »
    const signature = JSON.stringify({
      nom,
      lieu,
      date: date.toISOString(),
      document: 'Autorisation parentale et documents du stage',
      image: pad.image(),
    });
    try {
      const r = await api('/api/order', {
        method: 'POST',
        body: JSON.stringify({
          action: 'documents',
          order_id: etat.order?.id,
          token: etat.token,
          cgv: true,
          reglement: true,
          parental: true,
          health: true,
          participation: true,
          image_rights: image === 'oui',
          signature,
        }),
      });
      etat.order = r.order;
      etat.image = image === 'oui';
      finir(r.order);
    } catch (e) {
      if (e.status === 409) return dejaFinalisee();
      dire(`L’inscription n’a pas pu être finalisée. Réessayez ; si le problème continue : ${contactClub()}.`);
    } finally {
      etat.envoi = false;
      bouton.disabled = false;
    }
  });

  /** L'API répond 409 quand l'inscription est déjà complète (onglet resté ouvert, double envoi) : on montre la fin. */
  async function dejaFinalisee() {
    try {
      const r = await api(`/api/order?id=${encodeURIComponent(etat.order?.id || params.get('order'))}&token=${encodeURIComponent(etat.token)}`);
      return router(r.order);
    } catch {
      dire(`Cette inscription est déjà finalisée. Une question : ${contactClub()}.`, true);
    }
  }

  /* ---------- étape 7 : confirmé ---------- */
  function finir(order, { deja = false } = {}) {
    if (order) charger(order);
    const c = D.clubs[etat.club];
    const e = etat.enfant;
    // la carte quitte la colonne et rejoint, littéralement, le paquet de ses coachs
    const scene = $('[data-fin-scene]');
    if (scene && carte.parentElement !== scene) scene.appendChild(carte);
    carte.classList.add('is-scelle');
    $('[data-f-prenom]').textContent = e.prenom || 'Votre enfant';
    $$('[data-paquet-club]').forEach((p) => {
      p.hidden = p.dataset.paquetClub !== etat.club;
    });
    const docs = `Autorisation parentale, état de santé, règlement intérieur, CGV, conditions de participation · droit à l’image : ${etat.image === true ? 'autorisé' : etat.image === false ? 'refusé' : 'indiqué'}`;
    const lignes = [
      ['Club', `${c.nom}<br /><span>${c.adresse}</span>`],
      ['Enfant', `${[e.prenom, e.nom].filter(Boolean).join(' ')}${Number.isFinite(e.age) ? ` · ${e.age} ans` : ''}`],
      ['Dates', 'Du lundi 26 au samedi 31 octobre 2026'],
      ['Horaires', '10h – 12h et 14h – 16h<br /><span>Mercredi 11h – 13h et 16h – 18h · samedi activité de cohésion 10h – 12h, interclub au Boxing Center des Minimes à partir de 14h</span>'],
      ['Repas', 'À prévoir : non fourni<br /><span>Les enfants peuvent rester à la salle sous surveillance pendant la pause du midi.</span>'],
      ['Documents', docs],
      ['Réglé', `${order?.amount_cents ? fmt(order.amount_cents / 100) : montant()} €`],
    ];
    $('[data-recap-fin]').innerHTML = lignes.map(([dt, dd]) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`).join('');
    $('[data-f-contact]').innerHTML = `<h2>Une question ?</h2><p>Le club répond : ${contactClub()}. Un e-mail de confirmation vous a été envoyé avec ce récapitulatif.</p>`;
    $('[data-autre-enfant]').href = `/inscription?club=${etat.club}&tarif=${etat.tarif}`;
    ecrireSession({ etape: null, order: null, token: null, naissance: null });
    aller('fin');
    if (!deja) dire('');
  }
  const donneesCarte = () => ({
    prenom: etat.enfant.prenom || '',
    nom: etat.enfant.nom || '',
    age: etat.enfant.age,
    niveau: etat.enfant.niveau || '',
    pratique: etat.enfant.pratique || '',
    photo_url: etat.enfant.photo_url || '',
    club: D.clubs[etat.club],
    serie: etat.order?.id ? String(etat.order.id).slice(-4).toUpperCase() : '',
    tampons: D.docs.map((d) => d.tampon),
  });
  $('[data-telecharger]').addEventListener('click', async () => {
    const blob = await carteEnImage(donneesCarte());
    telecharger(blob, `carte-boxeur-${(etat.enfant.prenom || 'stage').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-')}.png`);
  });
  const partager = $('[data-partager]');
  if (navigator.canShare) {
    partager.hidden = false;
    partager.addEventListener('click', async () => {
      try {
        const blob = await carteEnImage(donneesCarte());
        const fichier = new File([blob], 'carte-boxeur.png', { type: 'image/png' });
        if (navigator.canShare({ files: [fichier] })) {
          await navigator.share({ files: [fichier], title: 'Les Vacances des Boxeurs', text: `${etat.enfant.prenom || 'Mon enfant'} fait le stage Les Vacances des Boxeurs ${D.clubs[etat.club].a} !` });
        }
      } catch {
        /* partage annulé */
      }
    });
  }
  $('[data-agenda]').addEventListener('click', () => {
    const ics = agendaIcs(D, etat.club, etat.enfant.prenom);
    telecharger(new Blob([ics], { type: 'text/calendar;charset=utf-8' }), 'vacances-des-boxeurs.ics');
  });

  /* ---------- retours ---------- */
  $$('[data-retour]').forEach((b) => b.addEventListener('click', () => {
    const cible = b.dataset.retour;
    if (cible === 'panier') majPanier();
    aller(cible);
  }));

  /* ---------- démarrage ---------- */
  const order = params.get('order');
  const token = params.get('token');
  const retourPsp = ['paypal_return', 'payplug_return', 'scalapay_return', 'cawl_return'].some((k) => params.has(k));
  if (order && token) {
    etat.token = token;
    etat.order = { id: order };
    if (retourPsp) return confirmer(0);
    try {
      const r = await api(`/api/order?id=${encodeURIComponent(order)}&token=${encodeURIComponent(token)}`);
      charger(r.order);
      if (params.has('cancelled') && r.order.payment?.status !== 'paid') {
        nettoyerAdresse();
        if (remplirDate('p', lireSession().naissance)) majAgePaie();
        router(r.order);
        dire('Paiement annulé : vous n’avez rien réglé. Vous pouvez choisir un autre moyen de paiement.');
        return;
      }
      return router(r.order);
    } catch (e) {
      dire(`Nous ne retrouvons pas cette inscription. Vérifiez le lien reçu par e-mail ou appelez le club : ${contactClub()}.`);
      return aller('club');
    }
  }
  const clubParam = params.get('club');
  const tarifParam = params.get('tarif');
  if (D.clubs[clubParam]) etat.club = clubParam;
  else if (session.club && D.clubs[session.club]) etat.club = session.club;
  if (tarifParam === 'adherent' || tarifParam === 'non-adherent') etat.tarif = tarifParam;
  majRecap();
  majCarte();
  if (!etat.club) return aller('club');
  if (!etat.tarif) return aller('tarif');
  majTarif();
  if (etat.tarif === 'adherent') return aller('tarif');
  majPanier();
  return aller('panier');
}
