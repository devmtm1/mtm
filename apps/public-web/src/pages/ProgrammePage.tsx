import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { fetchProgramme, type LotPublic } from '../api/programmes';
import { conditionsDuLot } from '../utils/programmes';
import { useAsyncData } from '../hooks/useAsyncData';
import { usePageMetadata } from '../hooks/usePageMetadata';
import { ROUTES } from '../routes';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { ContactModal } from '../components/contact/ContactModal';
import { PageFallback } from '../components/layout/PageFallback';
import { formatMoney, formatSuperficie } from '../utils/format';

/** La grille des lots libres d'un lotissement ; chaque lot a sa fiche et sa demande de visite. */
export function ProgrammePage() {
  const { id } = useParams<{ id: string }>();
  const { data: programme, loading, error } = useAsyncData(
    () => (id ? fetchProgramme(id) : Promise.reject(new Error('Programme manquant'))),
    [id],
  );
  const [contact, setContact] = useState<LotPublic | 'programme' | null>(null);

  usePageMetadata({
    title: programme ? `${programme.nom} — lots à vendre` : 'Lotissement',
    description: programme
      ? `Lots à vendre au sein du lotissement ${programme.nom}${programme.commune ? ` à ${programme.commune}` : ''}.`
      : 'Lots à vendre au sein d’un lotissement MTM Immobilier.',
  });

  if (loading) return <PageFallback />;
  if (error || !programme) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          title="Lotissement introuvable"
          description="Ce lotissement n’a plus de lot à vendre ou a été retiré."
          action={
            <Link to={ROUTES.catalog} className="text-sm font-semibold text-mtm-primary">
              Voir le catalogue
            </Link>
          }
        />
      </div>
    );
  }

  const lieu = [programme.commune, programme.region].filter(Boolean).join(', ');
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <Link to={ROUTES.catalog} className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-mtm-muted hover:text-mtm-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Retour au catalogue
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-mtm-muted">{programme.reference}</span>
          <h1 className="mt-1 font-display text-2xl font-bold text-mtm-text sm:text-3xl">{programme.nom}</h1>
          {lieu && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-mtm-muted">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {lieu}
              {programme.localisationDetail && ` · ${programme.localisationDetail}`}
            </p>
          )}
          <p className="mt-2 text-sm text-mtm-muted">
            {programme.statutJuridique} · {programme.niveauVerification}
          </p>
        </div>
        <Button onClick={() => setContact('programme')}>Demander des informations</Button>
      </header>
      {programme.description && <p className="mt-4 max-w-3xl text-sm text-mtm-text">{programme.description}</p>}

      <h2 className="mt-8 font-display text-lg font-bold text-mtm-text">
        {programme.lots.length} lot{programme.lots.length > 1 ? 's' : ''} disponible{programme.lots.length > 1 ? 's' : ''}
      </h2>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {programme.lots.map((lot) => (
          <li key={lot.id} className="flex flex-col gap-2 rounded-2xl border border-mtm-border bg-white p-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-display text-base font-bold text-mtm-text">Lot {lot.numeroLot}</span>
              {lot.categorieLot && <span className="text-xs font-semibold text-mtm-muted">{lot.categorieLot.nom}</span>}
            </div>
            <p className="text-sm text-mtm-muted">{formatSuperficie(lot.superficie, lot.uniteSuperficie)}</p>
            <p className="text-base font-semibold text-mtm-primary">{formatMoney(lot.prixPublic)}</p>
            {conditionsDuLot(lot) && <p className="text-xs text-mtm-muted">{conditionsDuLot(lot)}</p>}
            <div className="mt-auto flex gap-2 pt-2">
              <Link to={ROUTES.terrainDetail(lot.id)} className="text-sm font-semibold text-mtm-primary hover:underline">
                Voir le lot
              </Link>
              <button type="button" className="ml-auto text-sm font-semibold text-mtm-primary hover:underline" onClick={() => setContact(lot)}>
                Demander une visite
              </button>
            </div>
          </li>
        ))}
      </ul>

      {contact && (
        <ContactModal
          title={contact === 'programme' ? 'Demander des informations' : 'Demander une visite'}
          demandeType={contact === 'programme' ? undefined : 'visite'}
          terrainId={contact === 'programme' ? undefined : contact.id}
          initialSujet={
            contact === 'programme'
              ? `Informations sur le lotissement ${programme.nom}`
              : `Visite du lot ${contact.numeroLot} — ${programme.nom}`
          }
          onClose={() => setContact(null)}
        />
      )}
    </div>
  );
}
