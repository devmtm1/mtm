import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_STATUS,
  ACTIVITY_TYPES,
  CONTACT_CHANNELS,
  INTEREST_LEVELS,
  PARCOURS_CLIENT,
  PIPELINE,
  SOURCES,
  VISITE_STATUS,
  type StatusMeaning,
} from './crm-status';

const TONES = ['neutral', 'success', 'warning', 'danger', 'primary', 'info'];

/** Le parcours commercial livré par le seed (réglage « crm.pipelineStages »), dans l'ordre. */
const ETAPES_PARCOURS = ['nouveau', 'contacte', 'qualifie', 'visite_programmee', 'visite_effectuee', 'en_reflexion', 'a_relancer', 'negociation', 'reservation', 'vente', 'refuse', 'abandonne', 'injoignable'];

describe('référentiels du CRM', () => {
  it('le parcours commercial couvre exactement les étapes du seed, dans l’ordre', () => {
    expect(Object.keys(PIPELINE)).toEqual(ETAPES_PARCOURS);
  });

  it('seules les étapes finales négatives sont rouges, et la vente conclue est verte', () => {
    expect(PIPELINE['vente'].tone).toBe('success');
    for (const etape of ['refuse', 'abandonne', 'injoignable']) expect(PIPELINE[etape].tone, etape).toBe('danger');
    for (const etape of ETAPES_PARCOURS.filter((e) => !['refuse', 'abandonne', 'injoignable'].includes(e))) {
      expect(PIPELINE[etape].tone, etape).not.toBe('danger');
    }
  });

  it('les étapes qui se terminent mal demandent un motif', () => {
    for (const etape of ['refuse', 'abandonne', 'injoignable']) expect(PIPELINE[etape].help.toLowerCase(), etape).toContain('motif');
  });

  const tables: Record<string, Record<string, StatusMeaning>> = { PIPELINE, PARCOURS_CLIENT, SOURCES, INTEREST_LEVELS, CONTACT_CHANNELS, VISITE_STATUS, ACTIVITY_TYPES, ACTIVITY_STATUS };
  for (const [nom, table] of Object.entries(tables)) {
    it(`${nom} : chaque entrée a un libellé, une explication et une couleur valide`, () => {
      expect(Object.keys(table).length).toBeGreaterThan(1);
      for (const [cle, sens] of Object.entries(table)) {
        expect(sens.label.trim().length, `${nom} › ${cle} (libellé)`).toBeGreaterThan(0);
        expect(sens.help.trim().length, `${nom} › ${cle} (aide)`).toBeGreaterThan(5);
        expect(TONES, `${nom} › ${cle} (couleur)`).toContain(sens.tone);
      }
    });
  }

  it('aucun libellé n’est répété dans un même référentiel (deux choix identiques à l’écran)', () => {
    for (const [nom, table] of Object.entries(tables)) {
      const libelles = Object.values(table).map((sens) => sens.label);
      expect(new Set(libelles).size, nom).toBe(libelles.length);
    }
  });
});
