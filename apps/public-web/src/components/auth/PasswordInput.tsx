import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { fieldInputClass } from '../ui/FormField';

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  required?: boolean;
}

/**
 * Champ de mot de passe avec un œil pour l'afficher ou le masquer : sur
 * téléphone, une faute de frappe est vite faite et invisible. Le mot de passe
 * redevient masqué dès que le champ n'est plus affiché.
 */
export function PasswordInput({ id, value, onChange, autoComplete, required = true }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        required={required}
        autoComplete={autoComplete}
        autoCapitalize="none"
        spellCheck={false}
        className={`${fieldInputClass} pr-12`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        onClick={() => setVisible((courant) => !courant)}
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-mtm-muted active:text-mtm-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-mtm-primary"
      >
        {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
      </button>
    </div>
  );
}
