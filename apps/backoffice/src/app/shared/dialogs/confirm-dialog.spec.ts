import { libelleAction } from './confirm-dialog';

describe('libelleAction', () => {
  it('reprend le verbe du message pour nommer le bouton', () => {
    expect(libelleAction('Supprimer ce document ?')).toBe('Supprimer');
    expect(libelleAction('Retirer cette annonce du site ?')).toBe('Retirer');
  });

  it('retombe sur « Confirmer » pour une action non destructive', () => {
    expect(libelleAction('Marquer cette commission comme payée ?')).toBe('Confirmer');
    expect(libelleAction('')).toBe('Confirmer');
  });
});
