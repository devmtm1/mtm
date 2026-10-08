import { describe, expect, it } from 'vitest';
import { caracteristiques, faitsEssentiels, prixAuM2 } from './terrainFacts';
import type { Terrain } from '../types/terrain';

const base: Terrain = {
  id: 't1',
  statutCommercial: 'Disponible',
  venduLe: null,
  referenceInterne: 'MTM-TH-001',
  nom: 'Parcelle',
  statutJuridique: 'Titre foncier',
  niveauVerification: 'Vérifié',
  region: 'Thiès',
  commune: 'Saly',
  localisationDetail: null,
  latitude: null,
  longitude: null,
  typeBien: 'terrain',
  superficie: 300,
  uniteSuperficie: 'm²',
  dimensions: null,
  surfaceHabitable: null,
  nombrePieces: null,
  nombreChambres: null,
  nombreSallesEau: null,
  niveaux: null,
  anneeConstruction: null,
  etatBien: null,
  prixPublic: 15000000,
  misEnAvant: false,
  description: null,
  accesRoutier: null,
  eauDisponible: null,
  electriciteDisponible: null,
  voisinage: null,
  vocation: null,
  proximiteAxes: null,
  pointsInteret: null,
  medias: [],
  documents: [],
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

const villa: Terrain = {
  ...base,
  typeBien: 'villa',
  superficie: 400,
  surfaceHabitable: 220,
  nombrePieces: 'F5',
  nombreChambres: 4,
  nombreSallesEau: 3,
  niveaux: 2,
  anneeConstruction: 2021,
  prixPublic: 120000000,
};

describe('prixAuM2', () => {
  it('divise le prix d’une parcelle par sa superficie', () => {
    expect(prixAuM2(base)).toBe(50000);
  });

  it('convertit les hectares', () => {
    expect(prixAuM2({ ...base, superficie: 1, uniteSuperficie: 'ha', prixPublic: 20000000 })).toBe(2000);
  });

  it('n’affiche rien pour un bien bâti, une unité inconnue ou un prix sur demande', () => {
    expect(prixAuM2(villa)).toBeNull();
    expect(prixAuM2({ ...base, uniteSuperficie: 'lot' })).toBeNull();
    expect(prixAuM2({ ...base, prixPublic: null })).toBeNull();
    expect(prixAuM2({ ...base, superficie: 0 })).toBeNull();
  });
});

describe('faitsEssentiels', () => {
  it('pour une parcelle : surface, usage et prix au m² (le statut juridique a son encart)', () => {
    const faits = faitsEssentiels({ ...base, vocation: 'residentiel' });
    expect(faits.map((fait) => fait.key)).toEqual(['superficie', 'vocation', 'prixM2']);
    expect(faits.find((fait) => fait.key === 'vocation')?.value).toBe('Résidentiel');
  });

  it('pour une villa : habitable, type et chambres, salles d’eau, terrain', () => {
    const faits = faitsEssentiels(villa);
    expect(faits.map((fait) => fait.key)).toEqual(['habitable', 'pieces', 'eau', 'parcelle']);
    expect(faits.find((fait) => fait.key === 'pieces')?.value).toBe('F5 · 4 chambres');
  });

  it('n’affiche pas ce qui n’est pas renseigné', () => {
    const faits = faitsEssentiels({ ...villa, surfaceHabitable: null, nombreSallesEau: null });
    expect(faits.map((fait) => fait.key)).toEqual(['pieces', 'parcelle']);
  });

  it('au plus quatre repères', () => {
    expect(faitsEssentiels(villa).length).toBeLessThanOrEqual(4);
  });
});

describe('caracteristiques', () => {
  it('ne montre aucune ligne vide ni aucun groupe vide', () => {
    expect(caracteristiques({ ...base, superficie: null })).toEqual([]);
    const [groupe] = caracteristiques(base);
    expect(groupe.titre).toBe('La parcelle');
    expect(groupe.lignes).toHaveLength(1);
  });

  it('regroupe : le bien, le terrain, les équipements', () => {
    const groupes = caracteristiques({ ...villa, accesRoutier: 'Route goudronnée', eauDisponible: true, electriciteDisponible: false });
    expect(groupes.map((groupe) => groupe.titre)).toEqual(['Le bien', 'Le terrain', 'Équipements']);
    const equipements = groupes[2].lignes;
    expect(equipements).toEqual([
      { label: 'Eau', value: 'Disponible', etat: 'oui' },
      { label: 'Électricité', value: 'Non disponible', etat: 'non' },
    ]);
  });
});
