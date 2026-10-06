import { BadRequestException } from '@nestjs/common';
import { annonceData, verifierPublication } from './annonce.helper';

describe('annonceData', () => {
  it('n’écrit que les champs fournis : un champ absent n’écrase rien', () => {
    expect(annonceData({})).toEqual({});
    expect(annonceData({ loyerMensuel: 250000 })).toEqual({
      loyerMensuel: 250000,
    });
  });

  it('un loyer à zéro est une valeur, pas une absence', () => {
    expect(annonceData({ charges: 0, nombreChambres: 0 })).toEqual({
      charges: 0,
      nombreChambres: 0,
    });
  });

  it('nettoie les équipements : espaces, vides et doublons', () => {
    expect(
      annonceData({
        equipements: [' Parking ', '', 'Climatisation', 'Parking'],
      }),
    ).toEqual({ equipements: ['Parking', 'Climatisation'] });
  });

  it('un titre ou une description vides effacent la valeur', () => {
    expect(annonceData({ titre: '   ', description: '' })).toEqual({
      titre: null,
      description: null,
    });
  });

  it('convertit la date de disponibilité, et la vide si on la retire', () => {
    const { disponibleLe } = annonceData({ disponibleLe: '2026-11-15' });
    expect(disponibleLe).toEqual(new Date('2026-11-15'));
    expect(annonceData({ disponibleLe: '' }).disponibleLe).toBeNull();
  });

  it('ne touche jamais à la publication : elle a ses propres conditions', () => {
    expect(annonceData({ publie: true, misEnAvant: true })).toEqual({});
  });
});

describe('verifierPublication', () => {
  it('accepte un bien avec un loyer et une photo', () => {
    expect(() =>
      verifierPublication({ loyerMensuel: 300000, nombrePhotos: 1 }),
    ).not.toThrow();
  });

  it.each([null, 0])('refuse un loyer de %p', (loyerMensuel) => {
    expect(() =>
      verifierPublication({ loyerMensuel, nombrePhotos: 3 }),
    ).toThrow(/loyer/);
  });

  it('refuse un bien sans photo', () => {
    expect(() =>
      verifierPublication({ loyerMensuel: 300000, nombrePhotos: 0 }),
    ).toThrow(BadRequestException);
    expect(() =>
      verifierPublication({ loyerMensuel: 300000, nombrePhotos: 0 }),
    ).toThrow(/photo/);
  });
});
