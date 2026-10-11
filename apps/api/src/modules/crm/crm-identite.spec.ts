import { ForbiddenException } from '@nestjs/common';
import { createCrmTestContext } from './crm.test-support';
import {
  masquerIdentite,
  peutVoirIdentite,
  retirerIdentite,
} from './crm-identite';

const fiche = {
  id: 'p1',
  nom: 'Sow',
  dateNaissance: new Date('1974-11-03'),
  lieuNaissance: 'Pikine',
  typePieceIdentite: 'cni_cedeao',
  numeroPieceIdentite: '1 234 567 890',
};

describe('identité du client', () => {
  it('n’est visible qu’avec la permission crm:identite', () => {
    expect(peutVoirIdentite({ permissions: ['crm:identite'] })).toBe(true);
    expect(peutVoirIdentite({ permissions: ['crm:consulter'] })).toBe(false);
    expect(peutVoirIdentite({})).toBe(false);
  });

  it('retire les champs d’identité d’une fiche sans toucher au reste', () => {
    expect(retirerIdentite(fiche)).toEqual({ id: 'p1', nom: 'Sow' });
  });

  it('les retire aussi d’une liste et d’une fiche 360', () => {
    expect(retirerIdentite({ items: [fiche], total: 1 })).toEqual({
      items: [{ id: 'p1', nom: 'Sow' }],
      total: 1,
    });
    expect(retirerIdentite({ prospect: fiche, activites: [] })).toEqual({
      prospect: { id: 'p1', nom: 'Sow' },
      activites: [],
    });
  });

  it('rend la fiche entière à qui a la permission', () => {
    expect(masquerIdentite(fiche, { permissions: ['crm:identite'] })).toBe(
      fiche,
    );
    expect(masquerIdentite(fiche, { permissions: [] })).not.toHaveProperty(
      'numeroPieceIdentite',
    );
  });

  it('laisse intacts les valeurs vides et les dates', () => {
    expect(retirerIdentite(null)).toBeNull();
    const date = new Date();
    expect(retirerIdentite(date)).toBe(date);
  });
});

describe('CrmService — saisie de l’identité', () => {
  const dto = { nom: 'Sow', numeroPieceIdentite: '123' };

  it('refuse la saisie à qui n’a pas crm:identite', async () => {
    const { service, prismaMock } = createCrmTestContext();
    prismaMock.systemSetting.findUnique.mockResolvedValue(null);

    await expect(
      service.create(dto, {
        id: 'u1',
        roles: ['commercial'],
        permissions: ['crm:creer'],
      }),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.update('p1', dto, {
        id: 'u1',
        roles: ['commercial'],
        permissions: ['crm:modifier'],
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(prismaMock.prospect.create).not.toHaveBeenCalled();
  });
});
