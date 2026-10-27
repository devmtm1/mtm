import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { CalendarDays, CheckCircle2, Clock, Moon, ShieldCheck, Users } from 'lucide-react';
import { fetchDisponibilites, postDemandeSejour } from '../../api/locations';
import { ApiError } from '../../api/client';
import type { DemandeSejourResultat, Location, PeriodeIndisponible } from '../../types/location';
import {
  ajouterJours,
  aujourdhui,
  estimerSejour,
  formatMontant,
  formatPeriode,
  nombreNuits,
  verifierDates,
} from '../../utils/sejour';
import { Button } from '../ui/Button';
import { FormField, fieldInputClass } from '../ui/FormField';

/**
 * Demande de séjour pour un bien en courte durée : dates, voyageurs, estimation du
 * prix, puis coordonnées. Rien n'est réservé ni payé à l'envoi : MTM reçoit la
 * demande, confirme les nuits et recontacte le voyageur. Les nuits déjà prises
 * sont indiquées, et les dates qui les recouvrent refusées avant l'envoi.
 */
export function SejourBooking({ location }: { location: Location }) {
  const [periodes, setPeriodes] = useState<PeriodeIndisponible[]>([]);
  const [arrivee, setArrivee] = useState('');
  const [depart, setDepart] = useState('');
  const [voyageurs, setVoyageurs] = useState(1);
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<DemandeSejourResultat | null>(null);

  useEffect(() => {
    let annule = false;
    fetchDisponibilites(location.id)
      .then((liste) => {
        if (!annule) setPeriodes(liste);
      })
      .catch(() => {
        // Sans le calendrier, le serveur refuse tout de même des dates prises.
        if (!annule) setPeriodes([]);
      });
    return () => {
      annule = true;
    };
  }, [location.id]);

  const nuits = nombreNuits(arrivee, depart);
  const probleme = useMemo(
    () => verifierDates(location, { arrivee, depart, voyageurs }, periodes),
    [location, arrivee, depart, voyageurs, periodes],
  );
  const estimation = !probleme ? estimerSejour(location, nuits) : null;
  const capacite = location.capaciteVoyageurs ?? 12;

  async function envoyer(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!estimation) return;
    if (!prenom.trim() || !nom.trim()) {
      setErreur('Indiquez votre prénom et votre nom.');
      return;
    }
    if (telephone.replace(/\s+/g, '').length < 6) {
      setErreur('Indiquez un numéro de téléphone (avec l’indicatif pays) pour que nous puissions vous répondre.');
      return;
    }
    setErreur(null);
    setEnvoi(true);
    try {
      const reponse = await postDemandeSejour(location.id, {
        prenom: prenom.trim(),
        nom: nom.trim(),
        telephone: telephone.trim(),
        email: email.trim() || undefined,
        dateArrivee: arrivee,
        dateDepart: depart,
        nombreVoyageurs: voyageurs,
        message: message.trim() || undefined,
      });
      setResultat(reponse);
    } catch (caught) {
      setErreur(caught instanceof ApiError ? caught.message : 'L’envoi a échoué. Merci de réessayer.');
      // Les dates ont peut-être été prises entre-temps : on relit le calendrier.
      void fetchDisponibilites(location.id).then(setPeriodes).catch(() => undefined);
    } finally {
      setEnvoi(false);
    }
  }

  if (resultat) {
    return (
      <div role="status" className="flex flex-col gap-3 rounded-xl bg-mtm-success/10 p-4 text-sm text-mtm-text">
        <p className="flex items-center gap-2 font-display text-base font-bold text-mtm-success">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          Demande envoyée
        </p>
        <p>
          Votre demande <strong>{resultat.reference}</strong> pour {resultat.nuits} nuit{resultat.nuits > 1 ? 's' : ''} (
          {formatMontant(resultat.montantTotal)}) est bien reçue.
        </p>
        <p className="text-mtm-muted">
          MTM Immobilier vous contacte pour confirmer les nuits et organiser votre arrivée. Aucun paiement ne vous a été
          demandé : les nuits ne sont réservées qu’une fois la confirmation reçue.
        </p>
      </div>
    );
  }

  return (
    <form id="reserver" className="flex flex-col gap-4" onSubmit={(event) => void envoyer(event)} noValidate>
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-mtm-text">
        <CalendarDays className="h-5 w-5 text-mtm-primary" aria-hidden="true" />
        Demander ce séjour
      </h2>

      {periodes.length > 0 && (
        <div className="rounded-xl bg-mtm-bg px-3.5 py-3 text-xs text-mtm-muted">
          <p className="font-semibold text-mtm-text">Déjà réservé</p>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {periodes.slice(0, 6).map((periode) => (
              <li key={`${periode.debut}-${periode.fin}`}>{formatPeriode(periode)}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Arrivée" htmlFor="sejour-arrivee">
          <input
            id="sejour-arrivee"
            type="date"
            className={fieldInputClass}
            min={aujourdhui()}
            value={arrivee}
            onChange={(event) => {
              setArrivee(event.target.value);
              // Un départ avant la nouvelle arrivée n'a plus de sens : on le recule.
              if (depart && event.target.value && depart <= event.target.value) {
                setDepart(ajouterJours(event.target.value, location.nuitsMinimum));
              }
            }}
          />
        </FormField>
        <FormField label="Départ" htmlFor="sejour-depart">
          <input
            id="sejour-depart"
            type="date"
            className={fieldInputClass}
            min={arrivee ? ajouterJours(arrivee, location.nuitsMinimum) : aujourdhui()}
            value={depart}
            onChange={(event) => setDepart(event.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Nombre de personnes" htmlFor="sejour-voyageurs">
        <select
          id="sejour-voyageurs"
          className={fieldInputClass}
          value={voyageurs}
          onChange={(event) => setVoyageurs(Number(event.target.value))}
        >
          {Array.from({ length: capacite }, (_, index) => index + 1).map((nombre) => (
            <option key={nombre} value={nombre}>
              {nombre} personne{nombre > 1 ? 's' : ''}
            </option>
          ))}
        </select>
      </FormField>

      {probleme && (
        <p role="alert" className="rounded-xl bg-mtm-error/10 px-3.5 py-2.5 text-sm font-medium text-mtm-error">
          {probleme}
        </p>
      )}

      {estimation && (
        <dl className="flex flex-col gap-1.5 rounded-xl border border-mtm-border bg-mtm-bg px-3.5 py-3 text-sm" aria-label="Estimation du séjour">
          <div className="flex justify-between gap-3">
            <dt className="text-mtm-muted">
              {estimation.nuits} nuit{estimation.nuits > 1 ? 's' : ''} × {formatMontant(estimation.prixNuit)}
            </dt>
            <dd className="font-semibold text-mtm-text">{formatMontant(estimation.hebergement)}</dd>
          </div>
          {estimation.menage > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-mtm-muted">Frais de ménage</dt>
              <dd className="font-semibold text-mtm-text">{formatMontant(estimation.menage)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3 border-t border-mtm-border pt-1.5">
            <dt className="font-semibold text-mtm-primary">Total du séjour</dt>
            <dd className="font-display text-base font-bold text-mtm-primary">{formatMontant(estimation.total)}</dd>
          </div>
          {location.montantCaution !== null && location.montantCaution > 0 && (
            <p className="flex items-start gap-1.5 pt-1 text-xs text-mtm-muted">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mtm-success" aria-hidden="true" />
              Caution de {formatMontant(location.montantCaution)}, rendue au départ après l’état des lieux.
            </p>
          )}
        </dl>
      )}

      {estimation && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Prénom" htmlFor="sejour-prenom" required>
              <input id="sejour-prenom" className={fieldInputClass} value={prenom} onChange={(event) => setPrenom(event.target.value)} autoComplete="given-name" />
            </FormField>
            <FormField label="Nom" htmlFor="sejour-nom" required>
              <input id="sejour-nom" className={fieldInputClass} value={nom} onChange={(event) => setNom(event.target.value)} autoComplete="family-name" />
            </FormField>
          </div>
          <FormField label="Téléphone / WhatsApp" htmlFor="sejour-telephone" required>
            <input
              id="sejour-telephone"
              type="tel"
              className={fieldInputClass}
              placeholder="+221 77 000 00 00"
              value={telephone}
              onChange={(event) => setTelephone(event.target.value)}
              autoComplete="tel"
            />
          </FormField>
          <FormField label="E-mail (facultatif)" htmlFor="sejour-email">
            <input id="sejour-email" type="email" className={fieldInputClass} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
          </FormField>
          <FormField label="Un message ? (facultatif)" htmlFor="sejour-message">
            <textarea
              id="sejour-message"
              rows={2}
              maxLength={1000}
              className={fieldInputClass}
              placeholder="Heure d’arrivée prévue, demandes particulières…"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </FormField>

          {erreur && (
            <p role="alert" className="rounded-xl bg-mtm-error/10 px-3.5 py-2.5 text-sm font-medium text-mtm-error">
              {erreur}
            </p>
          )}
          <Button type="submit" disabled={envoi}>
            {envoi ? 'Envoi…' : 'Envoyer ma demande'}
          </Button>
          <p className="text-xs text-mtm-muted">
            Aucun paiement maintenant : MTM confirme les nuits, puis vous recontacte.
          </p>
        </>
      )}

      <ul className="flex flex-col gap-1.5 border-t border-mtm-border pt-4 text-xs text-mtm-muted">
        <li className="flex items-center gap-2">
          <Moon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {location.nuitsMinimum} nuit{location.nuitsMinimum > 1 ? 's' : ''} minimum
        </li>
        {location.capaciteVoyageurs && (
          <li className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Jusqu’à {location.capaciteVoyageurs} voyageur{location.capaciteVoyageurs > 1 ? 's' : ''}
          </li>
        )}
        {(location.heureArrivee || location.heureDepart) && (
          <li className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {location.heureArrivee && `Arrivée dès ${location.heureArrivee}`}
            {location.heureArrivee && location.heureDepart && ' · '}
            {location.heureDepart && `Départ avant ${location.heureDepart}`}
          </li>
        )}
      </ul>
    </form>
  );
}
