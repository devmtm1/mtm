import { describe, expect, it } from 'vitest';
import { completudeFiche, validitePiece, type DonneesFiche } from './fiche-client';

const complete: DonneesFiche = {
  prenom: 'Awa',
  nom: 'Ba',
  telephone: '771234567',
  email: 'awa@exemple.sn',
  adresse: 'Rue 12',
  dateNaissance: '1990-01-01',
  nationalite: 'Sénégalaise',
  typePiece: 'cni_cedeao',
  numeroPiece: '123',
  pieceValiditeLe: '2031-01-01',
  urgenceNom: 'Moussa',
  urgenceTelephone: '779876543',
  pieceUrl: 'https://x/pdf',
};

describe('completudeFiche', () => {
  it('compte 100 % une fiche entièrement renseignée', () => {
    expect(completudeFiche(complete, true)).toMatchObject({ pourcentage: 100, manquants: [] });
  });

  it('liste ce qui manque, dans l’ordre de la fiche', () => {
    const resultat = completudeFiche(
      { prenom: 'Alassane', nom: 'Sow', telephone: '772766798' },
      false,
    );
    expect(resultat.manquants).toEqual([
      'E-mail',
      'Adresse',
      'Date de naissance',
      'Nationalité',
      'Type de pièce',
      'Numéro de pièce',
      'Validité de la pièce',
      'Personne à prévenir',
    ]);
    expect(resultat.pourcentage).toBe(27);
  });

  it('n’attend la copie PDF que pour les fiches qui la portent', () => {
    const sansPdf = { ...complete, pieceUrl: null };
    expect(completudeFiche(sansPdf, false).pourcentage).toBe(100);
    expect(completudeFiche(sansPdf, true).manquants).toEqual(['Copie de la pièce (PDF)']);
  });

  it('exige le nom ET le téléphone de la personne à prévenir', () => {
    const resultat = completudeFiche({ ...complete, urgenceTelephone: '' }, false);
    expect(resultat.manquants).toEqual(['Personne à prévenir']);
  });

  it('ignore les espaces : un champ blanc est un champ vide', () => {
    expect(completudeFiche({ ...complete, adresse: '   ' }, false).manquants).toEqual(['Adresse']);
  });
});

describe('validitePiece', () => {
  const aujourdhui = new Date(2026, 9, 29);

  it('ne dit rien sans date', () => {
    expect(validitePiece(null, aujourdhui)).toEqual({ etat: 'inconnue' });
    expect(validitePiece('pas une date', aujourdhui)).toEqual({ etat: 'inconnue' });
  });

  it('signale une pièce expirée, avec le nombre de jours de retard', () => {
    expect(validitePiece('2026-10-19', aujourdhui)).toEqual({ etat: 'expiree', jours: 10 });
  });

  it('prévient quand la pièce expire dans moins de 60 jours', () => {
    expect(validitePiece('2026-12-01', aujourdhui)).toEqual({ etat: 'bientot', jours: 33 });
  });

  it('une pièce qui expire aujourd’hui est encore valable', () => {
    expect(validitePiece('2026-10-29', aujourdhui)).toEqual({ etat: 'bientot', jours: 0 });
  });

  it('ne signale rien pour une pièce valable longtemps', () => {
    expect(validitePiece('2030-01-01', aujourdhui).etat).toBe('valide');
  });
});
