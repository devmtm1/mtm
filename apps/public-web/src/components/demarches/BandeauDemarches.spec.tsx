import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BandeauDemarches } from './BandeauDemarches';

function afficher(onDemande = vi.fn()) {
  render(
    <BandeauDemarches
      description="Vous envisagez d'acheter un terrain ?"
      reassurance={['Réponse sous 24 à 48h', 'Devis gratuit, sans engagement']}
      onDemande={onDemande}
    />,
  );
  return onDemande;
}

describe('BandeauDemarches', () => {
  it("garde un vrai titre, la description et les engagements pour les lecteurs d'écran", () => {
    afficher();
    expect(screen.getByRole('heading', { level: 1, name: 'Démarches administratives' })).toBeInTheDocument();
    expect(screen.getByText("Vous envisagez d'acheter un terrain ?")).toBeInTheDocument();
    expect(screen.getByText('Réponse sous 24 à 48h')).toBeInTheDocument();
  });

  it("affiche l'image de la marque telle quelle", () => {
    afficher();
    expect(document.querySelector('img[src="/bandeaux/demarches.jpg"]')).not.toBeNull();
  });

  it('ouvre la demande depuis le bouton posé sur l’image', async () => {
    const onDemande = afficher();
    const boutons = screen.getAllByRole('button', { name: 'Faire une demande', hidden: true });
    await userEvent.click(boutons[0]);
    expect(onDemande).toHaveBeenCalledTimes(1);
  });
});
