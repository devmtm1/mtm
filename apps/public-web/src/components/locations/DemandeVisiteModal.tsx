import { useState, type ReactNode } from 'react';
import { CalendarCheck, CalendarDays, CheckCircle2, ChevronRight, Clock, Mail, MessageCircle, MessageSquare, Phone, Send, User } from 'lucide-react';
import { useContactForm } from '../../hooks/useContactForm';
import { ClientIdentityNotice } from '../contact/ClientIdentityNotice';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';
import { Modal } from '../ui/Modal';
import { isValidTelephone, MESSAGE_TELEPHONE_INVALIDE, saisieTelephone } from '../../utils/telephone';

interface DemandeVisiteModalProps {
  bienLocatifId: string;
  /** Titre et référence de l'annonce : ils figurent dans le message et dans le sujet reçus par l'équipe. */
  titre: string;
  reference: string;
  /** Numéro WhatsApp au format international sans « + » et message pré-rempli pour la conversation. */
  whatsapp: string;
  messageWhatsapp: string;
  onClose: () => void;
}

/**
 * Créneaux proposés au visiteur : une heure souhaitée, que l'équipe confirme ensuite. Ce ne sont pas des disponibilités
 * garanties — la demande dit « souhaitée », et un conseiller rappelle pour fixer le rendez-vous.
 */
const HEURES = Array.from({ length: 11 }, (_, index) => `${String(index + 8).padStart(2, '0')} h 00`);

const champ =
  'w-full rounded-xl border border-mtm-border bg-mtm-bg/60 py-3 pl-11 pr-3 text-base text-mtm-text placeholder:text-mtm-muted focus:border-mtm-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-mtm-primary';

/** Icône grise à gauche d'un champ, centrée sur sa hauteur (ou alignée sur la première ligne d'une zone de texte). */
function ChampAvecIcone({ icone, enHaut = false, children }: { icone: ReactNode; enHaut?: boolean; children: ReactNode }) {
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute left-3.5 -translate-y-1/2 text-mtm-muted [&>svg]:h-[18px] [&>svg]:w-[18px] ${enHaut ? 'top-6' : 'top-1/2'}`}
      >
        {icone}
      </span>
      {children}
    </div>
  );
}

function aujourdhui(): string {
  const maintenant = new Date();
  const mois = String(maintenant.getMonth() + 1).padStart(2, '0');
  const jour = String(maintenant.getDate()).padStart(2, '0');
  return `${maintenant.getFullYear()}-${mois}-${jour}`;
}

/** « samedi 22 novembre 2026 » à partir de la valeur d'un champ date (AAAA-MM-JJ). */
function dateLongue(valeur: string): string {
  const date = new Date(`${valeur}T12:00:00`);
  return Number.isNaN(date.getTime()) ? valeur : date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Demande de visite d'une location : une fenêtre aérée, qui ne demande que l'essentiel — qui, comment le joindre, quand
 * visiter. Le message est facultatif : l'équipe reçoit déjà le bien concerné, la date et l'heure souhaitées. WhatsApp reste
 * proposé juste en dessous, pour celui qui préfère écrire.
 */
export function DemandeVisiteModal({ bienLocatifId, titre, reference, whatsapp, messageWhatsapp, onClose }: DemandeVisiteModalProps) {
  const [date, setDate] = useState('');
  const [heure, setHeure] = useState('');
  const [verifie, setVerifie] = useState(false);

  const souhait = date && heure ? `Visite souhaitée : ${dateLongue(date)} à ${heure}.` : undefined;
  const { values, setValue, errors, submitting, submitted, submitError, submit, client } = useContactForm({
    bienLocatifId,
    initialSujet: `Visite — ${reference}`,
    demandeType: 'visite',
    debutMessage: `Bonjour, je souhaite visiter « ${titre} » (réf. ${reference}).`,
    piedMessage: souhait,
  });

  const erreurTelephone = !client
    ? values.telephone.trim() === ''
      ? verifie
        ? 'Le téléphone est requis.'
        : undefined
      : !isValidTelephone(values.telephone)
        ? MESSAGE_TELEPHONE_INVALIDE
        : errors.telephone
    : undefined;
  const nomTropCourt = !client && values.nom.trim().length < 2;
  const erreurNom = verifie && nomTropCourt ? 'Indiquez votre nom (2 caractères minimum).' : errors.nom;
  const erreurDate = verifie && !date ? 'Choisissez une date.' : undefined;
  const erreurHeure = verifie && !heure ? 'Choisissez une heure.' : undefined;

  function envoyer(): void {
    setVerifie(true);
    // Le téléphone, la date et l'heure sont indispensables pour rappeler et fixer le rendez-vous ; le reste est contrôlé à l'envoi.
    if (!date || !heure || nomTropCourt) return;
    if (!client && (values.telephone.trim() === '' || !isValidTelephone(values.telephone))) return;
    void submit();
  }

  return (
    <Modal title="Demande de visite" onClose={onClose} aere>
      {submitted ? (
        <div className="flex flex-col items-center gap-3 px-2 py-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-mtm-success/10 text-mtm-success">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </span>
          <p className="font-display text-xl font-bold text-mtm-text">Demande envoyée</p>
          <p className="max-w-sm text-sm leading-relaxed text-mtm-muted">
            Un conseiller MTM vous rappelle très prochainement pour confirmer la visite{souhait ? ` (${souhait.replace('Visite souhaitée : ', '').replace(/\.$/, '')})` : ''}.
          </p>
          <Button variant="secondary" onClick={onClose} className="mt-2">
            Fermer
          </Button>
        </div>
      ) : (
        <>
          <header className="flex items-center gap-5 border-b border-mtm-border pb-6 pr-10">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-mtm-accent-subtle text-mtm-accent sm:h-[4.5rem] sm:w-[4.5rem]">
              <CalendarCheck className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden="true" />
            </span>
            <span aria-hidden="true" className="h-14 w-px shrink-0 bg-mtm-border" />
            <div className="min-w-0">
              <p className="font-display text-xl font-bold leading-tight text-mtm-primary-dark sm:text-2xl">Organisons votre visite</p>
              <p className="mt-1 text-sm leading-snug text-mtm-muted sm:text-[15px]">Quelques informations suffisent pour planifier votre rendez-vous.</p>
            </div>
          </header>

          <form
            noValidate
            aria-label="Demande de visite"
            className="mt-7 flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              envoyer();
            }}
          >
            {client ? (
              <ClientIdentityNotice client={client} dansEspaceClient={false} />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <FormField label="Nom complet" htmlFor="visite-nom" error={erreurNom} required>
                    <ChampAvecIcone icone={<User />}>
                      <input
                        id="visite-nom"
                        type="text"
                        autoComplete="name"
                        placeholder="Votre nom et prénom"
                        className={champ}
                        value={values.nom}
                        onChange={(event) => setValue('nom', event.target.value)}
                      />
                    </ChampAvecIcone>
                  </FormField>
                  <FormField label="Téléphone" htmlFor="visite-telephone" error={erreurTelephone} required>
                    <ChampAvecIcone icone={<Phone />}>
                      <input
                        id="visite-telephone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="+221 77 123 45 67"
                        className={champ}
                        value={values.telephone}
                        onChange={(event) => setValue('telephone', saisieTelephone(event.target.value))}
                        aria-invalid={Boolean(erreurTelephone) || undefined}
                      />
                    </ChampAvecIcone>
                  </FormField>
                </div>

                <FormField label="Adresse e-mail" htmlFor="visite-email" error={errors.email}>
                  <ChampAvecIcone icone={<Mail />}>
                    <input
                      id="visite-email"
                      type="email"
                      autoComplete="email"
                      placeholder="votre@email.com"
                      className={champ}
                      value={values.email}
                      onChange={(event) => setValue('email', event.target.value)}
                    />
                  </ChampAvecIcone>
                </FormField>
              </>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField label="Date souhaitée pour la visite" htmlFor="visite-date" error={erreurDate} required>
                <ChampAvecIcone icone={<CalendarDays />}>
                  <input
                    id="visite-date"
                    type="date"
                    min={aujourdhui()}
                    className={champ}
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    aria-invalid={Boolean(erreurDate) || undefined}
                  />
                </ChampAvecIcone>
              </FormField>
              <FormField label="Heure souhaitée" htmlFor="visite-heure" error={erreurHeure} required>
                <ChampAvecIcone icone={<Clock />}>
                  <select
                    id="visite-heure"
                    className={`${champ} appearance-none pr-9`}
                    value={heure}
                    onChange={(event) => setHeure(event.target.value)}
                    aria-invalid={Boolean(erreurHeure) || undefined}
                  >
                    <option value="">Choisir une heure</option>
                    {HEURES.map((creneau) => (
                      <option key={creneau} value={creneau}>
                        {creneau}
                      </option>
                    ))}
                  </select>
                </ChampAvecIcone>
              </FormField>
            </div>

            <FormField label="Message (facultatif)" htmlFor="visite-message" error={errors.message}>
              <ChampAvecIcone icone={<MessageSquare />} enHaut>
                <textarea
                  id="visite-message"
                  rows={3}
                  maxLength={1500}
                  placeholder="Ex : Je suis intéressé par ce bien…"
                  className={champ}
                  value={values.message}
                  onChange={(event) => setValue('message', event.target.value)}
                />
              </ChampAvecIcone>
            </FormField>

            {submitError && (
              <p className="text-sm font-medium text-mtm-error" role="alert">
                {submitError}
              </p>
            )}

            <Button type="submit" variant="accent" disabled={submitting} className="w-full rounded-xl py-3.5 text-base">
              {submitting ? (
                'Envoi en cours…'
              ) : (
                <span className="inline-flex items-center gap-2.5">
                  <Send className="h-[18px] w-[18px]" aria-hidden="true" />
                  Confirmer ma demande de visite
                  <ChevronRight className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
              )}
            </Button>

            <div className="flex items-center gap-4 text-sm text-mtm-muted">
              <span className="h-px flex-1 bg-mtm-border" aria-hidden="true" />
              ou
              <span className="h-px flex-1 bg-mtm-border" aria-hidden="true" />
            </div>

            <a
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(messageWhatsapp)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 rounded-xl border border-mtm-success px-4 py-3 text-[15px] font-semibold text-mtm-success transition-colors hover:bg-mtm-success hover:text-white"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              Discuter avec un conseiller sur WhatsApp
            </a>
          </form>
        </>
      )}
    </Modal>
  );
}
