import type { ReactNode } from 'react';
import { PageIntro } from '../components/layout/PageIntro';
import { useSiteContact } from '../hooks/useSiteContact';
import { usePageMetadata } from '../hooks/usePageMetadata';

/**
 * Pages légales. Les informations d'identification de la société que seule
 * MTM connaît (NINEA, RCCM, directeur de publication) restent signalées
 * « à compléter » : elles ne doivent pas être inventées. Le texte est à faire
 * valider par un juriste sénégalais avant l'ouverture au public (cahier des
 * charges, section 28).
 */
const A_COMPLETER = '[à compléter par MTM]';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-bold text-mtm-text">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-mtm-muted">{children}</div>
    </section>
  );
}

function LegalLayout({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <div>
      <PageIntro eyebrow={eyebrow} title={title} />
      <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">{children}</div>
    </div>
  );
}

export function MentionsLegalesPage() {
  const contact = useSiteContact();
  usePageMetadata({
    title: 'Mentions légales',
    description: 'Éditeur, hébergement et propriété intellectuelle du site MTM Immobilier.',
  });

  return (
    <LegalLayout eyebrow="Informations légales" title="Mentions légales">
      <Section title="Éditeur du site">
        <p>
          MTM Immobilier
          <br />
          Adresse : {contact.adresse}
          <br />
          Téléphone : {contact.telephone}
          <br />
          E-mail : {contact.email}
        </p>
        <p>
          NINEA : {A_COMPLETER}
          <br />
          RCCM : {A_COMPLETER}
          <br />
          Directeur de la publication : {A_COMPLETER}
        </p>
      </Section>

      <Section title="Hébergement">
        <p>
          Le site est servi par Cloudflare (Cloudflare, Inc., États-Unis). Les données de la
          plateforme sont traitées par l’interface de programmation hébergée chez Render
          (Allemagne) et enregistrées dans une base de données Neon (Allemagne). Les images et
          documents sont stockés chez Cloudinary.
        </p>
      </Section>

      <Section title="Propriété intellectuelle">
        <p>
          Les textes, visuels, logos et vidéos du site appartiennent à MTM Immobilier ou à leurs
          auteurs. Toute reproduction sans autorisation écrite préalable est interdite.
        </p>
      </Section>

      <Section title="Informations sur les biens">
        <p>
          Les fiches de terrains et de villas sont fournies à titre informatif. Les prix, surfaces
          et statuts juridiques sont donnés sous réserve de vérification ; seul un contrat signé
          engage MTM Immobilier.
        </p>
      </Section>
    </LegalLayout>
  );
}

export function ConfidentialitePage() {
  const contact = useSiteContact();
  usePageMetadata({
    title: 'Confidentialité et données personnelles',
    description: 'Comment MTM Immobilier collecte, utilise et protège vos données personnelles.',
  });

  return (
    <LegalLayout eyebrow="Vos données" title="Confidentialité et données personnelles">
      <Section title="Qui est responsable de vos données ?">
        <p>
          MTM Immobilier, {contact.adresse}. Pour toute question sur vos données : {contact.email}.
        </p>
      </Section>

      <Section title="Quelles données collectons-nous, et pourquoi ?">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Formulaire de contact et demandes de visite ou d’information</strong> : nom, adresse
            e-mail, téléphone, pays de résidence et message, pour répondre à votre demande.
          </li>
          <li>
            <strong>Demande de réservation</strong> : mêmes informations ainsi que le bien concerné, pour
            traiter votre réservation.
          </li>
          <li>
            <strong>Espace client</strong> : identifiants de connexion, dossiers, documents (contrats,
            reçus, rapports de vérification, pièces transmises) et échanges, pour suivre votre dossier.
          </li>
          <li>
            <strong>Données techniques de connexion</strong> (adresse IP, navigateur) : sécurité du
            service et journal des actions sur les comptes.
          </li>
        </ul>
        <p>Nous ne vendons pas vos données et ne les utilisons pas à d’autres fins que celles ci-dessus.</p>
      </Section>

      <Section title="Qui y a accès ?">
        <p>
          Les collaborateurs de MTM Immobilier habilités, selon leur rôle. Nos prestataires techniques
          traitent les données pour notre compte : hébergement (Cloudflare, Render, Neon), stockage de
          fichiers (Cloudinary) et envoi d’e-mails (Brevo). Certains sont établis hors du Sénégal.
        </p>
      </Section>

      <Section title="Combien de temps ?">
        <p>
          Les demandes de contact sont conservées le temps de leur traitement puis pendant la durée
          nécessaire au suivi commercial. Les documents contractuels et comptables sont conservés pour
          la durée imposée par la loi. Durées détaillées : {A_COMPLETER}.
        </p>
      </Section>

      <Section title="Vos droits">
        <p>
          Vous pouvez demander l’accès à vos données, leur rectification, leur suppression ou vous
          opposer à leur traitement, en écrivant à {contact.email}. Vous pouvez aussi saisir la
          Commission de protection des données personnelles (CDP) du Sénégal.
        </p>
      </Section>

      <Section title="Sécurité">
        <p>
          Connexions chiffrées, accès par rôle, double authentification pour les comptes sensibles,
          liens de documents temporaires et journal des actions. Aucun système n’étant infaillible,
          signalez-nous toute anomalie à {contact.email}.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          Le site utilise uniquement le stockage nécessaire à son fonctionnement (session de l’espace
          client). Il n’utilise pas de cookies publicitaires ni de mesure d’audience tierce.
        </p>
      </Section>
    </LegalLayout>
  );
}
