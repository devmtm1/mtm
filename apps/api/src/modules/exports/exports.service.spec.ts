import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ExportTableauDto } from './exports.dto';
import {
  ExportsService,
  construireRapport,
  nettoyerCellule,
} from './exports.service';

const societe = {
  name: 'MTM Immobilier',
  tagline: 'Immobilier et construction',
  adresse: 'Dakar',
  telephone: '',
  email: '',
};

const dto: ExportTableauDto = {
  module: 'terrains',
  titre: 'Biens à vendre',
  format: 'xlsx',
  justification: 'Point hebdomadaire',
  colonnes: [
    { cle: 'nom', libelle: 'Bien', type: 'texte' },
    { cle: 'prix', libelle: 'Prix (FCFA)', type: 'montant' },
  ],
  lignes: [
    { nom: 'Terrain A', prix: 5000000, intrus: 'ignoré' },
    { nom: '=HYPERLINK("http://x")', prix: 'abc' },
  ],
};

function utilisateur(permissions: string[]): AuthenticatedUser {
  return {
    id: 'u1',
    email: 'a@mtm.sn',
    telephone: null,
    firstName: 'A',
    lastName: 'B',
    roles: ['commercial'],
    permissions,
    mustChangePassword: false,
    twoFactorEnabled: false,
  };
}

describe('ExportTableauDto', () => {
  it('garde les lignes comme des objets avec la conversion implicite du ValidationPipe', async () => {
    const corps = plainToInstance(
      ExportTableauDto,
      { ...dto, lignes: [{ nom: 'Terrain A', prix: 5000000 }, { nom: null }] },
      { enableImplicitConversion: true },
    );
    expect(
      await validate(corps, { whitelist: true, forbidNonWhitelisted: true }),
    ).toEqual([]);
    expect(corps.lignes[0]).toEqual({ nom: 'Terrain A', prix: 5000000 });
  });
});

describe('ExportsService', () => {
  const audit = { record: jest.fn() };
  const company = { getSociete: jest.fn() };
  let service: ExportsService;

  beforeEach(() => {
    jest.resetAllMocks();
    company.getSociete.mockResolvedValue(societe);
    service = new ExportsService(audit as never, company as never);
  });

  it('nettoie les cellules reçues de l’écran', () => {
    expect(nettoyerCellule(' texte ')).toBe('texte');
    expect(nettoyerCellule('')).toBeNull();
    expect(nettoyerCellule(12)).toBe(12);
    expect(nettoyerCellule(Number.NaN)).toBeNull();
    expect(nettoyerCellule(true)).toBe('Oui');
    expect(nettoyerCellule({ a: 1 })).toBeNull();
    expect(nettoyerCellule('x'.repeat(5000))).toHaveLength(2000);
  });

  it('ne garde que les colonnes déclarées', () => {
    const rapport = construireRapport(dto);
    expect(rapport.sections[0].lignes[0]).toEqual({
      nom: 'Terrain A',
      prix: 5000000,
    });
    expect(rapport.resume[0].valeur).toBe('2');
  });

  it('refuse l’export sans le droit « exporter » de la liste', async () => {
    await expect(
      service.exporterTableau(dto, utilisateur(['terrains:consulter'])),
    ).rejects.toThrow(ForbiddenException);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('produit un classeur Excel et trace l’export', async () => {
    const resultat = await service.exporterTableau(
      dto,
      utilisateur(['terrains:exporter']),
    );
    expect(resultat.nom).toMatch(/^biens-a-vendre_\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(resultat.type).toContain('spreadsheetml');
    // Un classeur xlsx est une archive zip : « PK ».
    expect(resultat.contenu.subarray(0, 2).toString()).toBe('PK');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'liste.export',
        entityId: 'terrains',
        justification: 'Point hebdomadaire',
        newValue: expect.objectContaining({ lignes: 2, format: 'xlsx' }),
      }),
    );
  });

  it('produit un PDF', async () => {
    const resultat = await service.exporterTableau(
      { ...dto, format: 'pdf' },
      utilisateur(['terrains:exporter']),
    );
    expect(resultat.nom.endsWith('.pdf')).toBe(true);
    expect(resultat.contenu.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('le droit d’un programme est celui des biens', async () => {
    const resultat = await service.exporterTableau(
      { ...dto, module: 'programmes' },
      utilisateur(['terrains:exporter']),
    );
    expect(resultat.contenu.length).toBeGreaterThan(100);
  });
});
