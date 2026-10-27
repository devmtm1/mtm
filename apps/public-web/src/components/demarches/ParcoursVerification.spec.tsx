import { render, screen } from '@testing-library/react';
import { ShieldCheck, FileSignature, FileText } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { iconeDemarche } from '../../utils/demarches';
import { ParcoursVerification } from './ParcoursVerification';

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
