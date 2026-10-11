/** Le bouton « Agenda » : le générateur .ics de la carte de l'enfant, chargé au clic. */
export function agenda() {
  const boutons = [...document.querySelectorAll('[data-agenda]')];
  const source = document.getElementById('donnees-agenda');
  if (!boutons.length || !source) return;
  const D = JSON.parse(source.textContent);
  const note = document.querySelector('[data-agenda-note]');
  boutons.forEach((b) =>
    b.addEventListener('click', async () => {
      const club = b.dataset.agenda;
      const { agendaIcs, telecharger } = await import('./carte-enfant.js');
      telecharger(new Blob([agendaIcs(D, club)], { type: 'text/calendar;charset=utf-8' }), `stage-boxe-${club}.ics`);
      if (note) note.textContent = `Agenda ${D.clubs[club].nom} : 12 séances ajoutées au fichier. Ouvrez-le pour les importer.`;
    }),
  );
}
