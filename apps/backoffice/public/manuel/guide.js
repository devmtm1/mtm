/* Guides par métier : impression, sommaire mobile, repérage de la partie lue.
   Aucun script en ligne : la politique de sécurité du back-office n'autorise que 'self'. */
(function () {
  'use strict';

  // Imprimer ou enregistrer en PDF.
  var imprimer = document.querySelector('[data-imprimer]');
  if (imprimer) imprimer.addEventListener('click', function () { window.print(); });

  // Sommaire sur téléphone : s'ouvre et se referme au clic.
  var sommaire = document.getElementById('sommaire');
  var bouton = document.getElementById('bouton-sommaire');
  if (sommaire && bouton) {
    bouton.addEventListener('click', function () {
      var ouvert = sommaire.classList.toggle('est-ouvert');
      bouton.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    });
    sommaire.addEventListener('click', function (e) {
      if (e.target.closest('a')) sommaire.classList.remove('est-ouvert');
    });
  }

  // La partie en cours de lecture est surlignée dans le sommaire.
  var liens = {};
  document.querySelectorAll('.sommaire a').forEach(function (a) {
    liens[a.getAttribute('href').slice(1)] = a;
  });
  var titres = Array.prototype.slice.call(document.querySelectorAll('.document h2'));
  if (!('IntersectionObserver' in window) || titres.length === 0) return;

  var courant = null;
  var observateur = new IntersectionObserver(
    function (entrees) {
      entrees.forEach(function (entree) {
        if (!entree.isIntersecting) return;
        var lien = liens[entree.target.id];
        if (!lien || lien === courant) return;
        if (courant) courant.removeAttribute('aria-current');
        lien.setAttribute('aria-current', 'true');
        courant = lien;
      });
    },
    { rootMargin: '-80px 0px -70% 0px' }
  );
  titres.forEach(function (titre) { observateur.observe(titre); });
})();
