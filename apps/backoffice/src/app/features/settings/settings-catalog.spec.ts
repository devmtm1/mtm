import { SETTING_GROUPS, inferKind, settingSlotByKey } from './settings-catalog';

describe('settings-catalog', () => {
  it('retrouve un paramètre par sa clé', () => {
    expect(settingSlotByKey('reservations.dureeBlocageJours')?.kind).toBe('number');
    expect(settingSlotByKey('inconnu')).toBeUndefined();
  });

  it('ne déclare chaque clé qu’une fois', () => {
    const keys = SETTING_GROUPS.flatMap((group) => group.slots.map((slot) => slot.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('devine le type de saisie d’une valeur hors catalogue', () => {
    expect(inferKind(15)).toBe('number');
    expect(inferKind(['a', 'b'])).toBe('list');
    expect(inferKind('texte')).toBe('text');
    expect(inferKind({ a: 1 })).toBe('json');
    expect(inferKind([{ a: 1 }])).toBe('json');
  });
});
