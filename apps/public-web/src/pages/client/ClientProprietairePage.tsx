import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CalendarCheck, Home, KeyRound, MessageSquare, TrendingUp, Wallet } from 'lucide-react';
import { useClientData } from '../../contexts/client-data-store';
import { usePageMetadata } from '../../hooks/usePageMetadata';
import { ClientCard, ClientPageHeader, ClientRow, StatTile } from '../../components/client/shell/ClientUi';
import { ShowMoreButton } from '../../components/client/shell/Disclosure';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { documentIcone } from '../../utils/documentIcon';
import { formatDate, formatMoney } from '../../utils/format';
import { ROUTES } from '../../routes';
import type { ClientBienLocatif } from '../../types/locatif';
import {
  bienLocatifStatus,
  locatifDocumentType,
  occupationNuit,
  sejourStatus,
  situationPaiement,
} from '../../utils/labels';

/** Libellé et valeur, alignés en colonne. */
function Fait({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-mtm-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold text-mtm-text">
        {value}
        {hint && <span className="ml-1 text-xs font-normal text-mtm-muted">{hint}</span>}
      </dd>
    </div>
  );
}

const TYPES_IMMEUBLE: Record<string, string> = { villa: 'Villa', immeuble: 'Immeuble', residence: 'Résidence', autre: 'Propriété' };

/** Lien vers une nouvelle demande, déjà orientée sur ce bien : le client n'a pas à le décrire. */
function QuestionSurBien({ reference }: { reference: string }) {
  return (
    <Link
      to={`${ROUTES.clientDemandes}?bien=${encodeURIComponent(reference)}`}
      className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-mtm-primary hover:underline"
    >
      <MessageSquare className="h-4 w-4" aria-hidden="true" />
      Une question sur ce bien
    </Link>
  );
}

/** Ce qui se passe sur un bien : séjours en courte durée, bail en cours, ou rien (aucune ligne superflue). */
function DetailBien({ bien }: { bien: ClientBienLocatif }) {
  if (bien.modeLocation === 'courte_duree') {
    return bien.sejours.length > 0 ? (
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-mtm-muted">
          Séjours · {formatMoney(bien.sejoursEncaisses)} encaissés
        </p>
        <ul className="flex flex-col divide-y divide-mtm-border">
          {bien.sejours.map((sejour) => {
            const etat = sejourStatus(sejour.statut);
            return (
              <li key={sejour.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-mtm-text">
                    {formatDate(sejour.dateArrivee)} → {formatDate(sejour.dateDepart)} · {sejour.nuits} nuit
                    {sejour.nuits > 1 ? 's' : ''}
                  </p>
                  <p className="text-mtm-muted">{sejour.voyageur}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-mtm-text">{formatMoney(sejour.montantTotal)}</span>
                  <Badge tone={etat.tone}>{etat.label}</Badge>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    ) : (
      <p className="text-sm text-mtm-muted">Aucun séjour confirmé pour l’instant.</p>
    );
  }
  if (!bien.bail) return null;
  return (
    <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
      <Fait label="Locataire" value={bien.bail.locataire ?? '—'} />
      <Fait label="Loyer mensuel" value={formatMoney(bien.bail.loyerMensuel)} />
      <Fait label="Encaissé" value={formatMoney(bien.bail.loyersEncaisses)} />
      <Fait
        label="Solde"
        value={formatMoney(bien.bail.solde)}
        hint={bien.bail.preavisDepartPrevu ? `départ le ${formatDate(bien.bail.preavisDepartPrevu)}` : undefined}
      />
    </dl>
  );
}

/** Les pastilles d'état d'un bien : « Courte durée », libre / occupé / loué, situation du paiement. */
function EtatsBien({ bien }: { bien: ClientBienLocatif }) {
  const courteDuree = bien.modeLocation === 'courte_duree';
  // En courte durée, le bien reste « disponible » faute de bail : on dit plutôt s'il est occupé.
  const statut = courteDuree && bien.occupation ? occupationNuit(bien.occupation) : bienLocatifStatus(bien.statut);
  const situation = bien.bail ? situationPaiement(bien.bail.situationPaiement) : null;
  return (
    <div className="flex flex-none flex-wrap gap-2">
      {courteDuree && <Badge tone="neutral">Courte durée</Badge>}
      <Badge tone={statut.tone}>{statut.label}</Badge>
      {situation && <Badge tone={situation.tone}>{situation.label}</Badge>}
    </div>
  );
}

/** Un bien qui n'appartient à aucune propriété : une carte complète. */
function CarteBien({ bien }: { bien: ClientBienLocatif }) {
  return (
    <ClientCard>
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2.5 font-display text-base font-bold text-mtm-text">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary">
                <Building2 className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              {bien.adresse}
            </h2>
            <p className="mt-0.5 text-sm text-mtm-muted">
              {[bien.commune, bien.region].filter(Boolean).join(', ')} · {bien.referenceInterne}
            </p>
          </div>
          <EtatsBien bien={bien} />
        </div>
        <DetailBien bien={bien} />
        <QuestionSurBien reference={bien.referenceInterne} />
      </div>
    </ClientCard>
  );
}

/** Une propriété (villa, immeuble, résidence) et ses logements : une seule carte, un logement par ligne. */
function CartePropriete({ nom, type, logements }: { nom: string; type: string; logements: ClientBienLocatif[] }) {
  const loues = logements.filter((bien) => bien.bail || bien.occupation === 'occupe').length;
  const premier = logements[0];
  return (
    <ClientCard>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary">
            <Home className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-mtm-text">{nom}</h2>
            <p className="text-sm text-mtm-muted">
              {TYPES_IMMEUBLE[type] ?? 'Propriété'} · {[premier.commune, premier.region].filter(Boolean).join(', ')} ·{' '}
              {logements.length} logement{logements.length > 1 ? 's' : ''}, {loues} loué{loues > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <ul className="flex flex-col divide-y divide-mtm-border rounded-xl border border-mtm-border/70">
          {logements.map((bien) => (
            <li key={bien.id} className="flex flex-col gap-2.5 px-3.5 py-3">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-semibold text-mtm-text">
                  {bien.numeroLot ? `Logement ${bien.numeroLot}` : bien.referenceInterne}
                  {bien.numeroLot && <span className="ml-2 text-xs font-normal text-mtm-muted">{bien.referenceInterne}</span>}
                </p>
                <EtatsBien bien={bien} />
              </div>
              <DetailBien bien={bien} />
            </li>
          ))}
        </ul>
        <QuestionSurBien reference={premier.referenceInterne} />
      </div>
    </ClientCard>
  );
}

/**
 * Espace propriétaire (section 15 du cahier des charges) : les biens confiés,
 * le locataire en place, les loyers appelés et encaissés, le solde restant et
 * les relevés de gestion publiés par MTM.
 *
 * Les dépenses engagées pour le compte du propriétaire relèvent du module
 * comptabilité (J3.1) : elles compléteront ce solde en solde net.
 */
export function ClientProprietairePage() {
  const { proprietaireBiens, proprietaireSynthese, proprietaireDocuments, proprietaireLoading } =
    useClientData();
  usePageMetadata({ title: 'Mon bien' });
  const biens = proprietaireBiens ?? [];
  const documents = proprietaireDocuments ?? [];
  const [tousReleves, setTousReleves] = useState(false);
  const relevesVisibles = tousReleves ? documents : documents.slice(0, 4);

  // Les logements d'une même propriété sont regroupés ; les biens seuls gardent leur carte. L'ordre d'arrivée est conservé.
  const cartes = useMemo(() => {
    const parPropriete = new Map<string, ClientBienLocatif[]>();
    const ordre: ({ bien: ClientBienLocatif } | { propriete: string })[] = [];
    for (const bien of proprietaireBiens ?? []) {
      if (!bien.immeuble) {
        ordre.push({ bien });
        continue;
      }
      const deja = parPropriete.get(bien.immeuble.id);
      if (deja) deja.push(bien);
      else {
        parPropriete.set(bien.immeuble.id, [bien]);
        ordre.push({ propriete: bien.immeuble.id });
      }
    }
    for (const logements of parPropriete.values()) {
      logements.sort((a, b) =>
        (a.numeroLot ?? a.referenceInterne).localeCompare(b.numeroLot ?? b.referenceInterne, 'fr', { numeric: true }),
      );
    }
    return { ordre, parPropriete };
  }, [proprietaireBiens]);
  const activite = proprietaireSynthese
    ? proprietaireSynthese.loues > 0 ||
      proprietaireSynthese.loyersDus > 0 ||
      proprietaireSynthese.biensALaNuit > 0 ||
      proprietaireSynthese.sejoursEncaisses > 0
    : false;

  if (proprietaireLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (biens.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <ClientPageHeader title="Mon bien" />
        <EmptyState
          icon={Building2}
          title="Aucun bien confié pour l'instant"
          description="Dès qu'un bien vous appartenant sera enregistré par MTM, il apparaîtra ici avec le suivi des loyers et votre solde."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ClientPageHeader
        title="Mon bien"
        description={`${biens.length} bien${biens.length > 1 ? 's' : ''} confié${biens.length > 1 ? 's' : ''} à MTM${
          cartes.parPropriete.size > 0 ? `, dont ${cartes.parPropriete.size} propriété${cartes.parPropriete.size > 1 ? 's' : ''} à plusieurs logements` : ''
        }.`}
      />

      {/* Le portefeuille en quatre chiffres. */}
      {proprietaireSynthese && activite && (
        <section aria-label="Ma gérance" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            icon={KeyRound}
            value={`${proprietaireSynthese.loues} / ${proprietaireSynthese.biens}`}
            label={proprietaireSynthese.biensALaNuit > 0 ? 'Biens loués ou occupés' : 'Biens loués'}
          />
          <StatTile icon={TrendingUp} value={formatMoney(proprietaireSynthese.loyersDus)} label="Loyers appelés" />
          <StatTile icon={Wallet} value={formatMoney(proprietaireSynthese.loyersEncaisses)} label="Loyers encaissés" tone="success" />
          <StatTile
            icon={Wallet}
            value={formatMoney(proprietaireSynthese.solde)}
            label={
              proprietaireSynthese.echeancesImpayees > 0
                ? `À recouvrer · ${proprietaireSynthese.echeancesImpayees} échéance${proprietaireSynthese.echeancesImpayees > 1 ? 's' : ''}`
                : 'À recouvrer'
            }
            tone={proprietaireSynthese.solde > 0 ? 'warning' : 'neutral'}
          />
          {proprietaireSynthese.biensALaNuit > 0 && (
            <>
              <StatTile
                icon={CalendarCheck}
                value={String(proprietaireSynthese.sejoursAVenir)}
                label={`Séjour${proprietaireSynthese.sejoursAVenir > 1 ? 's' : ''} à venir`}
              />
              <StatTile
                icon={Wallet}
                value={formatMoney(proprietaireSynthese.sejoursEncaisses)}
                label="Séjours encaissés"
                tone="success"
              />
            </>
          )}
        </section>
      )}

      {proprietaireSynthese && !activite && (
        <p className="rounded-2xl border border-mtm-border/70 bg-mtm-surface px-4 py-3 text-sm text-mtm-muted shadow-card lg:rounded-lg">
          Vos biens sont suivis par MTM. Les loyers encaissés et votre solde apparaîtront ici dès la signature d’un premier bail.
        </p>
      )}

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        {cartes.ordre.map((entree) => {
          if ('bien' in entree) return <CarteBien key={entree.bien.id} bien={entree.bien} />;
          const logements = cartes.parPropriete.get(entree.propriete) ?? [];
          const immeuble = logements[0]?.immeuble;
          return immeuble ? (
            <CartePropriete key={immeuble.id} nom={immeuble.nom} type={immeuble.type} logements={logements} />
          ) : null;
        })}
      </div>

      {documents.length > 0 && (
        <ClientCard title="Mes relevés et documents">
          <ul className="-my-1">
            {relevesVisibles.map((document) => (
              <li key={document.id}>
                <ClientRow
                  href={document.secureUrl}
                  icon={documentIcone(document.type)}
                  title={document.title ?? locatifDocumentType(document.type)}
                  subtitle={`${document.bailLocatif.bienLocatif.referenceInterne} · ${formatDate(document.createdAt)}`}
                />
              </li>
            ))}
          </ul>
          <ShowMoreButton
            hiddenCount={documents.length - relevesVisibles.length}
            expanded={tousReleves}
            onToggle={() => setTousReleves((ouvert) => !ouvert)}
            noun="documents"
          />
        </ClientCard>
      )}
    </div>
  );
}
