import { describe, expect, it } from 'vitest';
import type { ContactMessage } from '../../core/services/api/contact-api.service';
import { cheminCreation, preparerDepuisDemande, separerNom } from './demande-gestion';

const demande = (details: ContactMessage['details'], nom = 'Awa Diop Fall'): ContactMessage => ({
  id: 'c1',
  nom,
  email: 'awa@exemple.sn',
  telephone: '+221 77 000 00 00',
  type: 'confier_bien',
  message: 'Villa divisée en quatre appartements.',
  lu: false,
  createdAt: '2026-10-27T10:00:00Z',
  details,
});

describe('demande « Confier mon bien » → fiches', () => {
  it('sépare le prénom du nom, et garde un nom unique comme nom', () => {
    expect(separerNom('Awa Diop Fall')).toEqual({ firstName: 'Awa', lastName: 'Diop Fall' });
    expect(separerNom('  Moussa ')).toEqual({ firstName: 'Moussa', lastName: 'Moussa' });
  });

  it('prépare une propriété pour un immeuble ou une villa divisée', () => {
    const prepa = preparerDepuisDemande(
      demande({
        typeBien: 'immeuble',
        commune: 'Sacré-Cœur',
        region: 'Dakar',
        nombreLogements: 4,
        loyerSouhaite: 250000,
      }),
    );
    expect(prepa.estImmeuble).toBe(true);
    expect(prepa.nombreLogements).toBe(4);
    expect(prepa.loyerSouhaite).toBe(250000);
    expect(prepa.adresse).toBe('Sacré-Cœur, Dakar');
    expect(prepa.proprietaire).toMatchObject({
      firstName: 'Awa',
      lastName: 'Diop Fall',
      phone: '+221 77 000 00 00',
    });
    expect(cheminCreation(demande({ typeBien: 'immeuble' }))).toEqual([
      '/locatif/immeubles/nouveau',
    ]);
  });

  it('prépare un bien isolé pour tout autre type, avec la courte durée à part', () => {
    const villa = preparerDepuisDemande(demande({ typeBien: 'villa', commune: 'Saly' }));
    expect(villa.estImmeuble).toBe(false);
    expect(villa.typeBien).toBe('villa');
    expect(cheminCreation(demande({ typeBien: 'villa' }))).toEqual(['/locatif/biens/nouveau']);

    const sejour = preparerDepuisDemande(demande({ typeBien: 'courte_duree', commune: 'Saly' }));
    expect(sejour.courteDuree).toBe(true);
    expect(sejour.typeBien).toBe('appartement');
  });
});
