import {
  CONSTRUCTION_DEFAULTS,
  JALONS_TYPE_LIBELLES,
  libelleJalonType,
} from './construction-options.service';

describe('libelleJalonType', () => {
  it('donne un libellé français à chaque étape du déroulé type', () => {
    // Sans cette table, le planning affichait « second_oeuvre » à l'écran.
    for (const code of CONSTRUCTION_DEFAULTS.jalonsType) {
      const libelle = libelleJalonType(code);
      expect(libelle).not.toContain('_');
      expect(libelle[0]).toBe(libelle[0].toUpperCase());
    }
  });

  it('accentue correctement les étapes qui le demandent', () => {
    expect(libelleJalonType('etudes_et_permis')).toBe('Études et permis');
    expect(libelleJalonType('elevation')).toBe('Élévation');
    expect(libelleJalonType('second_oeuvre')).toBe('Second œuvre');
    expect(libelleJalonType('reception')).toBe('Réception');
  });

  it('reste lisible pour un code ajouté dans les Paramètres', () => {
    // La section 25 permet d'étendre le référentiel sans développement : un
    // code inconnu doit s'afficher proprement, même sans ses accents.
    expect(libelleJalonType('mur_de_cloture')).toBe('Mur de cloture');
    expect(libelleJalonType('vrd')).toBe('Vrd');
  });

  it('couvre tout le déroulé type, sans libellé orphelin', () => {
    const codes = new Set<string>(CONSTRUCTION_DEFAULTS.jalonsType);
    for (const code of Object.keys(JALONS_TYPE_LIBELLES)) {
      expect(codes.has(code)).toBe(true);
    }
    expect(Object.keys(JALONS_TYPE_LIBELLES)).toHaveLength(codes.size);
  });
});
