/* Guide d'utilisation MTM — navigation par chapitre, recherche et choix du métier.
 * Aucun script en ligne : la politique de sécurité du back-office n'autorise que 'self'. */
(function () {
  'use strict';

  var racine = document.documentElement;
  racine.classList.add('js');

  var chapitres = Array.prototype.slice.call(document.querySelectorAll('.chapitre'));
  var liens = Array.prototype.slice.call(document.querySelectorAll('.sommaire a[data-chapitre]'));
  var contenu = document.getElementById('contenu');
  var sommaire = document.getElementById('sommaire');
  var champRecherche = document.getElementById('recherche');
  var choixProfil = document.getElementById('profil');
  var resultats = document.getElementById('resultats-recherche');
  var CLE_PROFIL = 'mtm-manuel-profil';
  /* Le chapitre à ouvrir en premier pour chaque métier. */
  var PRINCIPAL = {
    commercial: 'commercial',
    responsable_commercial: 'responsable-commercial',
    direction: 'direction',
    comptabilite: 'comptabilite',
    gestion_locative: 'gestion-locative',
    verifications: 'verifications',
    chantiers: 'chantiers',
    administrateur: 'administration',
    rh: 'premiers-pas'
  };

  function lire(cle) {
    try {
      return window.localStorage.getItem(cle);
    } catch (e) {
      return null;
    }
  }

  function ecrire(cle, valeur) {
    try {
      window.localStorage.setItem(cle, valeur);
    } catch (e) {
      /* stockage indisponible : le choix n'est simplement pas retenu */
    }
  }

  function normaliser(texte) {
    return texte
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  /* ------------------------------------------------------------ chapitres */
  function idChapitre(hash) {
    var h = (hash || '').replace(/^#/, '');
    if (!h) return chapitres[0].id;
    var existant = document.getElementById(h);
    if (!existant) return chapitres[0].id;
    var parent = existant.closest('.chapitre');
    return parent ? parent.id : chapitres[0].id;
  }

  function afficher(id, defiler) {
    chapitres.forEach(function (c) {
      c.classList.toggle('est-actif', c.id === id);
    });
    liens.forEach(function (a) {
      if (a.getAttribute('data-chapitre') === id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    var actif = document.getElementById(id);
    if (actif) document.title = actif.getAttribute('data-titre') + ' — Guide d’utilisation MTM';
    if (sommaire) sommaire.classList.remove('est-ouvert');
    if (defiler) window.scrollTo(0, 0);
  }

  function surHash() {
    var id = idChapitre(window.location.hash);
    afficher(id, false);
    var cible = window.location.hash && document.getElementById(window.location.hash.slice(1));
    if (cible && cible.id !== id) cible.scrollIntoView();
    else if (!cible || cible.id === id) window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', surHash);
  surHash();

  /* --------------------------------------------------------------- profil */
  function appliquerProfil(profil) {
    liens.forEach(function (a) {
      var roles = (a.getAttribute('data-roles') || '').split(' ');
      var conseille = profil && profil !== 'tous' && (roles.indexOf(profil) !== -1 || roles.indexOf('tous') !== -1);
      a.classList.toggle('est-conseille', !!conseille && roles.indexOf('tous') === -1);
    });
  }

  if (choixProfil) {
    var memorise = lire(CLE_PROFIL);
    if (memorise) choixProfil.value = memorise;
    appliquerProfil(choixProfil.value);
    choixProfil.addEventListener('change', function () {
      ecrire(CLE_PROFIL, choixProfil.value);
      appliquerProfil(choixProfil.value);
      var cible = PRINCIPAL[choixProfil.value];
      if (cible && choixProfil.value !== 'tous') window.location.hash = cible;
    });
  }

  /* ------------------------------------------------------------- recherche */
  var index = chapitres.map(function (c) {
    return { id: c.id, texte: normaliser(c.textContent || '') };
  });

  function effacerSurlignage() {
    Array.prototype.slice.call(contenu.querySelectorAll('mark')).forEach(function (m) {
      var parent = m.parentNode;
      parent.replaceChild(document.createTextNode(m.textContent), m);
      parent.normalize();
    });
  }

  function surligner(noeud, mot) {
    if (noeud.nodeType === 3) {
      var position = normaliser(noeud.nodeValue).indexOf(mot);
      if (position >= 0) {
        var milieu = noeud.splitText(position);
        milieu.splitText(mot.length);
        var marque = document.createElement('mark');
        milieu.parentNode.replaceChild(marque, milieu);
        marque.appendChild(milieu);
        return 1;
      }
      return 0;
    }
    if (noeud.nodeType === 1 && !/^(script|style|mark|table)$/i.test(noeud.nodeName)) {
      var n = 0;
      Array.prototype.slice.call(noeud.childNodes).forEach(function (enfant) {
        if (n < 40) n += surligner(enfant, mot);
      });
      return n;
    }
    return 0;
  }

  function chercher() {
    var requete = normaliser((champRecherche.value || '').trim());
    effacerSurlignage();
    if (requete.length < 2) {
      liens.forEach(function (a) {
        a.classList.remove('est-masque');
      });
      resultats.hidden = true;
      return;
    }
    var mots = requete.split(/\s+/).filter(Boolean);
    var trouves = index.filter(function (entree) {
      return mots.every(function (m) {
        return entree.texte.indexOf(m) !== -1;
      });
    });
    var ids = trouves.map(function (t) {
      return t.id;
    });
    liens.forEach(function (a) {
      a.classList.toggle('est-masque', ids.indexOf(a.getAttribute('data-chapitre')) === -1);
    });
    resultats.hidden = false;
    if (!trouves.length) {
      resultats.textContent = 'Aucun chapitre ne contient « ' + champRecherche.value.trim() + ' ». Essayez un autre mot.';
      return;
    }
    resultats.textContent =
      trouves.length + ' chapitre' + (trouves.length > 1 ? 's contiennent' : ' contient') + ' « ' + champRecherche.value.trim() + ' ». Ouvrez-en un dans le menu : les mots sont surlignés.';
    var actif = document.querySelector('.chapitre.est-actif');
    if (!actif || ids.indexOf(actif.id) === -1) afficher(ids[0], false);
    var courant = document.querySelector('.chapitre.est-actif');
    if (courant) surligner(courant, mots[0]);
  }

  if (champRecherche) {
    var minuteur;
    champRecherche.addEventListener('input', function () {
      window.clearTimeout(minuteur);
      minuteur = window.setTimeout(chercher, 200);
    });
    liens.forEach(function (a) {
      a.addEventListener('click', function () {
        if ((champRecherche.value || '').trim().length >= 2) {
          window.setTimeout(function () {
            var courant = document.querySelector('.chapitre.est-actif');
            effacerSurlignage();
            var mots = normaliser(champRecherche.value.trim()).split(/\s+/);
            if (courant) surligner(courant, mots[0]);
          }, 30);
        }
      });
    });
  }

  /* ------------------------------------------------------- menu (mobile) */
  var bouton = document.getElementById('bouton-menu');
  if (bouton && sommaire) {
    bouton.addEventListener('click', function () {
      sommaire.classList.toggle('est-ouvert');
    });
  }

  /* Raccourci : « / » place le curseur dans la recherche. */
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && champRecherche && document.activeElement !== champRecherche && !/input|textarea|select/i.test(document.activeElement.nodeName)) {
      e.preventDefault();
      champRecherche.focus();
    }
  });
})();
