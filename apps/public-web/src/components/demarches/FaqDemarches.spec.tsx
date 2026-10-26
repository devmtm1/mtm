import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { donneesFaq } from '../../utils/seo';
import { FaqDemarches } from './FaqDemarches';

const questions = [
  { title: 'Le devis est-il payant ?', description: 'Non. Le devis est gratuit et sans engagement.' },
  { title: 'Sous quel délai répondez-vous ?', description: 'Sous 24 à 48h.' },
];

describe('FaqDemarches', () => {
  it('liste les questions, la première ouverte, les autres repliées', () => {
    render(<FaqDemarches questions={questions} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    const volets = document.querySelectorAll('details');
    expect(volets[0]).toHaveAttribute('open');
    expect(volets[1]).not.toHaveAttribute('open');
  });

  it('déplie une réponse au clic', async () => {
    render(<FaqDemarches questions={questions} />);
    await userEvent.click(screen.getByText('Sous quel délai répondez-vous ?'));
    expect(document.querySelectorAll('details')[1]).toHaveAttribute('open');
  });
});

describe('donneesFaq', () => {
  it('décrit les questions pour les moteurs de recherche', () => {
    const donnees = donneesFaq(questions) as { '@type': string; mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    expect(donnees['@type']).toBe('FAQPage');
    expect(donnees.mainEntity).toHaveLength(2);
    expect(donnees.mainEntity[0].acceptedAnswer.text).toContain('gratuit');
  });

  it('ne décrit rien sans réponse', () => {
    expect(donneesFaq([{ title: 'Sans réponse' }])).toBeUndefined();
    expect(donneesFaq([])).toBeUndefined();
  });
});
