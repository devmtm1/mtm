import { AUDIT_ACTION_LABELS, auditActionLabel, entityLabel, fieldLabel, permissionActionLabel, relativeDate, requiresTwoFactor, roleLabel } from './admin-labels';

describe('admin-labels', () => {
  it('traduit les rôles techniques et garde un repli lisible', () => {
    expect(roleLabel('responsable_commercial')).toBe('Responsable commercial');
    expect(roleLabel('nouveau_role')).toBe('nouveau role');
  });

  it('impose la double authentification aux rôles sensibles seulement', () => {
    expect(requiresTwoFactor(['commercial'])).toBe(false);
    expect(requiresTwoFactor(['commercial', 'comptable'])).toBe(true);
  });

  it('traduit les actions du journal et les entités', () => {
    expect(auditActionLabel('vente.paiement.validated')).toBe('Paiement validé');
    expect(auditActionLabel('inconnu.action')).toBe('inconnu.action');
    expect(entityLabel('DossierVente')).toBe('Dossier de vente');
    expect(permissionActionLabel('consulter_financier')).toBe('Voir le financier');
  });

  it('couvre les actions émises par l’API sans doublon', () => {
    const keys = Object.keys(AUDIT_ACTION_LABELS);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain('auth.login.success');
    expect(keys).toContain('audit.exported');
  });

  it('libelle un chemin de champ', () => {
    expect(fieldLabel('statut')).toBe('Statut');
    expect(fieldLabel('terrain.prixPublic')).toBe('Terrain › Prix public');
  });

  it('formate une date relative', () => {
    expect(relativeDate(null)).toBe('Jamais');
    expect(relativeDate(new Date().toISOString())).toBe('À l’instant');
    expect(relativeDate(new Date(Date.now() - 3 * 86_400_000).toISOString())).toBe('Il y a 3 j');
  });
});
