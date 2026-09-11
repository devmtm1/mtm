/**
 * Double de test in-memory reproduisant le sous-ensemble de l'API Prisma
 * réellement utilisé par les services de la Phase 0. Ce n'est PAS un
 * mock au sens "jest.fn()" : c'est une base de données en mémoire
 * minimale, suffisante pour exercer le vrai câblage HTTP de bout en bout
 * (guards, ValidationPipe, contrôleurs, services) dans les tests e2e de
 * ce sandbox, où le client Prisma généré n'est pas disponible (voir
 * apps/api/prisma/PRISMA_NOTES.md).
 *
 * Ne reproduit PAS la sémantique SQL réelle (jointures complexes,
 * contraintes de clé étrangère, etc.) — uniquement les formes d'appels
 * utilisées par le code de ce projet.
 */

interface FakeUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  mustChangePassword: boolean;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeRole {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface FakePermission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string | null;
  createdAt: Date;
}

interface FakeProspect {
  id: string;
  nom: string;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  paysResidence: string | null;
  sourceAcquisition: string | null;
  besoins: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  preferences: string | null;
  commercialResponsableId: string | null;
  statutPipeline: string;
  score: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeActiviteCrm {
  id: string;
  prospectId: string;
  type: string;
  titre: string;
  description: string | null;
  dateEcheance: Date | null;
  dateRealisation: Date | null;
  statut: string;
  priorite: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeDocumentCrm {
  id: string;
  prospectId: string;
  type: string;
  title: string | null;
  isPublic: boolean;
  storageKey: string;
  resourceType: string;
  url: string | null;
  version: number;
  createdAt: Date;
}

interface FakeDossierVente {
  id: string;
  prospectId: string;
  terrainId: string | null;
  mandatId: string | null;
  commercialResponsableId: string | null;
  referenceInterne: string | null;
  prixVente: number | null;
  commissionEstimee: number | null;
  notes: string | null;
  statut: string;
  dateVente: Date | null;
  reservationRequestId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeTerrain {
  id: string;
  referenceInterne: string;
  nom: string;
  parcelleMatricule: string | null;
  informationsCadastrales: unknown;
  proprietaireId: string | null;
  statutJuridique: string;
  typeDocumentFoncier: string | null;
  niveauVerification: string;
  region: string | null;
  commune: string | null;
  localisationDetail: string | null;
  latitude: number | null;
  longitude: number | null;
  superficie: number | null;
  uniteSuperficie: string | null;
  dimensions: unknown;
  prixAcquisition: number | null;
  prixPublic: number | null;
  marge: number | null;
  commission: number | null;
  statutCommercial: string;
  misEnAvant: boolean;
  accesRoutier: string | null;
  eauDisponible: boolean | null;
  electriciteDisponible: boolean | null;
  voisinage: string | null;
  vocation: string | null;
  proximiteAxes: string | null;
  pointsInteret: unknown;
  notesInternes: string | null;
  commercialResponsableId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeProprietaire {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeMandat {
  id: string;
  referenceInterne: string;
  proprietaireId: string;
  commercialResponsableId: string | null;
  typeMandat: string;
  dateDebut: Date;
  dateFin: Date;
  exclusivite: boolean;
  prixConditions: string | null;
  commissions: string | null;
  clauses: string | null;
  restrictionsContractuelles: unknown;
  objectifsCommercialisation: string | null;
  alerteEcheanceJours: number;
  statut: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeMandatLot {
  id: string;
  mandatId: string;
  terrainId: string;
  statutLot: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeReservation {
  id: string;
  dossierVenteId: string;
  montantAcompte: number;
  dureeBlocageJours: number;
  dateDebut: Date;
  dateExpiration: Date;
  conditionsAnnulation: string | null;
  statut: string;
  reference: string | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeEcheancePaiement {
  id: string;
  dossierVenteId: string;
  numero: number;
  dateEcheance: Date;
  montantPrevu: number;
  montantPaye: number;
  statut: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FakePaiement {
  id: string;
  dossierVenteId: string;
  montant: number;
  datePaiement: Date;
  mode: string;
  reference: string | null;
  justificatifUrl: string | null;
  statut: string;
  notes: string | null;
  recordedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeCommissionVente {
  id: string;
  dossierVenteId: string;
  commercialId: string;
  typeRegle: string;
  taux: number | null;
  montantFixe: number | null;
  palier: number | null;
  bonus: number | null;
  montantEstime: number;
  montantValide: number | null;
  montantPaye: number | null;
  statut: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeDocumentVente {
  id: string;
  dossierVenteId: string;
  type: string;
  storageKey: string;
  resourceType: string;
  title: string | null;
  isGenerated: boolean;
  isPublic: boolean;
  version: number;
  createdById: string | null;
  createdAt: Date;
}

interface FakeSystemSetting {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  isSensitive: boolean;
  updatedById: string | null;
  updatedAt: Date;
  createdAt: Date;
}

interface FakeContact {
  id: string;
  terrainId: string | null;
  nom: string;
  email: string;
  telephone: string | null;
  sujet: string | null;
  message: string;
  lu: boolean;
  createdAt: Date;
}

import { randomUUID } from 'crypto';

function fakeUuid(): string {
  return randomUUID();
}

/** Convertit une valeur primitive en chaîne pour une comparaison `contains`, sans jamais stringifier un objet. */
function toSearchable(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

export class FakePrismaService {
  users = new Map<string, FakeUser>();
  roles = new Map<string, FakeRole>();
  permissions = new Map<string, FakePermission>();
  userRoles: { userId: string; roleId: string }[] = [];
  rolePermissions: { roleId: string; permissionId: string }[] = [];
  auditLogs: {
    id: string;
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    oldValue?: unknown;
    newValue?: unknown;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
  }[] = [];
  refreshTokens = new Map<
    string,
    {
      id: string;
      tokenHash: string;
      userId: string;
      expiresAt: Date;
      revokedAt: Date | null;
      createdAt: Date;
    }
  >();

  prospects = new Map<string, FakeProspect>();
  activitesCrm = new Map<string, FakeActiviteCrm>();
  documentsCrm = new Map<string, FakeDocumentCrm>();
  terrains = new Map<string, FakeTerrain>();
  proprietaires = new Map<string, FakeProprietaire>();
  mandats = new Map<string, FakeMandat>();
  mandatLots = new Map<string, FakeMandatLot>();
  dossiersVente = new Map<string, FakeDossierVente>();
  reservations = new Map<string, FakeReservation>();
  echeancesPaiement = new Map<string, FakeEcheancePaiement>();
  paiements = new Map<string, FakePaiement>();
  commissionsVente = new Map<string, FakeCommissionVente>();
  documentsVente = new Map<string, FakeDocumentVente>();
  systemSettings = new Map<string, FakeSystemSetting>();
  contacts = new Map<string, FakeContact>();

  // --- Aides de seed pour les tests ---

  seedUser(
    partial: Partial<FakeUser> & { email: string; password: string },
  ): FakeUser {
    const user: FakeUser = {
      id: fakeUuid(),
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
      twoFactorEnabled: false,
      twoFactorSecret: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...partial,
    };
    this.users.set(user.id, user);
    return user;
  }

  seedRole(name: string, isSystem = false): FakeRole {
    const role: FakeRole = {
      id: fakeUuid(),
      name,
      description: null,
      isSystem,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.roles.set(role.id, role);
    return role;
  }

  seedPermission(name: string): FakePermission {
    const [resource, action] = name.split(':');
    const permission: FakePermission = {
      id: fakeUuid(),
      name,
      resource,
      action,
      description: null,
      createdAt: new Date(),
    };
    this.permissions.set(permission.id, permission);
    return permission;
  }

  seedProspect(partial: Partial<FakeProspect> = {}): FakeProspect {
    const prospect: FakeProspect = {
      id: fakeUuid(),
      nom: '',
      prenom: null,
      email: null,
      telephone: null,
      paysResidence: null,
      sourceAcquisition: null,
      besoins: null,
      budgetMin: null,
      budgetMax: null,
      preferences: null,
      commercialResponsableId: null,
      statutPipeline: 'nouveau_contact',
      score: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...partial,
    };
    this.prospects.set(prospect.id, prospect);
    return prospect;
  }

  seedContact(partial: Partial<FakeContact> = {}): FakeContact {
    const contact: FakeContact = {
      id: fakeUuid(),
      terrainId: null,
      nom: '',
      email: '',
      telephone: null,
      sujet: null,
      message: '',
      lu: false,
      createdAt: new Date(),
      ...partial,
    };
    this.contacts.set(contact.id, contact);
    return contact;
  }

  createContact(partial: Partial<FakeContact> = {}): FakeContact {
    return this.seedContact(partial);
  }

  seedProprietaire(partial: Partial<FakeProprietaire> = {}): FakeProprietaire {
    const proprietaire: FakeProprietaire = {
      id: fakeUuid(),
      firstName: 'Proprietaire',
      lastName: 'Test',
      email: null,
      phone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...partial,
    };
    this.proprietaires.set(proprietaire.id, proprietaire);
    return proprietaire;
  }

  seedSystemSetting(
    partial: Partial<FakeSystemSetting> = {},
  ): FakeSystemSetting {
    const setting: FakeSystemSetting = {
      id: fakeUuid(),
      key: '',
      value: null,
      description: null,
      isSensitive: false,
      updatedById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...partial,
    };
    this.systemSettings.set(setting.key, setting);
    return setting;
  }

  linkUserRole(userId: string, roleId: string): void {
    this.userRoles.push({ userId, roleId });
  }

  linkRolePermission(roleId: string, permissionId: string): void {
    this.rolePermissions.push({ roleId, permissionId });
  }

  private buildUserWithRoles(user: FakeUser) {
    const roleLinks = this.userRoles.filter((ur) => ur.userId === user.id);
    return {
      ...user,
      roles: roleLinks.map((link) => {
        const role = this.roles.get(link.roleId)!;
        const permLinks = this.rolePermissions.filter(
          (rp) => rp.roleId === role.id,
        );
        return {
          role: {
            name: role.name,
            permissions: permLinks.map((pl) => ({
              permission: { name: this.permissions.get(pl.permissionId)!.name },
            })),
          },
        };
      }),
    };
  }

  // --- API façon Prisma ---

  terrain = {
    findUnique: ({
      where,
    }: {
      where: { id?: string; referenceInterne?: string };
    }) => {
      const terrain = where.id
        ? this.terrains.get(where.id)
        : Array.from(this.terrains.values()).find(
            (t) => t.referenceInterne === where.referenceInterne,
          );
      return Promise.resolve(terrain ?? null);
    },
    create: ({ data }: { data: Partial<FakeTerrain> }) => {
      const terrain: FakeTerrain = {
        id: data.id ?? fakeUuid(),
        referenceInterne:
          data.referenceInterne ?? `T-${fakeUuid().slice(0, 8)}`,
        nom: data.nom ?? 'Terrain',
        parcelleMatricule: data.parcelleMatricule ?? null,
        informationsCadastrales: data.informationsCadastrales ?? null,
        proprietaireId: data.proprietaireId ?? null,
        statutJuridique: data.statutJuridique ?? 'Titre foncier',
        typeDocumentFoncier: data.typeDocumentFoncier ?? null,
        niveauVerification: data.niveauVerification ?? 'Vérifié',
        region: data.region ?? null,
        commune: data.commune ?? null,
        localisationDetail: data.localisationDetail ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        superficie: data.superficie ?? null,
        uniteSuperficie: data.uniteSuperficie ?? null,
        dimensions: data.dimensions ?? null,
        prixAcquisition: data.prixAcquisition ?? null,
        prixPublic: data.prixPublic ?? null,
        marge: data.marge ?? null,
        commission: data.commission ?? null,
        statutCommercial: data.statutCommercial ?? 'Disponible',
        misEnAvant: data.misEnAvant ?? false,
        accesRoutier: data.accesRoutier ?? null,
        eauDisponible: data.eauDisponible ?? null,
        electriciteDisponible: data.electriciteDisponible ?? null,
        voisinage: data.voisinage ?? null,
        vocation: data.vocation ?? null,
        proximiteAxes: data.proximiteAxes ?? null,
        pointsInteret: data.pointsInteret ?? null,
        notesInternes: data.notesInternes ?? null,
        commercialResponsableId: data.commercialResponsableId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.terrains.set(terrain.id, terrain);
      return Promise.resolve(terrain);
    },
    updateMany: ({
      where,
      data,
    }: {
      where: { id?: string; statutCommercial?: string | { in: string[] } };
      data: Partial<FakeTerrain>;
    }) => {
      let list = Array.from(this.terrains.values());
      if (where.id) list = list.filter((t) => t.id === where.id);
      const statutCommercialIn =
        where.statutCommercial &&
        typeof where.statutCommercial === 'object' &&
        'in' in where.statutCommercial
          ? where.statutCommercial.in
          : undefined;
      if (statutCommercialIn) {
        list = list.filter((t) =>
          statutCommercialIn.includes(t.statutCommercial),
        );
      }
      for (const terrain of list) {
        const merged = { ...terrain, ...data, updatedAt: new Date() };
        this.terrains.set(terrain.id, merged);
      }
      return Promise.resolve({ count: list.length });
    },
    findFirst: ({
      where = {},
      include,
      select,
    }: {
      where?: Record<string, unknown>;
      include?: Record<string, unknown>;
      select?: Record<string, unknown>;
    }) => {
      const found = Array.from(this.terrains.values()).find((t) =>
        this.matchesTerrainWhere(t, where),
      );
      if (!found) return Promise.resolve(null);
      return Promise.resolve(this.hydrateTerrain(found, { include, select }));
    },
    findMany: ({
      where = {},
      include,
      select,
      orderBy,
      skip = 0,
      take,
    }: {
      where?: Record<string, unknown>;
      include?: Record<string, unknown>;
      select?: Record<string, unknown>;
      orderBy?: Record<string, string>;
      skip?: number;
      take?: number;
    } = {}) => {
      let list = Array.from(this.terrains.values()).filter((t) =>
        this.matchesTerrainWhere(t, where),
      );
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        const dir = orderBy[key];
        list = [...list].sort((a, b) => {
          const aVal = a[key as keyof FakeTerrain];
          const bVal = b[key as keyof FakeTerrain];
          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          if (aVal < bVal) return dir === 'desc' ? 1 : -1;
          if (aVal > bVal) return dir === 'desc' ? -1 : 1;
          return 0;
        });
      }
      const paginated = take ? list.slice(skip, skip + take) : list.slice(skip);
      return Promise.resolve(
        paginated.map((t) => this.hydrateTerrain(t, { include, select })),
      );
    },
    count: ({ where = {} }: { where?: Record<string, unknown> } = {}) =>
      Promise.resolve(
        Array.from(this.terrains.values()).filter((t) =>
          this.matchesTerrainWhere(t, where),
        ).length,
      ),
    update: ({
      where,
      data,
      include,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
      include?: Record<string, unknown>;
    }) => {
      const existing = this.terrains.get(where.id);
      if (!existing) throw new Error('Terrain not found (fake prisma)');
      const merged = { ...existing, ...data, updatedAt: new Date() };
      this.terrains.set(where.id, merged);
      return Promise.resolve(this.hydrateTerrain(merged, { include }));
    },
  };

  private matchesTerrainWhere(
    terrain: FakeTerrain,
    where: Record<string, unknown>,
  ): boolean {
    for (const [key, condition] of Object.entries(where)) {
      if (condition === undefined) continue;
      if (key === 'OR' && Array.isArray(condition)) {
        const matches = (condition as Record<string, unknown>[]).some(
          (clause) => this.matchesTerrainWhere(terrain, clause),
        );
        if (!matches) return false;
        continue;
      }
      const value = terrain[key as keyof FakeTerrain];
      if (
        condition &&
        typeof condition === 'object' &&
        'contains' in condition
      ) {
        const contains = (
          condition as { contains: string }
        ).contains.toLowerCase();
        if (!toSearchable(value).toLowerCase().includes(contains)) return false;
        continue;
      }
      if (
        condition &&
        typeof condition === 'object' &&
        ('gte' in condition || 'lte' in condition)
      ) {
        const range = condition as { gte?: number; lte?: number };
        if (range.gte !== undefined && !(Number(value) >= range.gte))
          return false;
        if (range.lte !== undefined && !(Number(value) <= range.lte))
          return false;
        continue;
      }
      if (value !== condition) return false;
    }
    return true;
  }

  private hydrateTerrain(
    terrain: FakeTerrain,
    opts: {
      include?: Record<string, unknown>;
      select?: Record<string, unknown>;
    } = {},
  ): Record<string, unknown> {
    if (opts.select) {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(opts.select)) {
        if (!value) continue;
        if (key === 'medias' || key === 'documents') {
          result[key] = [];
        } else {
          result[key] = terrain[key as keyof FakeTerrain];
        }
      }
      return result;
    }

    const proprietaire = terrain.proprietaireId
      ? (this.proprietaires.get(terrain.proprietaireId) ?? null)
      : null;
    const commercialResponsable = terrain.commercialResponsableId
      ? (this.users.get(terrain.commercialResponsableId) ?? null)
      : null;

    return {
      ...terrain,
      ...(opts.include?.proprietaire ? { proprietaire } : {}),
      ...(opts.include?.commercialResponsable
        ? {
            commercialResponsable: commercialResponsable
              ? {
                  id: commercialResponsable.id,
                  firstName: commercialResponsable.firstName,
                  lastName: commercialResponsable.lastName,
                }
              : null,
          }
        : {}),
      ...(opts.include?.medias ? { medias: [] } : {}),
      ...(opts.include?.documents ? { documents: [] } : {}),
    };
  }

  proprietaire = {
    findUnique: ({ where }: { where: { id: string } }) =>
      Promise.resolve(this.proprietaires.get(where.id) ?? null),
    create: ({
      data,
    }: {
      data: Partial<FakeProprietaire> & { firstName: string; lastName: string };
    }) => Promise.resolve(this.seedProprietaire(data)),
  };

  private pickTerrainSummary(terrain: FakeTerrain) {
    return {
      id: terrain.id,
      referenceInterne: terrain.referenceInterne,
      nom: terrain.nom,
      commune: terrain.commune,
      region: terrain.region,
      superficie: terrain.superficie,
      prixPublic: terrain.prixPublic,
      statutCommercial: terrain.statutCommercial,
    };
  }

  private matchesMandatWhere(
    mandat: FakeMandat,
    where: Record<string, unknown>,
  ): boolean {
    for (const [key, condition] of Object.entries(where)) {
      if (condition === undefined) continue;
      if (key === 'OR' && Array.isArray(condition)) {
        const matches = (condition as Record<string, unknown>[]).some(
          (clause) => this.matchesMandatWhere(mandat, clause),
        );
        if (!matches) return false;
        continue;
      }
      if (
        key === 'id' &&
        condition &&
        typeof condition === 'object' &&
        'not' in condition
      ) {
        if (mandat.id === (condition as { not: string }).not) return false;
        continue;
      }
      if (
        key === 'proprietaire' &&
        condition &&
        typeof condition === 'object'
      ) {
        const proprietaire = this.proprietaires.get(mandat.proprietaireId);
        const sub = condition as Record<string, { contains: string }>;
        const matches = Object.entries(sub).every(([field, cond]) => {
          const value = proprietaire
            ? (proprietaire as unknown as Record<string, unknown>)[field]
            : undefined;
          return toSearchable(value)
            .toLowerCase()
            .includes(cond.contains.toLowerCase());
        });
        if (!matches) return false;
        continue;
      }
      if (
        key === 'lots' &&
        condition &&
        typeof condition === 'object' &&
        'some' in condition
      ) {
        const someWhere = (condition as { some: { terrainId?: string } }).some;
        const hasMatch = Array.from(this.mandatLots.values()).some(
          (lot) =>
            lot.mandatId === mandat.id &&
            (!someWhere.terrainId || lot.terrainId === someWhere.terrainId),
        );
        if (!hasMatch) return false;
        continue;
      }
      const value = (mandat as unknown as Record<string, unknown>)[key];
      if (
        condition &&
        typeof condition === 'object' &&
        'contains' in condition
      ) {
        const contains = (
          condition as { contains: string }
        ).contains.toLowerCase();
        if (!toSearchable(value).toLowerCase().includes(contains)) return false;
        continue;
      }
      if (
        condition &&
        typeof condition === 'object' &&
        ('gte' in condition || 'lte' in condition)
      ) {
        const range = condition as { gte?: Date | number; lte?: Date | number };
        const comparable = value instanceof Date ? value.getTime() : value;
        if (range.gte !== undefined) {
          const gte =
            range.gte instanceof Date ? range.gte.getTime() : range.gte;
          if (!(Number(comparable) >= Number(gte))) return false;
        }
        if (range.lte !== undefined) {
          const lte =
            range.lte instanceof Date ? range.lte.getTime() : range.lte;
          if (!(Number(comparable) <= Number(lte))) return false;
        }
        continue;
      }
      if (value !== condition) return false;
    }
    return true;
  }

  private hydrateMandat(mandat: FakeMandat): Record<string, unknown> {
    const proprietaire = this.proprietaires.get(mandat.proprietaireId) ?? null;
    const commercialResponsable = mandat.commercialResponsableId
      ? (this.users.get(mandat.commercialResponsableId) ?? null)
      : null;
    const lots = Array.from(this.mandatLots.values())
      .filter((lot) => lot.mandatId === mandat.id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((lot) => ({
        ...lot,
        terrain: this.terrains.get(lot.terrainId)
          ? this.pickTerrainSummary(this.terrains.get(lot.terrainId)!)
          : null,
      }));
    const documents: unknown[] = [];

    return {
      ...mandat,
      proprietaire: proprietaire
        ? {
            id: proprietaire.id,
            firstName: proprietaire.firstName,
            lastName: proprietaire.lastName,
            email: proprietaire.email,
            phone: proprietaire.phone,
          }
        : null,
      commercialResponsable: commercialResponsable
        ? {
            id: commercialResponsable.id,
            firstName: commercialResponsable.firstName,
            lastName: commercialResponsable.lastName,
          }
        : null,
      lots,
      documents,
      _count: { lots: lots.length, documents: documents.length },
    };
  }

  mandat = {
    findUnique: ({
      where,
    }: {
      where: { id?: string; referenceInterne?: string };
    }) => {
      const mandat = where.id
        ? this.mandats.get(where.id)
        : Array.from(this.mandats.values()).find(
            (m) => m.referenceInterne === where.referenceInterne,
          );
      return Promise.resolve(mandat ?? null);
    },
    findFirst: ({ where = {} }: { where?: Record<string, unknown> }) => {
      const found = Array.from(this.mandats.values()).find((m) =>
        this.matchesMandatWhere(m, where),
      );
      return Promise.resolve(found ? this.hydrateMandat(found) : null);
    },
    findMany: ({
      where = {},
      orderBy,
      skip = 0,
      take,
    }: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, string>;
      skip?: number;
      take?: number;
    } = {}) => {
      let list = Array.from(this.mandats.values()).filter((m) =>
        this.matchesMandatWhere(m, where),
      );
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        const dir = orderBy[key];
        list = [...list].sort((a, b) => {
          const aVal = a[key as keyof FakeMandat];
          const bVal = b[key as keyof FakeMandat];
          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          if (aVal < bVal) return dir === 'desc' ? 1 : -1;
          if (aVal > bVal) return dir === 'desc' ? -1 : 1;
          return 0;
        });
      }
      const paginated = take ? list.slice(skip, skip + take) : list.slice(skip);
      return Promise.resolve(paginated.map((m) => this.hydrateMandat(m)));
    },
    count: ({ where = {} }: { where?: Record<string, unknown> } = {}) =>
      Promise.resolve(
        Array.from(this.mandats.values()).filter((m) =>
          this.matchesMandatWhere(m, where),
        ).length,
      ),
    create: ({ data }: { data: Partial<FakeMandat> }) => {
      const mandat: FakeMandat = {
        id: data.id ?? fakeUuid(),
        referenceInterne: data.referenceInterne as string,
        proprietaireId: data.proprietaireId as string,
        commercialResponsableId: data.commercialResponsableId ?? null,
        typeMandat: data.typeMandat as string,
        dateDebut: data.dateDebut as Date,
        dateFin: data.dateFin as Date,
        exclusivite: data.exclusivite ?? false,
        prixConditions: data.prixConditions ?? null,
        commissions: data.commissions ?? null,
        clauses: data.clauses ?? null,
        restrictionsContractuelles: data.restrictionsContractuelles ?? null,
        objectifsCommercialisation: data.objectifsCommercialisation ?? null,
        alerteEcheanceJours: data.alerteEcheanceJours ?? 30,
        statut: data.statut as string,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.mandats.set(mandat.id, mandat);
      return Promise.resolve(this.hydrateMandat(mandat));
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const existing = this.mandats.get(where.id);
      if (!existing) throw new Error('Mandat not found (fake prisma)');
      const merged = { ...existing, ...data, updatedAt: new Date() };
      this.mandats.set(where.id, merged);
      return Promise.resolve(this.hydrateMandat(merged));
    },
    delete: ({ where }: { where: { id: string } }) => {
      const existing = this.mandats.get(where.id);
      if (!existing) throw new Error('Mandat not found (fake prisma)');
      this.mandats.delete(where.id);
      for (const [lotId, lot] of this.mandatLots) {
        if (lot.mandatId === where.id) this.mandatLots.delete(lotId);
      }
      return Promise.resolve(existing);
    },
  };

  mandatLot = {
    findFirst: ({ where }: { where: Record<string, unknown> }) => {
      const list = Array.from(this.mandatLots.values()).filter((lot) => {
        if (where.id && lot.id !== where.id) return false;
        if (where.mandatId && lot.mandatId !== where.mandatId) return false;
        if (where.terrainId && lot.terrainId !== where.terrainId) return false;
        return true;
      });
      return Promise.resolve(list[0] ?? null);
    },
    count: ({ where }: { where?: Record<string, unknown> } = {}) => {
      let list = Array.from(this.mandatLots.values());
      const w = where as { mandat?: Record<string, unknown> } | undefined;
      if (w?.mandat) {
        const mandatIds = Array.from(this.mandats.values())
          .filter((m) =>
            this.matchesMandatWhere(m, w.mandat as Record<string, unknown>),
          )
          .map((m) => m.id);
        list = list.filter((lot) => mandatIds.includes(lot.mandatId));
      }
      return Promise.resolve(list.length);
    },
    groupBy: (
      {
        where,
        by,
      }: {
        where?: Record<string, unknown>;
        by: string[];
      } = { by: [] },
    ) => {
      let list = Array.from(this.mandatLots.values());
      const w = where as { mandat?: Record<string, unknown> } | undefined;
      if (w?.mandat) {
        const mandatIds = Array.from(this.mandats.values())
          .filter((m) =>
            this.matchesMandatWhere(m, w.mandat as Record<string, unknown>),
          )
          .map((m) => m.id);
        list = list.filter((lot) => mandatIds.includes(lot.mandatId));
      }
      const groups = new Map<string, number>();
      for (const lot of list) {
        const key = by[0] as keyof FakeMandatLot;
        const val = String(lot[key]);
        groups.set(val, (groups.get(val) ?? 0) + 1);
      }
      return Promise.resolve(
        Array.from(groups.entries()).map(([statutLot, count]) => ({
          statutLot,
          _count: { statutLot: count },
        })),
      );
    },
    create: ({ data }: { data: Partial<FakeMandatLot> }) => {
      const lot: FakeMandatLot = {
        id: data.id ?? fakeUuid(),
        mandatId: data.mandatId as string,
        terrainId: data.terrainId as string,
        statutLot: data.statutLot ?? 'Confie',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.mandatLots.set(lot.id, lot);
      const terrain = this.terrains.get(lot.terrainId);
      return Promise.resolve({
        ...lot,
        terrain: terrain ? this.pickTerrainSummary(terrain) : null,
      });
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<FakeMandatLot>;
    }) => {
      const existing = this.mandatLots.get(where.id);
      if (!existing) throw new Error('MandatLot not found (fake prisma)');
      const merged = { ...existing, ...data, updatedAt: new Date() };
      this.mandatLots.set(where.id, merged);
      const terrain = this.terrains.get(merged.terrainId);
      return Promise.resolve({
        ...merged,
        terrain: terrain ? this.pickTerrainSummary(terrain) : null,
      });
    },
    delete: ({ where }: { where: { id: string } }) => {
      const existing = this.mandatLots.get(where.id);
      if (!existing) throw new Error('MandatLot not found (fake prisma)');
      this.mandatLots.delete(where.id);
      return Promise.resolve(existing);
    },
  };

  reservation = {
    findFirst: ({ where }: { where: Record<string, unknown> }) => {
      let list = Array.from(this.reservations.values());
      const w = where;
      if (w?.dossierVente && typeof w.dossierVente === 'object') {
        const dossierVente = w.dossierVente as Record<string, unknown>;
        if (dossierVente.terrainId) {
          list = list.filter((reservation) => {
            const dossier = this.dossiersVente.get(reservation.dossierVenteId);
            return dossier?.terrainId === dossierVente.terrainId;
          });
        }
      }
      const statutIn =
        w?.statut && typeof w.statut === 'object' && 'in' in w.statut
          ? (w.statut as { in: string[] }).in
          : undefined;
      if (statutIn) {
        list = list.filter((reservation) =>
          statutIn.includes(reservation.statut),
        );
      }
      if (
        w?.dateExpiration &&
        typeof w.dateExpiration === 'object' &&
        'gt' in w.dateExpiration
      ) {
        list = list.filter(
          (reservation) =>
            reservation.dateExpiration > (w.dateExpiration as { gt: Date }).gt,
        );
      }
      return Promise.resolve(list[0] ?? null);
    },
    create: ({ data }: { data: Partial<FakeReservation> }) => {
      const reservation: FakeReservation = {
        id: data.id ?? fakeUuid(),
        dossierVenteId: data.dossierVenteId as string,
        montantAcompte: data.montantAcompte ?? 0,
        dureeBlocageJours: data.dureeBlocageJours ?? 0,
        dateDebut: data.dateDebut ?? new Date(),
        dateExpiration: data.dateExpiration ?? new Date(),
        conditionsAnnulation: data.conditionsAnnulation ?? null,
        statut: data.statut ?? 'active',
        reference: data.reference ?? null,
        createdById: data.createdById ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.reservations.set(reservation.id, reservation);
      return Promise.resolve(reservation);
    },
    updateMany: ({
      where,
      data,
    }: {
      where: { id?: string; statut?: { in: string[] } };
      data: Partial<FakeReservation>;
    }) => {
      let list = Array.from(this.reservations.values());
      if (where.id)
        list = list.filter((reservation) => reservation.id === where.id);
      const statutIn =
        where.statut && 'in' in where.statut ? where.statut.in : undefined;
      if (statutIn) {
        list = list.filter((reservation) =>
          statutIn.includes(reservation.statut),
        );
      }
      for (const reservation of list) {
        this.reservations.set(reservation.id, {
          ...reservation,
          ...data,
          updatedAt: new Date(),
        });
      }
      return Promise.resolve({ count: list.length });
    },
  };

  echeancePaiement = {
    createMany: ({ data }: { data: Partial<FakeEcheancePaiement>[] }) => {
      for (const item of data) {
        const echeance: FakeEcheancePaiement = {
          id: item.id ?? fakeUuid(),
          dossierVenteId: item.dossierVenteId as string,
          numero: item.numero as number,
          dateEcheance: item.dateEcheance ?? new Date(),
          montantPrevu: item.montantPrevu ?? 0,
          montantPaye: item.montantPaye ?? 0,
          statut: item.statut ?? 'en_attente',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.echeancesPaiement.set(echeance.id, echeance);
      }
      return Promise.resolve({ count: data.length });
    },
    findMany: ({
      where,
      orderBy,
    }: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, string>;
    } = {}) => {
      let list = Array.from(this.echeancesPaiement.values());
      if (where?.dossierVenteId) {
        list = list.filter(
          (item) => item.dossierVenteId === where.dossierVenteId,
        );
      }
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        const dir = orderBy[key];
        list.sort((a, b) => {
          const aVal = a[key as keyof FakeEcheancePaiement];
          const bVal = b[key as keyof FakeEcheancePaiement];
          if (aVal < bVal) return dir === 'desc' ? 1 : -1;
          if (aVal > bVal) return dir === 'desc' ? -1 : 1;
          return 0;
        });
      }
      return Promise.resolve(list);
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<FakeEcheancePaiement>;
    }) => {
      const existing = this.echeancesPaiement.get(where.id);
      if (!existing) throw new Error('Echeance not found (fake prisma)');
      const merged = { ...existing, ...data, updatedAt: new Date() };
      this.echeancesPaiement.set(where.id, merged);
      return Promise.resolve(merged);
    },
  };

  paiement = {
    aggregate: async ({
      where,
      _sum,
    }: {
      where: Record<string, unknown>;
      _sum?: Record<string, string>;
    }) => {
      let list = Array.from(this.paiements.values());
      if (where.dossierVenteId) {
        list = list.filter(
          (payment) => payment.dossierVenteId === where.dossierVenteId,
        );
      }
      if (where.statut) {
        list = list.filter((payment) => payment.statut === where.statut);
      }
      if (where.dossierVente && typeof where.dossierVente === 'object') {
        const dossierWhere = where.dossierVente as Record<string, unknown>;
        if (dossierWhere.commercialResponsableId) {
          list = list.filter((payment) => {
            const dossier = this.dossiersVente.get(payment.dossierVenteId);
            return (
              dossier?.commercialResponsableId ===
              dossierWhere.commercialResponsableId
            );
          });
        }
      }
      const sum = _sum?.montant
        ? list.reduce((acc, item) => acc + Number(item.montant), 0)
        : 0;
      return Promise.resolve({ _sum: { montant: sum } });
    },
    create: ({ data }: { data: Partial<FakePaiement> }) => {
      const payment: FakePaiement = {
        id: data.id ?? fakeUuid(),
        dossierVenteId: data.dossierVenteId as string,
        montant: data.montant ?? 0,
        datePaiement: data.datePaiement ?? new Date(),
        mode: data.mode ?? 'virement',
        reference: data.reference ?? null,
        justificatifUrl: data.justificatifUrl ?? null,
        statut: data.statut ?? 'en_attente',
        notes: data.notes ?? null,
        recordedById: data.recordedById ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.paiements.set(payment.id, payment);
      return Promise.resolve(payment);
    },
    findFirst: ({ where }: { where: Record<string, unknown> }) => {
      let list = Array.from(this.paiements.values());
      if (where.id) list = list.filter((payment) => payment.id === where.id);
      if (where.dossierVenteId)
        list = list.filter(
          (payment) => payment.dossierVenteId === where.dossierVenteId,
        );
      if (where.statut)
        list = list.filter((payment) => payment.statut === where.statut);
      return Promise.resolve(list[0] ?? null);
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<FakePaiement>;
    }) => {
      const existing = this.paiements.get(where.id);
      if (!existing) throw new Error('Paiement not found (fake prisma)');
      const merged = { ...existing, ...data, updatedAt: new Date() };
      this.paiements.set(where.id, merged);
      return Promise.resolve(merged);
    },
  };

  commissionVente = {
    aggregate: async ({
      where,
      _sum,
    }: {
      where: Record<string, unknown>;
      _sum?: Record<string, string>;
    }) => {
      let list = Array.from(this.commissionsVente.values());
      if (where.dossierVente) {
        const dossierWhere = where.dossierVente as Record<string, unknown>;
        list = list.filter((commission) => {
          const dossier = this.dossiersVente.get(commission.dossierVenteId);
          return dossier && dossierWhere.commercialResponsableId === undefined
            ? true
            : dossier?.commercialResponsableId ===
                dossierWhere.commercialResponsableId;
        });
      }
      if (where.commercialId) {
        list = list.filter(
          (commission) => commission.commercialId === where.commercialId,
        );
      }
      if (where.statut) {
        list = list.filter((commission) => commission.statut === where.statut);
      }
      const sumKey = _sum && Object.keys(_sum)[0];
      const sum = sumKey
        ? list.reduce(
            (acc, item) =>
              acc + Number(item[sumKey as keyof FakeCommissionVente] ?? 0),
            0,
          )
        : 0;
      return Promise.resolve({ _sum: { [sumKey ?? 'montantEstime']: sum } });
    },
    create: ({ data }: { data: Partial<FakeCommissionVente> }) => {
      const commission: FakeCommissionVente = {
        id: data.id ?? fakeUuid(),
        dossierVenteId: data.dossierVenteId as string,
        commercialId: data.commercialId as string,
        typeRegle: data.typeRegle ?? 'pourcentage',
        taux: data.taux ?? null,
        montantFixe: data.montantFixe ?? null,
        palier: data.palier ?? null,
        bonus: data.bonus ?? null,
        montantEstime: data.montantEstime ?? 0,
        montantValide: data.montantValide ?? null,
        montantPaye: data.montantPaye ?? null,
        statut: data.statut ?? 'estimee',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.commissionsVente.set(commission.id, commission);
      return Promise.resolve(commission);
    },
    findFirst: ({ where }: { where: Record<string, unknown> }) => {
      let list = Array.from(this.commissionsVente.values());
      if (where.id)
        list = list.filter((commission) => commission.id === where.id);
      if (where.dossierVenteId)
        list = list.filter(
          (commission) => commission.dossierVenteId === where.dossierVenteId,
        );
      return Promise.resolve(list[0] ?? null);
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<FakeCommissionVente>;
    }) => {
      const existing = this.commissionsVente.get(where.id);
      if (!existing) throw new Error('Commission not found (fake prisma)');
      const merged = { ...existing, ...data, updatedAt: new Date() };
      this.commissionsVente.set(where.id, merged);
      return Promise.resolve(merged);
    },
  };

  documentVente = {
    findFirst: ({ where }: { where: Record<string, unknown> }) => {
      let list = Array.from(this.documentsVente.values());
      if (where.id) list = list.filter((doc) => doc.id === where.id);
      if (where.isPublic)
        list = list.filter((doc) => doc.isPublic === where.isPublic);
      if (where.dossierVente) {
        const dossierWhere = where.dossierVente as Record<string, unknown>;
        list = list.filter((doc) => {
          const dossier = this.dossiersVente.get(doc.dossierVenteId);
          return dossier && dossier.prospectId === dossierWhere.prospectId;
        });
      }
      return Promise.resolve(list[0] ?? null);
    },
    findMany: ({
      where,
      include,
      orderBy,
      take,
    }: {
      where?: Record<string, unknown>;
      include?: Record<string, unknown>;
      orderBy?: Record<string, string>;
      take?: number;
    } = {}) => {
      let list = Array.from(this.documentsVente.values());
      const w = where;
      if (w?.dossierVenteId) {
        const dossierVenteId = w.dossierVenteId as string | { in: string[] };
        if (typeof dossierVenteId === 'string') {
          list = list.filter((doc) => doc.dossierVenteId === dossierVenteId);
        } else if (
          typeof dossierVenteId === 'object' &&
          'in' in dossierVenteId
        ) {
          list = list.filter((doc) =>
            dossierVenteId.in.includes(doc.dossierVenteId),
          );
        }
      }
      if (w?.type) list = list.filter((doc) => doc.type === w.type);
      if (w?.createdAt && typeof w.createdAt === 'object') {
        const createdAtWhere = w.createdAt as Record<string, Date>;
        if (createdAtWhere.gte)
          list = list.filter((doc) => doc.createdAt >= createdAtWhere.gte);
        if (createdAtWhere.lte)
          list = list.filter((doc) => doc.createdAt <= createdAtWhere.lte);
      }
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        const dir = orderBy[key];
        list.sort((a, b) => {
          const aVal = a[key as keyof FakeDocumentVente];
          const bVal = b[key as keyof FakeDocumentVente];
          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          if (aVal < bVal) return dir === 'desc' ? 1 : -1;
          if (aVal > bVal) return dir === 'desc' ? -1 : 1;
          return 0;
        });
      }
      if (take && take > 0) list = list.slice(0, take);
      return Promise.resolve(
        list.map((doc) => ({
          ...doc,
          dossierVente: this.dossiersVente.get(doc.dossierVenteId)
            ? {
                id: this.dossiersVente.get(doc.dossierVenteId)!.id,
                referenceInterne: this.dossiersVente.get(doc.dossierVenteId)!
                  .referenceInterne,
                prospectId: this.dossiersVente.get(doc.dossierVenteId)!
                  .prospectId,
              }
            : null,
          createdBy: null,
        })),
      );
    },
    create: ({ data }: { data: Partial<FakeDocumentVente> }) => {
      const doc: FakeDocumentVente = {
        id: data.id ?? fakeUuid(),
        dossierVenteId: data.dossierVenteId as string,
        type: data.type ?? 'autre',
        storageKey: data.storageKey ?? 'fake-storage-key',
        resourceType: data.resourceType ?? 'raw',
        title: data.title ?? null,
        isGenerated: data.isGenerated ?? false,
        isPublic: data.isPublic ?? false,
        version: data.version ?? 1,
        createdById: data.createdById ?? null,
        createdAt: new Date(),
      };
      this.documentsVente.set(doc.id, doc);
      return Promise.resolve(doc);
    },
    delete: ({ where }: { where: { id: string } }) => {
      const existing = this.documentsVente.get(where.id);
      if (!existing) throw new Error('DocumentVente not found (fake prisma)');
      this.documentsVente.delete(where.id);
      return Promise.resolve(existing);
    },
  };

  user = {
    findUnique: ({ where }: { where: { id?: string; email?: string } }) => {
      const user = where.id
        ? this.users.get(where.id)
        : Array.from(this.users.values()).find((u) => u.email === where.email);
      return Promise.resolve(user ? this.buildUserWithRoles(user) : null);
    },
    findMany: () => {
      return Promise.resolve(
        Array.from(this.users.values()).map((u) => this.buildUserWithRoles(u)),
      );
    },
    create: ({
      data,
    }: {
      data: Partial<FakeUser> & {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
      };
    }) => {
      const user = this.seedUser(data);
      return Promise.resolve(user);
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const user = this.users.get(where.id);
      if (!user) throw new Error('User not found (fake prisma)');
      const merged = { ...user, ...data };
      // Gère { increment: 1 } pour failedLoginAttempts, comme le vrai Prisma.
      if (
        data.failedLoginAttempts &&
        typeof data.failedLoginAttempts === 'object' &&
        'increment' in data.failedLoginAttempts
      ) {
        merged.failedLoginAttempts =
          user.failedLoginAttempts +
          (data.failedLoginAttempts as { increment: number }).increment;
      }
      merged.updatedAt = new Date();
      this.users.set(where.id, merged);
      return Promise.resolve(merged);
    },
  };

  role = {
    findUnique: ({ where }: { where: { id?: string; name?: string } }) => {
      const role = where.id
        ? this.roles.get(where.id)
        : Array.from(this.roles.values()).find((r) => r.name === where.name);
      return Promise.resolve(role ?? null);
    },
    findMany: () => Promise.resolve(Array.from(this.roles.values())),
    create: ({ data }: { data: { name: string; description?: string } }) => {
      const role = this.seedRole(data.name);
      role.description = data.description ?? null;
      return Promise.resolve(role);
    },
  };

  permission = {
    findMany: ({
      where,
    }: { where?: { name?: { in: string[] }; resource?: string } } = {}) => {
      let list = Array.from(this.permissions.values());
      if (where?.name?.in) {
        list = list.filter((p) => where.name!.in.includes(p.name));
      }
      if (where?.resource) {
        list = list.filter((p) => p.resource === where.resource);
      }
      return Promise.resolve(list);
    },
  };

  userRole = {
    upsert: ({
      create,
    }: {
      where: unknown;
      update: unknown;
      create: { userId: string; roleId: string };
    }) => {
      const exists = this.userRoles.some(
        (ur) => ur.userId === create.userId && ur.roleId === create.roleId,
      );
      if (!exists) this.userRoles.push(create);
      return Promise.resolve(create);
    },
    deleteMany: ({ where }: { where: { userId: string; roleId: string } }) => {
      this.userRoles = this.userRoles.filter(
        (ur) => !(ur.userId === where.userId && ur.roleId === where.roleId),
      );
      return Promise.resolve({ count: 1 });
    },
  };

  auditLog = {
    create: ({ data }: { data: Record<string, unknown> }) => {
      const entry = {
        id: fakeUuid(),
        createdAt: new Date(),
        ...data,
      } as (typeof this.auditLogs)[number];
      this.auditLogs.push(entry);
      return Promise.resolve(entry);
    },
    findMany: ({
      where,
      skip = 0,
      take = 50,
    }: {
      where?: Record<string, unknown>;
      skip?: number;
      take?: number;
      orderBy?: unknown;
      include?: unknown;
    }) => {
      let list = [...this.auditLogs].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
      if (where?.entityType) {
        list = list.filter((l) => l.entityType === where.entityType);
      }
      if (where?.userId) {
        list = list.filter((l) => l.userId === where.userId);
      }
      if (where?.action) {
        list = list.filter((l) => l.action === where.action);
      }
      return Promise.resolve(list.slice(skip, skip + take));
    },
    count: ({ where }: { where?: Record<string, unknown> } = {}) => {
      let list = this.auditLogs;
      if (where?.entityType) {
        list = list.filter((l) => l.entityType === where.entityType);
      }
      return Promise.resolve(list.length);
    },
  };

  refreshToken = {
    create: ({
      data,
    }: {
      data: { userId: string; tokenHash: string; expiresAt: Date };
    }) => {
      const entry = {
        id: fakeUuid(),
        tokenHash: data.tokenHash,
        userId: data.userId,
        expiresAt: data.expiresAt,
        revokedAt: null,
        createdAt: new Date(),
      };
      this.refreshTokens.set(entry.id, entry);
      return Promise.resolve(entry);
    },
    findUnique: ({ where }: { where: { tokenHash: string } }) => {
      const entry = Array.from(this.refreshTokens.values()).find(
        (t) => t.tokenHash === where.tokenHash,
      );
      return Promise.resolve(entry ?? null);
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const entry = this.refreshTokens.get(where.id);
      if (!entry) throw new Error('RefreshToken not found (fake prisma)');
      const merged = { ...entry, ...data };
      this.refreshTokens.set(where.id, merged);
      return Promise.resolve(merged);
    },
    updateMany: ({ where }: { where: { tokenHash: string } }) => {
      const entry = Array.from(this.refreshTokens.values()).find(
        (t) => t.tokenHash === where.tokenHash,
      );
      if (entry) entry.revokedAt = new Date();
      return Promise.resolve({ count: entry ? 1 : 0 });
    },
  };

  prospect = {
    findUnique: ({
      where,
      include,
    }: {
      where: { id: string };
      include?: unknown;
    }) => {
      const prospect = this.prospects.get(where.id);
      if (!prospect) return Promise.resolve(null);
      if (!include) return Promise.resolve(prospect);
      const inc = include as Record<string, unknown>;
      const result: Record<string, unknown> = { ...prospect };
      if (inc.commercialResponsable) {
        const user = this.users.get(prospect.commercialResponsableId ?? '');
        const sel = (inc.commercialResponsable as Record<string, unknown>)
          .select as Record<string, boolean> | undefined;
        result.commercialResponsable = user
          ? sel
            ? Object.fromEntries(Object.entries(user).filter(([k]) => sel[k]))
            : user
          : null;
      }
      if (inc.activites) {
        result.activites = Array.from(this.activitesCrm.values()).filter(
          (a) => a.prospectId === prospect.id,
        );
      }
      if (inc.documents) {
        result.documents = Array.from(this.documentsCrm.values()).filter(
          (d) => d.prospectId === prospect.id,
        );
      }
      if (inc.dossiers) {
        result.dossiers = Array.from(this.dossiersVente.values()).filter(
          (d) => d.prospectId === prospect.id,
        );
      }
      if (inc._count) {
        result._count = {
          activites: (result.activites as unknown[]).length,
          documents: (result.documents as unknown[]).length,
          dossiers: (result.dossiers as unknown[]).length,
        };
      }
      return Promise.resolve(result);
    },
    findFirst: ({ where }: { where: Record<string, unknown> }) => {
      const list = Array.from(this.prospects.values()).filter((p) => {
        const w = where;
        if (w.id && p.id !== w.id) return false;
        if (w.email && p.email !== w.email) return false;
        if (w.telephone && p.telephone !== w.telephone) return false;
        if (w.OR && Array.isArray(w.OR)) {
          return (w.OR as Record<string, unknown>[]).some((clause) => {
            if (clause.email && p.email !== clause.email) return false;
            if (clause.telephone && p.telephone !== clause.telephone)
              return false;
            return true;
          });
        }
        return true;
      });
      return Promise.resolve(list[0] ?? null);
    },
    findMany: ({
      where,
      include: _include,
      orderBy,
      skip,
      take,
    }: Record<string, unknown> = {}) => {
      let list = Array.from(this.prospects.values());
      const w = where as Record<string, unknown> | undefined;
      if (w?.commercialResponsableId) {
        list = list.filter(
          (p) => p.commercialResponsableId === w.commercialResponsableId,
        );
      }
      if (w?.statutPipeline) {
        list = list.filter((p) => p.statutPipeline === w.statutPipeline);
      }
      if (w?.sourceAcquisition) {
        list = list.filter((p) => p.sourceAcquisition === w.sourceAcquisition);
      }
      if (w?.createdAt) {
        const c = w.createdAt as Record<string, Date>;
        if (c.gte) list = list.filter((p) => p.createdAt >= c.gte);
        if (c.lte) list = list.filter((p) => p.createdAt <= c.lte);
      }
      const ob = orderBy as Record<string, string> | undefined;
      if (ob) {
        const key = Object.keys(ob)[0];
        const dir = ob[key];
        list.sort((a, b) => {
          const aVal = a[key as keyof FakeProspect];
          const bVal = b[key as keyof FakeProspect];
          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;
          if (aVal < bVal) return dir === 'desc' ? 1 : -1;
          if (aVal > bVal) return dir === 'desc' ? -1 : 1;
          return 0;
        });
      }
      const s = typeof skip === 'number' ? skip : 0;
      const t = typeof take === 'number' ? take : list.length;
      const paginated = list.slice(s, s + t);
      if (_include) {
        const inc = _include as Record<string, unknown>;
        return Promise.resolve(
          paginated.map((p) => {
            const result: Record<string, unknown> = { ...p };
            if (inc.commercialResponsable) {
              const user = this.users.get(p.commercialResponsableId ?? '');
              const sel = (inc.commercialResponsable as Record<string, unknown>)
                .select as Record<string, boolean> | undefined;
              result.commercialResponsable = user
                ? sel
                  ? Object.fromEntries(
                      Object.entries(user).filter(([k]) => sel[k]),
                    )
                  : user
                : null;
            }
            if (inc.activites) {
              result.activites = Array.from(this.activitesCrm.values()).filter(
                (a) => a.prospectId === p.id,
              );
            }
            if (inc.documents) {
              result.documents = Array.from(this.documentsCrm.values()).filter(
                (d) => d.prospectId === p.id,
              );
            }
            if (inc.dossiers) {
              result.dossiers = Array.from(this.dossiersVente.values()).filter(
                (d) => d.prospectId === p.id,
              );
            }
            if (inc._count) {
              result._count = {
                activites: (result.activites as unknown[]).length,
                documents: (result.documents as unknown[]).length,
                dossiers: (result.dossiers as unknown[]).length,
              };
            }
            return result;
          }),
        );
      }
      return Promise.resolve(paginated);
    },
    count: ({ where }: { where?: Record<string, unknown> } = {}) => {
      let list = Array.from(this.prospects.values());
      const w = where;
      if (w?.commercialResponsableId) {
        list = list.filter(
          (p) => p.commercialResponsableId === w.commercialResponsableId,
        );
      }
      return Promise.resolve(list.length);
    },
    groupBy: ({ where, by, _count }: Record<string, unknown> = {}) => {
      const list: FakeProspect[] = [];
      const w = where as Record<string, unknown> | undefined;
      if (w?.commercialResponsableId) {
        const all = Array.from(this.prospects.values()).filter(
          (p) => p.commercialResponsableId === w.commercialResponsableId,
        );
        list.push(...all);
      } else {
        list.push(...Array.from(this.prospects.values()));
      }
      const groups = new Map<string, number>();
      for (const p of list) {
        const key = by instanceof Array ? by[0] : 'statutPipeline';
        const val = p[key as keyof FakeProspect] as string;
        groups.set(val, (groups.get(val) || 0) + 1);
      }
      return Promise.resolve(
        Array.from(groups.entries()).map(([statutPipeline, _count]) => ({
          statutPipeline,
          _count: { statutPipeline: _count },
        })),
      );
    },
    create: ({
      data,
      include: _include,
    }: {
      data: Partial<FakeProspect>;
      include?: unknown;
    }) => {
      const prospect = this.seedProspect(data);
      return Promise.resolve(prospect);
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<FakeProspect>;
    }) => {
      const existing = this.prospects.get(where.id);
      if (!existing) throw new Error('Prospect not found (fake prisma)');
      const merged = { ...existing, ...data, updatedAt: new Date() };
      this.prospects.set(where.id, merged);
      return Promise.resolve(merged);
    },
    delete: ({ where }: { where: { id: string } }) => {
      const existing = this.prospects.get(where.id);
      if (!existing) throw new Error('Prospect not found (fake prisma)');
      this.prospects.delete(where.id);
      return Promise.resolve(existing);
    },
  };

  contact = {
    findUnique: ({ where }: { where: { id: string } }) => {
      return Promise.resolve(this.contacts.get(where.id) ?? null);
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<FakeContact>;
    }) => {
      const existing = this.contacts.get(where.id);
      if (!existing) throw new Error('Contact not found (fake prisma)');
      const merged = { ...existing, ...data };
      this.contacts.set(where.id, merged);
      return Promise.resolve(merged);
    },
  };

  activiteCrm = {
    findMany: ({ where, orderBy }: Record<string, unknown> = {}) => {
      let list = Array.from(this.activitesCrm.values());
      const w = where as Record<string, unknown> | undefined;
      if (w?.prospectId) {
        list = list.filter((a) => a.prospectId === w.prospectId);
      }
      if (w?.statut) {
        list = list.filter((a) => a.statut === w.statut);
      }
      const ob = orderBy as Record<string, string> | undefined;
      if (ob) {
        const key = Object.keys(ob)[0];
        const dir = ob[key];
        list.sort((a, b) => {
          const aVal = a[key as keyof FakeActiviteCrm];
          const bVal = b[key as keyof FakeActiviteCrm];
          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;
          if (aVal < bVal) return dir === 'desc' ? 1 : -1;
          if (aVal > bVal) return dir === 'desc' ? -1 : 1;
          return 0;
        });
      }
      return Promise.resolve(list);
    },
    count: ({ where }: { where?: Record<string, unknown> } = {}) => {
      let list = Array.from(this.activitesCrm.values());
      const w = where;
      if (w?.prospectId) {
        list = list.filter((a) => a.prospectId === w.prospectId);
      }
      if (w?.statut) {
        list = list.filter((a) => a.statut === w.statut);
      }
      return Promise.resolve(list.length);
    },
    create: ({ data }: { data: Partial<FakeActiviteCrm> }) => {
      const activite: FakeActiviteCrm = {
        id: fakeUuid(),
        prospectId: data.prospectId as string,
        type: data.type as string,
        titre: data.titre as string,
        description: (data.description as string | null) ?? null,
        dateEcheance: data.dateEcheance ? new Date(data.dateEcheance) : null,
        dateRealisation: data.dateRealisation
          ? new Date(data.dateRealisation)
          : null,
        statut: (data.statut as string) ?? 'a_faire',
        priorite: (data.priorite as string) ?? 'moyenne',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.activitesCrm.set(activite.id, activite);
      return Promise.resolve(activite);
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<FakeActiviteCrm>;
    }) => {
      const existing = this.activitesCrm.get(where.id);
      if (!existing) throw new Error('ActiviteCrm not found (fake prisma)');
      const merged = { ...existing, ...data, updatedAt: new Date() };
      this.activitesCrm.set(where.id, merged);
      return Promise.resolve(merged);
    },
    delete: ({ where }: { where: { id: string } }) => {
      const existing = this.activitesCrm.get(where.id);
      if (!existing) throw new Error('ActiviteCrm not found (fake prisma)');
      this.activitesCrm.delete(where.id);
      return Promise.resolve(existing);
    },
  };

  documentCrm = {
    findFirst: ({ where }: { where: { id: string; prospectId: string } }) => {
      const list = Array.from(this.documentsCrm.values()).filter(
        (d) => d.id === where.id && d.prospectId === where.prospectId,
      );
      return Promise.resolve(list[0] ?? null);
    },
    findMany: ({ where }: { where?: Record<string, unknown> } = {}) => {
      let list = Array.from(this.documentsCrm.values());
      const w = where;
      if (w?.prospectId) {
        list = list.filter((d) => d.prospectId === w.prospectId);
      }
      return Promise.resolve(list);
    },
    create: ({ data }: { data: Partial<FakeDocumentCrm> }) => {
      const doc: FakeDocumentCrm = {
        id: fakeUuid(),
        prospectId: data.prospectId as string,
        type: data.type as string,
        title: (data.title as string | null) ?? null,
        isPublic: (data.isPublic as boolean) ?? false,
        storageKey: data.storageKey as string,
        resourceType: (data.resourceType as string) ?? 'raw',
        url: (data.url as string | null) ?? null,
        version: (data.version as number) ?? 1,
        createdAt: new Date(),
      };
      this.documentsCrm.set(doc.id, doc);
      return Promise.resolve(doc);
    },
    delete: ({ where }: { where: { id: string } }) => {
      const existing = this.documentsCrm.get(where.id);
      if (!existing) throw new Error('DocumentCrm not found (fake prisma)');
      this.documentsCrm.delete(where.id);
      return Promise.resolve(existing);
    },
  };

  dossierVente = {
    findMany: ({
      where,
      include,
      orderBy,
      take,
    }: {
      where?: Record<string, unknown>;
      include?: Record<string, unknown>;
      orderBy?: Record<string, string>;
      take?: number;
    } = {}) => {
      let list = Array.from(this.dossiersVente.values());
      const w = where;
      if (w?.prospectId) {
        list = list.filter((d) => d.prospectId === w.prospectId);
      }
      if (w?.commercialResponsableId) {
        list = list.filter(
          (d) => d.commercialResponsableId === w.commercialResponsableId,
        );
      }
      if (w?.terrainId) {
        list = list.filter((d) => d.terrainId === w.terrainId);
      }
      if (w?.statut) {
        list = list.filter((d) => d.statut === w.statut);
      }
      if (w?.createdAt && typeof w.createdAt === 'object') {
        const createdAtWhere = w.createdAt as Record<string, Date>;
        if (createdAtWhere.gte)
          list = list.filter((d) => d.createdAt >= createdAtWhere.gte);
        if (createdAtWhere.lte)
          list = list.filter((d) => d.createdAt <= createdAtWhere.lte);
      }
      if (orderBy) {
        const key = Object.keys(orderBy)[0];
        const dir = orderBy[key];
        list.sort((a, b) => {
          const aVal = a[key as keyof FakeDossierVente];
          const bVal = b[key as keyof FakeDossierVente];
          if (aVal == null && bVal == null) return 0;
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          if (aVal < bVal) return dir === 'desc' ? 1 : -1;
          if (aVal > bVal) return dir === 'desc' ? -1 : 1;
          return 0;
        });
      }
      if (take && take > 0) list = list.slice(0, take);
      return Promise.resolve(
        list.map((dossier) => ({
          ...dossier,
          prospect: this.prospects.get(dossier.prospectId) ?? null,
          terrain: this.terrains.get(dossier.terrainId ?? '') ?? null,
          mandat: null,
          commercialResponsable: dossier.commercialResponsableId
            ? (this.users.get(dossier.commercialResponsableId) ?? null)
            : null,
          reservations: Array.from(this.reservations.values()).filter(
            (r) => r.dossierVenteId === dossier.id,
          ),
          paiements: Array.from(this.paiements.values()).filter(
            (p) => p.dossierVenteId === dossier.id,
          ),
          commissions: Array.from(this.commissionsVente.values()).filter(
            (c) => c.dossierVenteId === dossier.id,
          ),
          documents: Array.from(this.documentsVente.values()).filter(
            (d) => d.dossierVenteId === dossier.id,
          ),
          _count: { documents: 0, commissions: 0 },
        })),
      );
    },
    findUnique: (
      {
        where,
        include,
      }: { where: { id: string }; include?: Record<string, unknown> } = {
        where: { id: '' },
      },
    ) => {
      const dossier = this.dossiersVente.get(where.id);
      if (!dossier) return Promise.resolve(null);
      const result: Record<string, unknown> = {
        ...dossier,
        prospect: this.prospects.get(dossier.prospectId) ?? null,
        terrain: dossier.terrainId
          ? (this.terrains.get(dossier.terrainId) ?? null)
          : null,
        mandat: null,
        commercialResponsable: dossier.commercialResponsableId
          ? (this.users.get(dossier.commercialResponsableId) ?? null)
          : null,
        reservations: Array.from(this.reservations.values()).filter(
          (r) => r.dossierVenteId === dossier.id,
        ),
        paiements: Array.from(this.paiements.values()).filter(
          (p) => p.dossierVenteId === dossier.id,
        ),
        commissions: Array.from(this.commissionsVente.values()).filter(
          (c) => c.dossierVenteId === dossier.id,
        ),
        documents: Array.from(this.documentsVente.values()).filter(
          (d) => d.dossierVenteId === dossier.id,
        ),
      };
      if (include?._count) {
        result._count = {
          documents: (result.documents as unknown[]).length,
          commissions: (result.commissions as unknown[]).length,
        };
      }
      return Promise.resolve(result);
    },
    findFirst: (
      { where }: { where: Record<string, unknown> } = { where: {} },
    ) => {
      let list = Array.from(this.dossiersVente.values());
      if (where.id) list = list.filter((dossier) => dossier.id === where.id);
      if (where.terrainId)
        list = list.filter((dossier) => dossier.terrainId === where.terrainId);
      if (where.prospectId)
        list = list.filter(
          (dossier) => dossier.prospectId === where.prospectId,
        );
      if (where.commercialResponsableId)
        list = list.filter(
          (dossier) =>
            dossier.commercialResponsableId === where.commercialResponsableId,
        );
      if (where.statut)
        list = list.filter((dossier) => dossier.statut === where.statut);
      if (where.reservationRequestId)
        list = list.filter(
          (dossier) =>
            dossier.reservationRequestId === where.reservationRequestId,
        );
      if (where.createdAt && typeof where.createdAt === 'object') {
        const createdAtWhere = where.createdAt as Record<string, Date>;
        if (createdAtWhere.gte)
          list = list.filter(
            (dossier) => dossier.createdAt >= createdAtWhere.gte,
          );
        if (createdAtWhere.lte)
          list = list.filter(
            (dossier) => dossier.createdAt <= createdAtWhere.lte,
          );
      }
      return Promise.resolve(list[0] ?? null);
    },
    count: ({ where }: { where?: Record<string, unknown> } = {}) => {
      let list = Array.from(this.dossiersVente.values());
      const w = where;
      if (w?.commercialResponsableId) {
        list = list.filter(
          (dossier) =>
            dossier.commercialResponsableId === w.commercialResponsableId,
        );
      }
      return Promise.resolve(list.length);
    },
    groupBy: (
      {
        by,
        where,
        _count,
      }: {
        by: string[];
        where?: Record<string, unknown>;
        _count?: Record<string, unknown>;
      } = { by: [], where: {} },
    ) => {
      let list = Array.from(this.dossiersVente.values());
      const w = where;
      if (w?.commercialResponsableId) {
        list = list.filter(
          (dossier) =>
            dossier.commercialResponsableId === w.commercialResponsableId,
        );
      }
      const groups = new Map<string, number>();
      for (const dossier of list) {
        const key = by[0];
        const val = dossier[key as keyof FakeDossierVente] as string;
        groups.set(val, (groups.get(val) || 0) + 1);
      }
      return Promise.resolve(
        Array.from(groups.entries()).map(([statut, count]) => ({
          statut,
          _count: { statut: count },
        })),
      );
    },
    create: ({ data }: { data: Partial<FakeDossierVente> }) => {
      const dossier: FakeDossierVente = {
        id: data.id ?? fakeUuid(),
        prospectId: data.prospectId as string,
        terrainId: data.terrainId ?? null,
        mandatId: data.mandatId ?? null,
        commercialResponsableId: data.commercialResponsableId ?? null,
        referenceInterne: data.referenceInterne ?? null,
        prixVente: data.prixVente ?? null,
        commissionEstimee: data.commissionEstimee ?? null,
        notes: data.notes ?? null,
        statut: data.statut ?? 'en_cours',
        dateVente: data.dateVente ?? null,
        reservationRequestId: data.reservationRequestId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.dossiersVente.set(dossier.id, dossier);
      return Promise.resolve(dossier);
    },
    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<FakeDossierVente>;
    }) => {
      const existing = this.dossiersVente.get(where.id);
      if (!existing) throw new Error('DossierVente not found (fake prisma)');
      const merged = { ...existing, ...data, updatedAt: new Date() };
      this.dossiersVente.set(where.id, merged);
      return Promise.resolve(merged);
    },
    delete: ({ where }: { where: { id: string } }) => {
      const existing = this.dossiersVente.get(where.id);
      if (!existing) throw new Error('DossierVente not found (fake prisma)');
      this.dossiersVente.delete(where.id);
      return Promise.resolve(existing);
    },
  };

  systemSetting = {
    findUnique: ({ where }: { where: { key: string } }) => {
      return Promise.resolve(this.systemSettings.get(where.key) ?? null);
    },
    upsert: ({
      where,
      create,
    }: {
      where: { key: string };
      create: Partial<FakeSystemSetting>;
    }) => {
      const existing = this.systemSettings.get(where.key);
      const merged: FakeSystemSetting = {
        ...create,
        id: existing?.id ?? fakeUuid(),
        key: where.key,
        createdAt: existing?.createdAt ?? new Date(),
        updatedAt: new Date(),
      } as FakeSystemSetting;
      this.systemSettings.set(where.key, merged);
      return Promise.resolve(merged);
    },
  };

  // Utilisé par HealthService — simule une base disponible.
  $queryRaw = () => Promise.resolve([{ '?column?': 1 }]);

  $transaction = async (
    ops: ((tx: FakePrismaService) => Promise<unknown>) | Promise<unknown>[],
    _options?: unknown,
  ) => {
    if (typeof ops === 'function') {
      return await ops(this);
    }

    return await Promise.all(ops);
  };
}
