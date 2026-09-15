import { UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../routes';

/**
 * Remplace les champs nom / e-mail / téléphone quand un client est connecté :
 * la demande part avec l'identité de son compte et arrive dans son espace.
 */
export function ClientIdentityNotice({
  client,
}: {
  client: { firstName: string; lastName: string; email: string };
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-md bg-mtm-primary-subtle px-3.5 py-3 text-sm">
      <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-mtm-primary" aria-hidden="true" />
      <p className="text-mtm-text">
        Envoyée en tant que{' '}
        <strong>
          {client.firstName} {client.lastName}
        </strong>{' '}
        ({client.email}). Vous retrouverez cette demande et sa prise en charge dans{' '}
        <Link to={ROUTES.clientDemandes} className="font-semibold text-mtm-primary hover:underline">
          votre espace client
        </Link>
        .
      </p>
    </div>
  );
}
