import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormulaireDevis } from './FormulaireDevis';

const envoyer = vi.fn();
vi.mock('../../api/contact', () => ({ sendDevisConstruction: (payload: unknown) => envoyer(payload) }));

function remplir(etiquette: string, valeur: string) {
  fireEvent.change(screen.getByLabelText(new RegExp(etiquette)), { target: { value: valeur } });
}

function remplirLeNecessaire() {
  remplir('Nom complet', 'Awa Diop');
  remplir('Téléphone ou WhatsApp', '+221 77 000 00 00');
  remplir('E-mail', 'awa@exemple.sn');
  remplir('Nature du projet', 'villa');
  remplir('Terrain', 'possede');
  remplir('Commune ou quartier', 'Saly');
  fireEvent.click(screen.getByRole('checkbox'));
}

describe('FormulaireDevis', () => {
  beforeEach(() => {
    envoyer.mockReset();
    envoyer.mockResolvedValue({ success: true });
  });

  it('refuse l’envoi tant que les champs essentiels et le consentement manquent', async () => {
    render(<FormulaireDevis />);
    fireEvent.click(screen.getByRole('button', { name: /Demander mon devis/ }));

    expect(await screen.findByText('Indiquez votre nom.')).toBeTruthy();
    expect(screen.getByText('Choisissez la nature du projet.')).toBeTruthy();
    expect(screen.getByText(/Acceptez le traitement/)).toBeTruthy();
    expect(envoyer).not.toHaveBeenCalled();
  });

  it('efface le message d’erreur d’un champ dès qu’il est corrigé', async () => {
    render(<FormulaireDevis />);
    fireEvent.click(screen.getByRole('button', { name: /Demander mon devis/ }));
    expect(await screen.findByText('Indiquez votre nom.')).toBeTruthy();

    remplir('Nom complet', 'Awa Diop');
    expect(screen.queryByText('Indiquez votre nom.')).toBeNull();
    expect(screen.getByText('Choisissez la nature du projet.')).toBeTruthy();
  });

  it('envoie le projet structuré et remercie le visiteur', async () => {
    render(<FormulaireDevis />);
    remplirLeNecessaire();
    remplir('Budget indicatif', '40000000');
    fireEvent.click(screen.getByRole('button', { name: /Demander mon devis/ }));

    await waitFor(() => expect(envoyer).toHaveBeenCalledTimes(1));
    expect(envoyer.mock.calls[0][0]).toMatchObject({
      nom: 'Awa Diop',
      typeProjet: 'villa',
      terrain: 'possede',
      commune: 'Saly',
      budget: 40000000,
      consentement: true,
    });
    expect(await screen.findByText(/votre demande est bien reçue/)).toBeTruthy();
  });
});
