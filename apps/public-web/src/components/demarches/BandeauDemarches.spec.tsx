import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BandeauDemarches, IMAGE_BANDEAU_DEMARCHES } from './BandeauDemarches';

function afficher(surcharges: Partial<Parameters<typeof BandeauDemarches>[0]> = {}) {
  const onDemande = vi.fn();
  render(
    <BandeauDemarches
      eyebrow="Nos services"
      title="Démarches administratives"
      description="Vous envisagez d'acheter un terrain ?"
      points={['Réponse sous 24 à 48h', 'Devis gratuit, sans engagement']}
      bouton="Faire une demande"
      image={IMAGE_BANDEAU_DEMARCHES}
      onDemande={onDemande}
      {...surcharges}
    />,
  );
  return onDemande;
}

describe('BandeauDemarches', () => {
  it('affiche les textes saisis, le titre en deux temps', () => {
    afficher();
    expect(screen.getByText('Nos services')).toBeInTheDocument();
    const titre = screen.getByRole('heading', { level: 1, name: 'Démarches administratives' });
    expect(titre.querySelectorAll('span')).toHaveLength(2);
    expect(titre.querySelectorAll('span')[1]).toHaveTextContent('administratives');
    expect(screen.getByText("Vous envisagez d'acheter un terrain ?")).toBeInTheDocument();
    expect(screen.getByText('Réponse sous 24 à 48h')).toBeInTheDocument();
    expect(screen.getByText('Devis gratuit, sans engagement')).toBeInTheDocument();
  });

  it('garde un titre d’un seul mot sur une seule ligne', () => {
    afficher({ title: 'Démarches' });
    expect(screen.getByRole('heading', { level: 1 }).querySelectorAll('span')).toHaveLength(1);
  });

  it('prend l’image de fond choisie, sinon la photo par défaut', () => {
    afficher({ image: 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/mtm/pages/fond' });
    expect(document.querySelector('img[src*="res.cloudinary.com"]')).not.toBeNull();
  });

  it('ouvre la demande depuis le bouton', async () => {
    const onDemande = afficher({ bouton: 'Déposer ma demande' });
    await userEvent.click(screen.getByRole('button', { name: 'Déposer ma demande' }));
    expect(onDemande).toHaveBeenCalledTimes(1);
  });
});
