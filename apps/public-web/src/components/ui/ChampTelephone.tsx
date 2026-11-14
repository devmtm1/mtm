import { useState, type ReactNode } from 'react';
import { ChampAvecIcone, FormField, fieldInputClass } from './FormField';
import { isValidTelephone, MESSAGE_TELEPHONE_INVALIDE, saisieTelephone } from '../../utils/telephone';

interface ChampTelephoneProps {
  label?: string;
  id: string;
  value: string;
  onChange: (valeur: string) => void;
  /** Erreur venue de l'envoi du formulaire ; à défaut, le champ signale lui-même un numéro invalide dès qu'on le quitte. */
  error?: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  /** Une icône à l'intérieur du champ, à gauche. */
  icone?: ReactNode;
}

/**
 * Un champ de numéro de téléphone : il ne laisse passer que les caractères d'un numéro, limite sa longueur selon le
 * format (9 chiffres au Sénégal, au plus 15 avec un indicatif) et signale un numéro invalide dès qu'on quitte le champ.
 */
export function ChampTelephone({ label = 'Téléphone', id, value, onChange, error, required, hint, placeholder = '77 123 45 67', icone }: ChampTelephoneProps) {
  const [quitte, setQuitte] = useState(false);
  const invalide = quitte && value.trim() !== '' && !isValidTelephone(value);
  return (
    <FormField label={label} htmlFor={id} error={error ?? (invalide ? MESSAGE_TELEPHONE_INVALIDE : undefined)} required={required} hint={hint}>
      <ChampAvecIcone icone={icone}>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder={placeholder}
        className={`${fieldInputClass} ${icone ? 'pl-10 sm:pl-10' : ''}`}
        value={value}
        onChange={(event) => onChange(saisieTelephone(event.target.value))}
        onBlur={() => setQuitte(true)}
        aria-invalid={Boolean(error) || invalide || undefined}
      />
      </ChampAvecIcone>
    </FormField>
  );
}
