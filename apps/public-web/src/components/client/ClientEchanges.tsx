import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { ApiError } from '../../api/client';
import { fetchEchanges, sendEchange } from '../../api/messages';
import type { MessageClient, TypeDossierClient } from '../../api/messages';
import { useAuth } from '../../contexts/auth-context-store';
import { formatDate } from '../../utils/format';
import { Button } from '../ui/Button';
import { useToast } from '../ui/toast-store';

const LIMITE = 4000;

/**
 * Échanges avec MTM sur un dossier (section 22) : les messages que l'équipe a
 * choisi de partager, et la possibilité d'y répondre. Les notes internes de MTM
 * n'arrivent jamais ici.
 */
export function ClientEchanges({
  type,
  dossierId,
  titre = 'Échanges avec MTM',
  chargerDirectement = false,
}: {
  type: TypeDossierClient;
  dossierId: string;
  titre?: string;
  /**
   * Charge les messages à l'affichage. Sur une page qui liste plusieurs dossiers
   * on attend le clic : une requête par carte ferait lenteur et bruit.
   */
  chargerDirectement?: boolean;
}) {
  const { accessToken } = useAuth();
  const toast = useToast();
  const [messages, setMessages] = useState<MessageClient[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    if (!accessToken) return;
    try {
      const reponse = await fetchEchanges(accessToken, type, dossierId);
      setMessages(reponse.items);
      setErreur(null);
    } catch (caught) {
      setErreur(
        caught instanceof ApiError
          ? caught.message
          : 'Les échanges ne se sont pas chargés.',
      );
    }
  }, [accessToken, type, dossierId]);

  useEffect(() => {
    if (chargerDirectement) void charger();
  }, [charger, chargerDirectement]);

  async function envoyer(event: FormEvent): Promise<void> {
    event.preventDefault();
    const corps = texte.trim();
    if (!accessToken || !corps || envoi) return;
    setEnvoi(true);
    try {
      const message = await sendEchange(accessToken, type, dossierId, corps);
      if (messages === null) {
        // Fil pas encore ouvert : on le charge pour montrer le message dans son contexte.
        await charger();
      } else {
        setMessages([...messages, message]);
      }
      setTexte('');
      toast.show('Message envoyé à MTM');
    } catch (caught) {
      toast.show(
        caught instanceof ApiError
          ? caught.message
          : 'Le message n’est pas parti. Merci de réessayer.',
      );
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section
      aria-label={titre}
      className="rounded-xl border border-mtm-border px-3 py-3"
    >
      <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mtm-muted">
        <MessageSquare className="h-4 w-4 flex-none" aria-hidden="true" />
        {titre}
      </h4>

      {erreur ? (
        <p role="alert" className="mt-2 text-sm text-mtm-warning">
          {erreur}
        </p>
      ) : messages === null ? (
        chargerDirectement ? (
          <p className="mt-2 text-sm text-mtm-muted">Chargement…</p>
        ) : (
          <button
            type="button"
            onClick={() => void charger()}
            className="mt-2 text-sm font-semibold text-mtm-primary underline-offset-2 hover:underline"
          >
            Voir les messages
          </button>
        )
      ) : messages.length === 0 ? (
        <p className="mt-2 text-sm text-mtm-muted">
          Aucun message pour l’instant. Une question sur ce dossier ?
          Écrivez-nous ci-dessous.
        </p>
      ) : (
        <ol className="mt-2 flex max-h-72 flex-col gap-2 overflow-y-auto">
          {messages.map((message) => (
            <li
              key={message.id}
              className={`max-w-[92%] rounded-xl px-3 py-2 text-sm ${
                message.deClient
                  ? 'self-end bg-mtm-primary/10'
                  : 'self-start bg-mtm-bg'
              }`}
            >
              <p className="whitespace-pre-line text-mtm-text">
                {message.corps}
              </p>
              <p className="mt-1 text-xs text-mtm-muted">
                {message.deClient ? 'Vous' : `${message.auteur} · MTM`} ·{' '}
                {formatDate(message.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      )}

      <form
        onSubmit={(event) => void envoyer(event)}
        className="mt-3 flex flex-col gap-2"
      >
        <label htmlFor={`echange-${dossierId}`} className="sr-only">
          Votre message à MTM
        </label>
        <textarea
          id={`echange-${dossierId}`}
          value={texte}
          onChange={(event) => setTexte(event.target.value)}
          maxLength={LIMITE}
          rows={2}
          placeholder="Votre message à MTM"
          className="w-full rounded-xl border border-mtm-border bg-mtm-surface px-3 py-2 text-sm text-mtm-text focus:border-mtm-primary focus:outline-none"
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={!texte.trim() || envoi}>
            <Send className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {envoi ? 'Envoi…' : 'Envoyer'}
          </Button>
        </div>
      </form>
    </section>
  );
}
