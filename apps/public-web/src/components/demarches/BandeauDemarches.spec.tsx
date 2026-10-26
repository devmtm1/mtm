import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IMAGE_BANDEAU_DEMARCHES, decouperEngagement } from '../../utils/demarches';
import { BandeauDemarches } from './BandeauDemarches';

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
    // Chaque engagement est coupé en deux lignes, la fin en rouge.
    expect(screen.getByText('Réponse sous')).toBeInTheDocument();
    expect(screen.getByText('24 à 48h')).toHaveClass('text-[#C8102E]');
    expect(screen.getByText('Devis gratuit,')).toBeInTheDocument();
    expect(screen.getByText('sans engagement')).toHaveClass('text-[#C8102E]');
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

  it('coupe les engagements sans jamais changer le texte saisi', () => {
    expect(decouperEngagement('Réponse sous 24 à 48h')).toEqual({ haut: 'Réponse sous', bas: '24 à 48h', rouge: true });
    expect(decouperEngagement('Devis gratuit, sans engagement')).toEqual({ haut: 'Devis gratuit,', bas: 'sans engagement', rouge: true });
    expect(decouperEngagement("Tarif adapté à la nature et à l'urgence de la vérification")).toEqual({
      haut: 'Tarif adapté',
      bas: "à la nature et à l'urgence de la vérification",
      rouge: false,
    });
    expect(decouperEngagement('Suivi à distance')).toEqual({ haut: 'Suivi à distance', bas: null, rouge: false });
  });
});
