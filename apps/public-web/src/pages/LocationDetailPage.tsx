import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bath,
  BedDouble,
  CalendarCheck,
  Check,
  DoorOpen,
  Globe2,
  MapPin,
  MessageSquare,
  Ruler,
  ShieldCheck,
  Sofa,
  UserCheck,
} from 'lucide-react';
import { ROUTES } from '../routes';
import { useLocation } from '../hooks/useLocations';
import { LocationGallery } from '../components/locations/LocationGallery';
import { TerrainMap } from '../components/terrains/TerrainMap';
import { ContactModal } from '../components/contact/ContactModal';
import { DemandeWhatsAppCta } from '../components/contact/DemandeWhatsAppCta';
import { TerrainDetailSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DetailActionBar } from '../components/mobile/DetailActionBar';
import { FavoriteButton } from '../components/mobile/FavoriteButton';
import { LinkButton } from '../components/ui/LinkButton';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { useSiteContact } from '../hooks/useSiteContact';
import { typeBienLabel } from '../utils/bienLabels';
import { formatSuperficie } from '../utils/format';
import {
  chambresLabel,
  disponibiliteLabel,
  formatLoyerMontant,
  locationPlace,
  locationTitle,
  sallesEauLabel,
} from '../utils/locationFormat';

type ActiveModal = 'visite' | 'infos' | null;

export function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: location, loading, error } = useLocation(id);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const contact = useSiteContact();

  const typeLabel = location ? typeBienLabel(location.type) : '';
  const titre = location ? locationTitle(location, typeLabel) : 'Annonce';
  const place = location ? locationPlace(location) : '';

  usePageMetadata({
    title: location ? [titre, place].filter(Boolean).join(' – ') : 'Annonce de location',
    description: location?.description?.slice(0, 160) ?? undefined,
  });

  if (loading) return <TerrainDetailSkeleton />;
  if (error || !location) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          title="Cette annonce n’est plus disponible"
          description={error ?? 'Le bien a été loué ou retiré de la liste. D’autres logements vous attendent.'}
          action={<LinkButton to={ROUTES.locations}>Voir les locations disponibles</LinkButton>}
        />
      </div>
    );
  }

  const chambres = chambresLabel(location.nombreChambres);
  const sallesEau = sallesEauLabel(location.nombreSallesEau);
  const libre = disponibiliteLabel(location.disponibleLe);
  const premierVersement =
    location.loyerMensuel !== null && location.montantCaution !== null
      ? location.loyerMensuel + location.montantCaution
      : null;

  const faits = [
    chambres && { icon: BedDouble, label: 'Chambres', value: chambres },
    sallesEau && { icon: Bath, label: 'Salles d’eau', value: sallesEau },
    location.nombrePieces !== null && {
      icon: DoorOpen,
      label: 'Pièces',
      value: `${location.nombrePieces} pièce${location.nombrePieces > 1 ? 's' : ''}`,
    },
    location.superficie !== null && {
      icon: Ruler,
      label: 'Surface',
      value: formatSuperficie(location.superficie, 'm²'),
    },
  ].filter((fait): fait is { icon: typeof BedDouble; label: string; value: string } => Boolean(fait));

  const message = `Bonjour, je suis intéressé(e) par la location « ${titre} » (réf. ${location.referenceInterne}).`;
  const demandeSujet = (verbe: string) => `${verbe} — ${location.referenceInterne}`;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:py-10 lg:pb-10">
      <Link
        to={ROUTES.locations}
        className="mb-6 hidden lg:inline-flex items-center gap-1.5 text-sm font-semibold text-mtm-muted transition-colors hover:text-mtm-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Retour aux locations
      </Link>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6 lg:gap-8">
          <div className="relative order-2 -mx-4 -mt-12 rounded-t-3xl bg-mtm-bg px-4 pt-5 sm:-mx-6 sm:px-6 lg:order-1 lg:mx-0 lg:mt-0 lg:rounded-none lg:bg-transparent lg:px-0 lg:pt-0">
            <span className="text-xs font-semibold uppercase tracking-wide text-mtm-muted">
              {location.referenceInterne}
            </span>
            <h1 className="mt-1 font-display text-2xl font-bold text-mtm-text sm:text-3xl">{titre}</h1>
            {place && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-mtm-muted">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {place}
              </p>
            )}
            <p className="mt-2 font-display text-2xl font-bold text-mtm-primary lg:hidden">
              {formatLoyerMontant(location.loyerMensuel)}
              <span className="ml-1 text-sm font-semibold text-mtm-muted">/ mois</span>
            </p>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-wrap lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden [&>*]:shrink-0">
              <Badge tone="primary">{typeLabel}</Badge>
              {location.meuble && (
                <Badge tone="info">
                  <Sofa className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  Meublé
                </Badge>
              )}
              <Badge tone="success">{libre}</Badge>
              {location.misEnAvant && <Badge tone="accent">À la une</Badge>}
            </div>
          </div>

          <LocationGallery
            medias={location.medias}
            alt={titre}
            className="order-1 -mx-4 sm:-mx-6 lg:mx-0 lg:order-2"
            overlay={<FavoriteButton kind="location" id={location.id} label={titre} className="h-10 w-10" />}
          />

          <div className="order-3 flex flex-col gap-6 lg:gap-8">

          {faits.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="L’essentiel">
              {faits.map(({ icon: Icon, label, value }) => (
                <li
                  key={label}
                  className="flex flex-col items-start gap-1 rounded-xl border border-mtm-border bg-mtm-surface p-4 shadow-card"
                >
                  <Icon className="h-5 w-5 text-mtm-primary" aria-hidden="true" />
                  <span className="text-xs text-mtm-muted">{label}</span>
                  <span className="text-sm font-bold text-mtm-text">{value}</span>
                </li>
              ))}
            </ul>
          )}

          {location.description && (
            <section>
              <h2 className="font-display text-lg font-bold text-mtm-text">Description</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-mtm-muted">
                {location.description}
              </p>
            </section>
          )}

          {location.equipements.length > 0 && (
            <section>
              <h2 className="font-display text-lg font-bold text-mtm-text">Équipements et prestations</h2>
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {location.equipements.map((equipement) => (
                  <li key={equipement} className="flex items-center gap-2 text-sm text-mtm-text">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mtm-success/10 text-mtm-success">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    {equipement}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {location.latitude !== null && location.longitude !== null && (
            <section>
              <h2 className="font-display text-lg font-bold text-mtm-text">Localisation</h2>
              <p className="mt-1 text-xs text-mtm-muted">
                Position approximative : l’adresse exacte est communiquée lors de la visite.
              </p>
              <div className="mt-3">
                <TerrainMap latitude={location.latitude} longitude={location.longitude} title={place || titre} />
              </div>
            </section>
          )}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-mtm-border bg-mtm-surface p-5 shadow-card lg:sticky lg:top-24 lg:rounded-xl lg:p-6">
          <p className="hidden text-xs font-semibold uppercase tracking-wide text-mtm-muted lg:block">Loyer mensuel</p>
          <p className="mt-1 hidden font-display text-3xl font-bold text-mtm-primary lg:block">
            {formatLoyerMontant(location.loyerMensuel)}
          </p>
          <h2 className="font-display text-lg font-bold text-mtm-text lg:hidden">Conditions de location</h2>

          <dl className="mt-3 flex flex-col gap-2 border-t border-mtm-border pt-4 text-sm lg:mt-4">
            {location.charges !== null && location.charges > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-mtm-muted">Charges</dt>
                <dd className="font-semibold text-mtm-text">{formatLoyerMontant(location.charges)} / mois</dd>
              </div>
            )}
            {location.montantCaution !== null && (
              <div className="flex justify-between gap-4">
                <dt className="text-mtm-muted">
                  Caution
                  {location.moisCaution !== null && ` (${location.moisCaution} mois)`}
                </dt>
                <dd className="font-semibold text-mtm-text">{formatLoyerMontant(location.montantCaution)}</dd>
              </div>
            )}
            {premierVersement !== null && (
              <div className="mt-1 flex justify-between gap-4 rounded-md bg-mtm-primary-subtle px-3 py-2">
                <dt className="font-semibold text-mtm-primary">À l’entrée</dt>
                <dd className="font-bold text-mtm-primary">{formatLoyerMontant(premierVersement)}</dd>
              </div>
            )}
          </dl>
          {premierVersement !== null && (
            <p className="mt-2 text-xs text-mtm-muted">Premier loyer et caution. Les modalités sont confirmées au bail.</p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <Button onClick={() => setActiveModal('visite')}>
              <CalendarCheck className="h-4 w-4" aria-hidden="true" />
              Demander une visite
            </Button>
            <Button variant="secondary" onClick={() => setActiveModal('infos')}>
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              Poser une question
            </Button>
          </div>

          <ul className="mt-6 flex flex-col gap-2 border-t border-mtm-border pt-5 text-sm text-mtm-muted">
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-mtm-success" aria-hidden="true" />
              Bien suivi et contrôlé par MTM Immobilier
            </li>
            <li className="flex items-start gap-2">
              <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-mtm-success" aria-hidden="true" />
              Visite et démarches possibles à distance
            </li>
            <li className="flex items-start gap-2">
              <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-mtm-success" aria-hidden="true" />
              Un interlocuteur dédié jusqu’à la remise des clés
            </li>
          </ul>
        </aside>
      </div>

      {/* Mobile : le loyer et l'action principale restent sous le pouce. */}
      <DetailActionBar label="Loyer / mois" price={formatLoyerMontant(location.loyerMensuel)}>
        <Button className="px-4" onClick={() => setActiveModal('visite')}>
          <CalendarCheck className="h-4 w-4" aria-hidden="true" />
          Visiter
        </Button>
      </DetailActionBar>

      {activeModal === 'visite' && (
        <ContactModal
          title="Demander une visite"
          demandeType="visite"
          bienLocatifId={location.id}
          initialSujet={demandeSujet('Visite')}
          intro={<DemandeWhatsAppCta numero={contact.whatsapp} message={message} />}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'infos' && (
        <ContactModal
          title="Poser une question"
          bienLocatifId={location.id}
          initialSujet={demandeSujet('Informations')}
          intro={<DemandeWhatsAppCta numero={contact.whatsapp} message={message} />}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}
