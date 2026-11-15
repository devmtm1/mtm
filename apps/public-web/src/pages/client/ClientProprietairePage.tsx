import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CalendarCheck, ChevronRight, Home, KeyRound, MessageSquare, TrendingUp, Wallet } from 'lucide-react';
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

const TYPES_IMMEUBLE: Record<string, string> = { villa: 'Villa', immeuble: 'Immeuble', residence: 'Résidence', autre: 'Propriété' };

/** Colonnes du tableau des logements : identiques en-tête et lignes, pour que tout s'aligne. */
const COLONNES = 'md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)_repeat(3,minmax(0,1fr))_minmax(0,1.1fr)]';

/** Vignette du bien : sa photo d'annonce si elle existe, sinon l'icône du bien. */
function Vignette({ photo }: { photo?: string | null }) {
  const [enEchec, setEnEchec] = useState(false);
  if (photo && !enEchec) {
    return <img src={photo} alt="" loading="lazy" onError={() => setEnEchec(true)} className="h-11 w-11 shrink-0 rounded-lg border border-mtm-border object-cover" />;
  }
  return (
    <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-mtm-primary-subtle text-mtm-primary">
      <Building2 className="h-5 w-5" />
    </span>
  );
}

/** Une cellule du tableau : sur mobile, son libellé s'affiche au-dessus ; sur ordinateur, l'en-tête de colonne suffit. */
function Cellule({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={'min-w-0 ' + className}>
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-mtm-muted md:hidden">{label}</p>
      <div className="text-sm font-semibold text-mtm-text">{children}</div>
    </div>
  );
}

/** Les pastilles d'état d'un bien, à point comme au back-office : « Courte durée », libre / occupé / loué, situation du paiement. */
function EtatsBien({ bien }: { bien: ClientBienLocatif }) {
  const courteDuree = bien.modeLocation === 'courte_duree';
  // En courte durée, le bien reste « disponible » faute de bail : on dit plutôt s'il est occupé.
  const statut = courteDuree && bien.occupation ? occupationNuit(bien.occupation) : bienLocatifStatus(bien.statut);
  const situation = bien.bail ? situationPaiement(bien.bail.situationPaiement) : null;
  // Pour un propriétaire, « disponible » veut dire « à louer » : c'est ce qu'il attend de MTM.
  const etiquette = !courteDuree && bien.statut === 'disponible' ? 'À louer' : statut.label;
  return (
    <div className="flex flex-wrap gap-1.5">
      {courteDuree && <Badge tone="neutral">Courte durée</Badge>}
      <Badge tone={statut.tone} dot>
        {etiquette}
      </Badge>
      {situation && (
        <Badge tone={situation.tone} dot>
          {situation.label}
        </Badge>
      )}
    </div>
  );
}

/** Les séjours d'un bien en courte durée : liste sous la ligne du bien. */
function SejoursBien({ bien }: { bien: ClientBienLocatif }) {
  if (bien.modeLocation !== 'courte_duree') return null;
  if (bien.sejours.length === 0) {
    return <p className="px-4 pb-3.5 text-sm text-mtm-muted sm:px-5">Aucun séjour confirmé pour l’instant.</p>;
  }
  return (
    <div className="px-4 pb-4 sm:px-5">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.1em] text-mtm-muted">
        Séjours · {formatMoney(bien.sejoursEncaisses)} encaissés
      </p>
      <ul className="flex flex-col divide-y divide-mtm-border rounded-xl border border-mtm-border bg-mtm-bg/60 px-3">
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
                <Badge tone={etat.tone} dot>
                  {etat.label}
                </Badge>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Une ligne du tableau : le bien, son locataire, ses trois montants et son état. */
function LigneBien({ bien, titre }: { bien: ClientBienLocatif; titre: ReactNode }) {
  const bail = bien.bail;
  const enNuits = bien.modeLocation === 'courte_duree';
  return (
    <li className="border-t border-mtm-border first:border-t-0">
      <div className={'grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3.5 sm:px-5 md:items-center ' + COLONNES}>
        <div className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
          <Vignette photo={bien.photo} />
          <div className="min-w-0">{titre}</div>
        </div>
        <Cellule label="Locataire">{bail?.locataire ?? <span className="font-normal text-mtm-muted">—</span>}</Cellule>
        <Cellule label="Loyer mensuel">
          {bail ? formatMoney(bail.loyerMensuel) : <span className="font-normal text-mtm-muted">—</span>}
        </Cellule>
        <Cellule label="Encaissé">
          {bail ? formatMoney(bail.loyersEncaisses) : enNuits ? formatMoney(bien.sejoursEncaisses) : <span className="font-normal text-mtm-muted">—</span>}
        </Cellule>
        <Cellule label="Solde">
          {bail ? (
            <span className={bail.solde > 0 ? 'text-mtm-accent' : ''}>
              {formatMoney(bail.solde)}
              {bail.preavisDepartPrevu && (
                <span className="block text-xs font-normal text-mtm-muted">départ le {formatDate(bail.preavisDepartPrevu)}</span>
              )}
            </span>
          ) : (
            <span className="font-normal text-mtm-muted">—</span>
          )}
        </Cellule>
        <div className="col-span-2 md:col-span-1">
          <EtatsBien bien={bien} />
        </div>
      </div>
      <SejoursBien bien={bien} />
    </li>
  );
}

/** En-tête des colonnes, visible à partir de la largeur tablette. */
function EnteteTableau({ premiere }: { premiere: string }) {
  const colonnes = [premiere, 'Locataire', 'Loyer mensuel', 'Encaissé', 'Solde', 'État'];
  return (
    <div className={'hidden gap-x-4 border-b border-mtm-border bg-mtm-bg px-5 py-2.5 md:grid ' + COLONNES} aria-hidden="true">
      {colonnes.map((colonne) => (
        <p key={colonne} className="text-[11px] font-bold uppercase tracking-[0.1em] text-mtm-muted">
          {colonne}
        </p>
      ))}
    </div>
  );
}

/** Lien vers une nouvelle demande, déjà orientée sur ce bien : le client n'a pas à le décrire. */
function QuestionSurBien({ reference }: { reference: string }) {
  return (
    <div className="border-t border-mtm-border px-4 py-3 sm:px-5">
      <Link
        to={`${ROUTES.clientDemandes}?bien=${encodeURIComponent(reference)}`}
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-mtm-primary hover:underline"
      >
        <MessageSquare className="h-4 w-4" aria-hidden="true" />
        Une question sur ce bien
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

/** Une propriété (villa, immeuble, résidence) : sa carte, et un tableau avec une ligne par logement. */
function CartePropriete({ nom, type, logements }: { nom: string; type: string; logements: ClientBienLocatif[] }) {
  const loues = logements.filter((bien) => bien.bail || bien.occupation === 'occupe').length;
  const premier = logements[0];
  return (
    <section className="overflow-hidden rounded-[14px] border border-mtm-border bg-mtm-surface shadow-card">
      <header className="flex items-start gap-3 px-4 py-4 sm:px-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mtm-primary-subtle text-mtm-primary">
          <Home className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold leading-snug text-mtm-text">{nom}</h2>
          <p className="text-sm text-mtm-muted">
            {TYPES_IMMEUBLE[type] ?? 'Propriété'} · {[premier.commune, premier.region].filter(Boolean).join(', ')}
          </p>
        </div>
        <Badge tone={loues === logements.length ? 'success' : 'primary'} dot className="shrink-0">
          {loues} loué{loues > 1 ? 's' : ''} sur {logements.length}
        </Badge>
      </header>
      <EnteteTableau premiere="Logement" />
      <ul>
        {logements.map((bien) => (
          <LigneBien
            key={bien.id}
            bien={bien}
            titre={
              <>
                <p className="font-bold text-mtm-text">{bien.numeroLot ? `Logement ${bien.numeroLot}` : bien.referenceInterne}</p>
                <p className="whitespace-nowrap text-xs text-mtm-muted">{bien.referenceInterne}</p>
              </>
            }
          />
        ))}
      </ul>
      <QuestionSurBien reference={premier.referenceInterne} />
    </section>
  );
}

/** Les biens qui n'appartiennent à aucune propriété : un seul tableau, une ligne par bien. */
function CarteBiensSeuls({ biens }: { biens: ClientBienLocatif[] }) {
  return (
    <section className="overflow-hidden rounded-[14px] border border-mtm-border bg-mtm-surface shadow-card">
      <header className="px-4 py-4 sm:px-5">
        <h2 className="font-display text-lg font-bold text-mtm-text">{biens.length > 1 ? 'Mes autres biens' : 'Mon bien'}</h2>
        <p className="text-sm text-mtm-muted">Les biens qui ne font pas partie d’une propriété à plusieurs logements.</p>
      </header>
      <EnteteTableau premiere="Bien" />
      <ul>
        {biens.map((bien) => (
          <LigneBien
            key={bien.id}
            bien={bien}
            titre={
              <>
                <p className="font-bold text-mtm-text">{bien.adresse}</p>
                <p className="text-xs text-mtm-muted">
                  {[bien.commune, bien.region].filter(Boolean).join(', ')} · <span className="whitespace-nowrap">{bien.referenceInterne}</span>
                </p>
              </>
            }
          />
        ))}
      </ul>
      <QuestionSurBien reference={biens[0].referenceInterne} />
    </section>
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
    const seuls: ClientBienLocatif[] = [];
    for (const bien of proprietaireBiens ?? []) {
      if (!bien.immeuble) {
        seuls.push(bien);
        continue;
      }
      const deja = parPropriete.get(bien.immeuble.id);
      if (deja) deja.push(bien);
      else parPropriete.set(bien.immeuble.id, [bien]);
    }
    for (const logements of parPropriete.values()) {
      logements.sort((a, b) =>
        (a.numeroLot ?? a.referenceInterne).localeCompare(b.numeroLot ?? b.referenceInterne, 'fr', { numeric: true }),
      );
    }
    return { seuls, parPropriete };
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
        eyebrow="Gestion locative"
        title="Mon bien"
        description={`${biens.length} bien${biens.length > 1 ? 's' : ''} confié${biens.length > 1 ? 's' : ''} à MTM${
          cartes.parPropriete.size > 0 ? `, dont ${cartes.parPropriete.size} propriété${cartes.parPropriete.size > 1 ? 's' : ''} à plusieurs logements` : ''
        }.`}
      />

      {/* Le portefeuille en quatre chiffres. */}
      {proprietaireSynthese && activite && (
        <section aria-label="Ma gérance" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatTile
            icon={KeyRound}
            value={`${proprietaireSynthese.loues} / ${proprietaireSynthese.biens}`}
            label={proprietaireSynthese.biensALaNuit > 0 ? 'Biens loués ou occupés' : 'Biens loués'}
            detail={
              proprietaireSynthese.biens - proprietaireSynthese.loues > 0
                ? `${proprietaireSynthese.biens - proprietaireSynthese.loues} à louer`
                : 'tous vos biens sont loués'
            }
          />
          <StatTile icon={TrendingUp} value={formatMoney(proprietaireSynthese.loyersDus)} label="Loyers appelés" detail="depuis le début des baux" />
          <StatTile
            icon={Wallet}
            value={formatMoney(proprietaireSynthese.loyersEncaisses)}
            label="Loyers encaissés"
            tone="success"
            detail={
              proprietaireSynthese.loyersDus > 0
                ? `${Math.round((proprietaireSynthese.loyersEncaisses / proprietaireSynthese.loyersDus) * 100)} % des loyers appelés`
                : undefined
            }
          />
          <StatTile
            icon={Wallet}
            value={formatMoney(proprietaireSynthese.solde)}
            label="À recouvrer"
            tone={proprietaireSynthese.solde > 0 ? 'warning' : 'neutral'}
            detail={
              proprietaireSynthese.echeancesImpayees > 0
                ? `${proprietaireSynthese.echeancesImpayees} échéance${proprietaireSynthese.echeancesImpayees > 1 ? 's' : ''} impayée${proprietaireSynthese.echeancesImpayees > 1 ? 's' : ''}`
                : 'aucun impayé'
            }
          />
          {proprietaireSynthese.biensALaNuit > 0 && (
            <>
              <StatTile
                icon={CalendarCheck}
                value={String(proprietaireSynthese.sejoursAVenir)}
                label={`Séjour${proprietaireSynthese.sejoursAVenir > 1 ? 's' : ''} à venir`}
              />
              <StatTile icon={Wallet} value={formatMoney(proprietaireSynthese.sejoursEncaisses)} label="Séjours encaissés" tone="success" />
            </>
          )}
        </section>
      )}

      {proprietaireSynthese && !activite && (
        <p className="rounded-2xl border border-mtm-border/70 bg-mtm-surface px-4 py-3 text-sm text-mtm-muted shadow-card lg:rounded-lg">
          Vos biens sont suivis par MTM. Les loyers encaissés et votre solde apparaîtront ici dès la signature d’un premier bail.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {[...cartes.parPropriete.values()].map((logements) => {
          const immeuble = logements[0]?.immeuble;
          return immeuble ? <CartePropriete key={immeuble.id} nom={immeuble.nom} type={immeuble.type} logements={logements} /> : null;
        })}
        {cartes.seuls.length > 0 && <CarteBiensSeuls biens={cartes.seuls} />}
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
