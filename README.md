# Stages enfants Boxing Center

Site Astro `stages.boxingcenter.fr` — Les Vacances des Boxeurs (26–31 octobre 2026).

## Demarrage

```bash
cp .env.example .env
npm install
npm run dev
```

- Front : http://127.0.0.1:5620
- API : http://127.0.0.1:5621

## Paiements (env)

| Club | Moyens |
|------|--------|
| Portet | CB CAWL, PayPal 1x, PayPal 4x (pas Scalapay) |
| Minimes | CB PayPlug, PayPal 1x, PayPal 4x, Scalapay |

Tarifs : `PRICE_GUEST_CENTS=14000`, `PRICE_MEMBER_CENTS=8000`.

## Admin studio

Page `/admin` : avec `ADMIN_TOKEN`, activer ou desactiver le **mode studio** (cookie `stg_studio`).
En studio, les paiements passent par les cles `*_TEST_*` (PayPal sandbox, PayPlug test, CAWL preprod).

## Deploy Vercel

| | |
|--|--|
| **Dashboard équipe** | https://vercel.com/angoularaphaels-projects |
| **Projet stage-boxing** | https://vercel.com/angoularaphaels-projects/stage-boxing |
| **Variables d'environnement** | https://vercel.com/angoularaphaels-projects/stage-boxing/settings/environment-variables |
| **URL prod actuelle** | https://stage-boxing.vercel.app |
| **Domaine cible** | https://stages.boxingcenter.fr |

Variables importantes en production : Supabase, Brevo (`suzinabot@gmail.com`), prestataires de paiement, **Cloudinary** (photos enfant sur la carte).

```bash
# 1. Connexion CLI (une fois)
npx vercel@latest login

# 2. Lier le projet + deployer
npx vercel@latest link --yes --project stage-boxing
npm run env:push
npm run deploy
```

Repo GitHub : https://github.com/angoularaphael/stage-boxing
