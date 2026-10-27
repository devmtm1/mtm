import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormulaireConfierBien } from './FormulaireConfierBien';

const envoyer = vi.fn();
vi.mock('../../api/contact', () => ({ sendConfierBien: (payload: unknown) => envoyer(payload) }));

function remplir(etiquette: string, valeur: string) {
  fireEvent.change(screen.getByLabelText(new RegExp(etiquette)), { target: { value: valeur } });
}

function remplirLeNecessaire() {
  remplir('Nom complet', 'Awa Diop');
  remplir('Téléphone ou WhatsApp', '+221 77 000 00 00');
  remplir('E-mail', 'awa@exemple.sn');
  remplir('Type de bien', 'immeuble');
  remplir('Situation actuelle', 'libre');
  remplir('Commune ou quartier', 'Sacré-Cœur');
  fireEvent.click(screen.getByRole('checkbox'));
}

describe('FormulaireConfierBien', () => {
  beforeEach(() => {
    envoyer.mockReset();
    envoyer.mockResolvedValue({ success: true });
  });

  it('refuse l’envoi tant que les champs essentiels et le consentement manquent', async () => {
    render(<FormulaireConfierBien />);
    fireEvent.click(screen.getByRole('button', { name: /Envoyer ma demande/ }));

    expect(await screen.findByText('Indiquez votre nom.')).toBeTruthy();
    expect(screen.getByText('Choisissez le type de bien.')).toBeTruthy();
    expect(screen.getByText(/Acceptez le traitement/)).toBeTruthy();
    expect(envoyer).not.toHaveBeenCalled();
  });

  it('efface le message d’erreur d’un champ dès qu’il est corrigé', async () => {
    render(<FormulaireConfierBien />);
    fireEvent.click(screen.getByRole('button', { name: /Envoyer ma demande/ }));
    expect(await screen.findByText('Indiquez votre nom.')).toBeTruthy();

    remplir('Nom complet', 'Awa Diop');
    expect(screen.queryByText('Indiquez votre nom.')).toBeNull();
    // les autres erreurs restent tant que leurs champs ne sont pas corrigés
    expect(screen.getByText('Choisissez le type de bien.')).toBeTruthy();
  });

  it('envoie la demande structurée et remercie le propriétaire', async () => {
    render(<FormulaireConfierBien />);
    remplirLeNecessaire();
    remplir('Nombre de logements', '4');
    fireEvent.click(screen.getByRole('button', { name: /Envoyer ma demande/ }));

    await waitFor(() => expect(envoyer).toHaveBeenCalledTimes(1));
    expect(envoyer.mock.calls[0][0]).toMatchObject({
      nom: 'Awa Diop',
      telephone: '+221 77 000 00 00',
      typeBien: 'immeuble',
      situation: 'libre',
      commune: 'Sacré-Cœur',
      nombreLogements: 4,
      consentement: true,
    });
    expect(await screen.findByText(/votre demande est bien reçue/)).toBeTruthy();
  });

  it('ne demande le nombre de logements que pour un immeuble ou une villa divisée', () => {
    render(<FormulaireConfierBien />);
    expect(screen.queryByLabelText(/Nombre de logements/)).toBeNull();
    remplir('Type de bien', 'immeuble');
    expect(screen.getByLabelText(/Nombre de logements/)).toBeTruthy();
    remplir('Type de bien', 'appartement');
    expect(screen.queryByLabelText(/Nombre de logements/)).toBeNull();
  });
});
