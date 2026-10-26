import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShieldCheck, FileSignature, FileText } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { iconeDemarche } from '../../utils/demarches';
import { CarteDemarche } from './CarteDemarche';
import { ParcoursVerification } from './ParcoursVerification';

describe('CarteDemarche', () => {
  it('ouvre la demande avec la démarche choisie', async () => {
    const onDemande = vi.fn();
    render(
      <ul>
        <CarteDemarche titre="Dépôt de bail" description="Dépôt auprès du service compétent." onDemande={onDemande} />
      </ul>,
    );
    expect(screen.getByText('Dépôt auprès du service compétent.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Faire une demande : Dépôt de bail' }));
    expect(onDemande).toHaveBeenCalledWith('Dépôt de bail');
  });
});

describe('iconeDemarche', () => {
  it('choisit une icône d’après le titre, avec un document par défaut', () => {
    expect(iconeDemarche('Vérification avant achat')).toBe(ShieldCheck);
    expect(iconeDemarche('Dépôt de bail')).toBe(FileSignature);
    expect(iconeDemarche('Quelque chose de nouveau')).toBe(FileText);
  });
});

describe('ParcoursVerification', () => {
  it('numérote les étapes dans l’ordre', () => {
    render(<ParcoursVerification etapes={[{ title: 'Demande', description: 'a' }, { title: 'Rapport', description: 'b' }]} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rapport' })).toBeInTheDocument();
  });
});
