# Envoi mail adhérents stage — prem-eu2:20405

Panel Bothosting : `prem-eu2.bot-hosting.net:20405` — startup `node index.js`.

## Fichiers dans `/home/container`

- `index.js` (ce dossier)
- `.env` : `BREVO_API_KEY`, `BREVO_SENDER_EMAIL=suzinabot@gmail.com`, `BREVO_REPLY_TO=boxingcentertls@gmail.com`
- `data/membres (20).csv` et `data/membres (15).xls` (exports Deciplus)
- Optionnel : `CAMPAIGN_START=15:00`, `CAMPAIGN_END=17:30`, `CAMPAIGN_NOW=1` (demarrage immediat), `MEMBRES_DATA_DIR=/home/container/data`

Le script clone `stage-boxing` (main) et lance `scripts/send-mail-adherents-campaign.mjs`.
