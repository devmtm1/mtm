import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InternalNotificationService } from '../../common/mail/internal-notification.service';
import { MailService } from '../../common/mail/mail.service';
import { nextProspectReference } from '../crm/prospect-reference';
import { PrismaService } from '../../database/prisma.service';
import { LocatifPublicService } from '../locatif/locatif-public.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  COMMERCIAL_ROLES,
  hasAnyRole,
  hasSupervisionScope,
} from '../rbac/role-groups';
import { CreateContactDto } from './dto/create-contact.dto';
import type { ConfierBienDto } from './dto/confier-bien.dto';
import type { DevisConstructionDto } from './dto/devis-construction.dto';
import type { Contact, Prisma } from '@prisma/client';

const LIBELLES_TYPE_BIEN: Record<string, string> = {
  appartement: 'Appartement',
  villa: 'Villa',
  immeuble: 'Immeuble ou villa divisée en plusieurs logements',
  bureau: 'Bureau',
  commerce: 'Local commercial',
  courte_duree: 'Bien meublé en courte durée',
  autre: 'Autre',
};

const LIBELLES_SITUATION: Record<string, string> = {
  libre: 'Libre',
  loue: 'Déjà loué',
  en_travaux: 'En travaux',
};

/** Le sujet sous lequel une proposition de bien apparaît dans « Demandes du site ». */
export const SUJET_CONFIER_BIEN = 'Confier un bien en gestion locative';
export const SUJET_DEVIS_CONSTRUCTION = 'Demande de devis de construction';

const LIBELLES_PROJET: Record<string, string> = {
  villa: 'Construction d’une villa ou d’une maison',
  immeuble: 'Construction d’un immeuble',
  renovation: 'Rénovation ou extension',
  amenagement: 'Aménagement ou finitions',
  autre: 'Autre projet',
};

const LIBELLES_TERRAIN: Record<string, string> = {
  possede: 'Le client possède déjà un terrain',
  a_trouver: 'Le client cherche un terrain',
};

/** Quelle équipe est prévenue d'une demande structurée du site, et comment. */
interface AlerteDemande {
  permission: string;
  type: string;
  titre: string;
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: InternalNotificationService,
    private readonly locations: LocatifPublicService,
    private readonly notificationsInternes: NotificationsService,
    private readonly mail: MailService,
  ) {}

  /**
   * Un propriétaire propose un bien à la gestion. La demande rejoint les messages du site (avec sa nature et ses
   * champs) et prévient les gestionnaires locatifs : un collaborateur la valide avant toute création de fiche.
   * Un robot (champ piège rempli) reçoit la même réponse, sans rien enregistrer.
   */
  async confierBien(dto: ConfierBienDto): Promise<{ enregistre: boolean }> {
    if (dto.siteWeb?.trim()) return { enregistre: false };

    const details = {
      pays: dto.pays ?? null,
      typeBien: dto.typeBien,
      commune: dto.commune,
      region: dto.region ?? null,
      nombreLogements: dto.nombreLogements ?? null,
      situation: dto.situation,
      loyerSouhaite: dto.loyerSouhaite ?? null,
    };
    const message = [
      `Type de bien : ${LIBELLES_TYPE_BIEN[dto.typeBien] ?? dto.typeBien}`,
      `Lieu : ${[dto.commune, dto.region].filter(Boolean).join(', ')}`,
      dto.nombreLogements ? `Nombre de logements : ${dto.nombreLogements}` : '',
      `Situation : ${LIBELLES_SITUATION[dto.situation] ?? dto.situation}`,
      dto.loyerSouhaite
        ? `Loyer souhaité : ${dto.loyerSouhaite.toLocaleString('fr-FR')} FCFA par logement`
        : '',
      dto.pays ? `Réside en : ${dto.pays}` : '',
      dto.precisions?.trim() ? `\nPrécisions : ${dto.precisions.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    await this.create(
      {
        nom: dto.nom,
        email: dto.email,
        telephone: dto.telephone,
        sujet: SUJET_CONFIER_BIEN,
        message,
      },
      {
        type: 'confier_bien',
        details,
        alerte: {
          permission: 'locatif:modifier',
          type: 'demande_gestion',
          titre: 'Un propriétaire propose un bien à la gestion',
        },
      },
    );
    return { enregistre: true };
  }

  /**
   * Un visiteur demande un devis de construction. Même principe que `confierBien` : la demande rejoint les messages du
   * site avec ses champs et prévient l'équipe construction, qui rappelle.
   */
  async demanderDevis(
    dto: DevisConstructionDto,
  ): Promise<{ enregistre: boolean }> {
    if (dto.siteWeb?.trim()) return { enregistre: false };

    const details = {
      pays: dto.pays ?? null,
      typeProjet: dto.typeProjet,
      terrain: dto.terrain,
      commune: dto.commune,
      budget: dto.budget ?? null,
    };
    const message = [
      `Projet : ${LIBELLES_PROJET[dto.typeProjet] ?? dto.typeProjet}`,
      `Lieu : ${dto.commune}`,
      LIBELLES_TERRAIN[dto.terrain] ?? '',
      dto.budget
        ? `Budget indicatif : ${dto.budget.toLocaleString('fr-FR')} FCFA`
        : '',
      dto.pays ? `Réside en : ${dto.pays}` : '',
      dto.precisions?.trim() ? `\nPrécisions : ${dto.precisions.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    await this.create(
      {
        nom: dto.nom,
        email: dto.email,
        telephone: dto.telephone,
        sujet: SUJET_DEVIS_CONSTRUCTION,
        message,
      },
      {
        type: 'devis_construction',
        details,
        alerte: {
          permission: 'construction:modifier',
          type: 'demande_devis_construction',
          titre: 'Demande de devis de construction',
        },
      },
    );
    return { enregistre: true };
  }

  async create(
    dto: CreateContactDto,
    extras: {
      type?: string;
      details?: Prisma.InputJsonValue;
      /** Une demande structurée prévient l'équipe concernée (cloche), comme une demande de visite sur une annonce. */
      alerte?: AlerteDemande;
    } = {},
  ): Promise<Contact> {
    let terrainLabel: string | undefined;
    if (dto.terrainId) {
      const terrain = await this.prisma.terrain.findUnique({
        where: { id: dto.terrainId },
        select: { id: true, referenceInterne: true, nom: true },
      });
      if (!terrain) throw new NotFoundException('Bien introuvable');
      terrainLabel = `${terrain.referenceInterne} — ${terrain.nom}`;
    }
    // Demande venant d'une annonce de location : seule une annonce visible
    // sur le site peut être demandée (une annonce retirée ou déjà louée
    // répond « introuvable », comme sa page).
    let bienLabel: string | undefined;
    if (dto.bienLocatifId) {
      const bien = await this.locations.estVisible(dto.bienLocatifId);
      if (!bien) throw new NotFoundException('Annonce introuvable');
      bienLabel = `${bien.referenceInterne} — ${bien.label}`;
    }
    const sujet =
      dto.sujet ?? (dto.bienLocatifId ? 'Demande de location' : undefined);
    const contact = await this.prisma.contact.create({
      data: {
        nom: dto.nom,
        email: dto.email,
        telephone: dto.telephone,
        sujet,
        message: dto.message,
        terrainId: dto.terrainId,
        bienLocatifId: dto.bienLocatifId,
        ...(extras.type ? { type: extras.type } : {}),
        ...(extras.details ? { details: extras.details } : {}),
      },
    });

    // Notification à l'équipe : non bloquante, la demande est déjà enregistrée.
    void this.notifications.notify(
      `Nouveau message : ${sujet || 'sans sujet'}`,
      [
        `De : ${dto.nom} <${dto.email}>`,
        dto.telephone ? `Téléphone : ${dto.telephone}` : '',
        terrainLabel ? `Terrain : ${terrainLabel}` : '',
        bienLabel ? `Bien en location : ${bienLabel}` : '',
        '',
        dto.message,
        '',
        'À traiter dans le back-office (Contacts / CRM).',
      ],
    );

    // La cloche de l'équipe : tout nouveau message du site, quel qu'en soit le sujet.
    void this.notificationsInternes.alerter('contact:modifier', {
      type: 'nouveau_contact',
      titre: `Nouveau message du site : ${sujet || 'sans sujet'}`,
      message: `${dto.nom}${dto.telephone ? ` · ${dto.telephone}` : ''}`,
      lien: '/contacts',
      entityType: 'Contact',
      entityId: contact.id,
      dedupeKey: `nouveau-contact:${contact.id}`,
    });

    // Les gestionnaires locatifs la voient dans leur cloche : une demande de
    // location attend un rappel rapide, avant qu'un autre bien ne soit choisi.
    if (dto.bienLocatifId) {
      void this.notificationsInternes.notifierPermission('locatif:modifier', {
        type: 'demande_location',
        titre: `Demande de location — ${bienLabel ?? 'bien'}`,
        message: `${dto.nom}${dto.telephone ? ` · ${dto.telephone}` : ''}`,
        lien: '/contacts',
        entityType: 'Contact',
        entityId: contact.id,
        dedupeKey: `demande-location:${contact.id}`,
      });
    }

    // Une proposition de bien attend un rappel rapide : la cloche des gestionnaires locatifs, comme une demande de
    // visite sur une annonce.
    if (extras.alerte) {
      void this.notificationsInternes.notifierPermission(
        extras.alerte.permission,
        {
          type: extras.alerte.type,
          titre: extras.alerte.titre,
          message: `${dto.nom}${dto.telephone ? ` · ${dto.telephone}` : ''}`,
          lien: '/contacts',
          entityType: 'Contact',
          entityId: contact.id,
          dedupeKey: `${extras.alerte.type}:${contact.id}`,
        },
      );
    }

    // --- Génération automatique de prospect CRM ---
    try {
      let prospect = await this.prisma.prospect.findFirst({
        where: {
          OR: [
            ...(dto.email ? [{ email: dto.email }] : []),
            ...(dto.telephone ? [{ telephone: dto.telephone }] : []),
          ],
        },
      });

      if (!prospect) {
        const [prenom, ...rest] = (dto.nom || '').split(' ');
        prospect = await this.prisma.prospect.create({
          data: {
            nom: rest.length ? rest.join(' ') : dto.nom,
            prenom: rest.length ? prenom : undefined,
            email: dto.email,
            telephone: dto.telephone,
            referenceInterne: await nextProspectReference(this.prisma),
            sourceAcquisition: 'site',
            besoins: `[${sujet || 'Contact public'}] ${dto.message}`,
            statutPipeline: 'nouveau',
          },
        });
      }

      await this.prisma.activiteCrm.create({
        data: {
          prospectId: prospect.id,
          type: 'note',
          titre: `Demande de contact web: ${sujet || 'Sans sujet'}`,
          description: dto.message,
          statut: 'realise',
          priorite: 'haute',
        },
      });
    } catch (error) {
      this.logger.error(
        `Échec de synchronisation du contact ${contact.id} vers le CRM`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return contact;
  }

  /**
   * Répond à un message. La réponse est enregistrée (elle s'affiche dans
   * l'espace client du demandeur), envoyée par e-mail, et signalée dans la
   * cloche du client s'il a un compte. Un e-mail qui ne part pas n'annule pas la
   * réponse : l'équipe est prévenue et peut joindre le client autrement.
   */
  async repondre(
    id: string,
    reponse: string,
    user: { id: string },
  ): Promise<{ contact: Contact; emailEnvoye: boolean }> {
    const existant = await this.prisma.contact.findUnique({ where: { id } });
    if (!existant) throw new NotFoundException('Message introuvable');
    const texte = reponse.trim();
    if (texte.length < 2)
      throw new BadRequestException('La réponse ne peut pas être vide');

    const contact = await this.prisma.contact.update({
      where: { id },
      data: {
        reponse: texte,
        reponduLe: new Date(),
        reponduParId: user.id,
        // Répondre, c'est prendre en charge.
        lu: true,
      },
    });

    let emailEnvoye = false;
    try {
      emailEnvoye = await this.mail.send({
        to: contact.email,
        subject: `Réponse de MTM Immobilier${contact.sujet ? ` — ${contact.sujet}` : ''}`,
        text: [
          `Bonjour ${contact.nom},`,
          '',
          texte,
          '',
          '— L’équipe MTM Immobilier',
          '',
          'Votre message :',
          contact.message,
        ].join('\n'),
      });
    } catch (error) {
      this.logger.warn(
        `Réponse au contact ${id} enregistrée mais e-mail non envoyé : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    void this.notificationsInternes.notifierClient(
      { email: contact.email },
      {
        type: 'reponse_demande',
        titre: 'MTM a répondu à votre message',
        message: texte.slice(0, 200),
        lien: '/espace-client/demandes',
        entityType: 'Contact',
        entityId: contact.id,
        dedupeKey: `reponse-contact:${contact.id}:${contact.reponduLe?.getTime() ?? Date.now()}`,
      },
    );

    return { contact, emailEnvoye };
  }

  /**
   * Chaque message porte le prospect déjà rattaché à la personne (même
   * e-mail ou même téléphone, la règle qu'applique `convertToProspect`), pour
   * que le back-office distingue « à créer » de « déjà au CRM ».
   */
  async findAll(options: { lu?: boolean } = {}) {
    const contacts = await this.prisma.contact.findMany({
      where: { ...(options.lu !== undefined ? { lu: options.lu } : {}) },
      orderBy: { createdAt: 'desc' },
      include: {
        terrain: { select: { id: true, referenceInterne: true } },
        bienLocatif: {
          select: { id: true, referenceInterne: true, titre: true, type: true },
        },
      },
    });

    // Comparaison tolérante : e-mail sans casse ni espaces, téléphone réduit à
    // ses neuf derniers chiffres (« +221 78 246 32 32 » = « 782463232 »).
    const emailKey = (value?: string | null) =>
      value?.trim().toLowerCase() || undefined;
    const phoneKey = (value?: string | null) => {
      const digits = value?.replace(/\D/g, '') ?? '';
      return digits.length >= 7 ? digits.slice(-9) : undefined;
    };

    const prospects = contacts.length
      ? await this.prisma.prospect.findMany({
          where: {
            OR: [{ email: { not: null } }, { telephone: { not: null } }],
          },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            referenceInterne: true,
            email: true,
            telephone: true,
          },
        })
      : [];
    const byEmail = new Map<string, (typeof prospects)[number]>();
    const byPhone = new Map<string, (typeof prospects)[number]>();
    for (const p of prospects) {
      const e = emailKey(p.email);
      const t = phoneKey(p.telephone);
      if (e && !byEmail.has(e)) byEmail.set(e, p);
      if (t && !byPhone.has(t)) byPhone.set(t, p);
    }

    return contacts.map((contact) => {
      const e = emailKey(contact.email);
      const t = phoneKey(contact.telephone);
      const found =
        (e ? byEmail.get(e) : undefined) ?? (t ? byPhone.get(t) : undefined);
      return {
        ...contact,
        prospect: found
          ? { id: found.id, referenceInterne: found.referenceInterne }
          : null,
      };
    });
  }

  async markRead(id: string): Promise<Contact> {
    return this.prisma.contact.update({
      where: { id },
      data: { lu: true },
    });
  }

  async convertToProspect(
    id: string,
    commercialResponsableId: string | undefined,
    user: { id: string; roles: string[]; permissions?: string[] },
  ) {
    const contact = await this.prisma.contact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('Message de contact introuvable');

    const isManager = hasSupervisionScope(user, 'crm');
    if (
      commercialResponsableId &&
      !isManager &&
      commercialResponsableId !== user.id
    ) {
      throw new BadRequestException(
        'Seul l’encadrement commercial peut affecter un autre commercial',
      );
    }

    if (commercialResponsableId) {
      const target = await this.prisma.user.findUnique({
        where: { id: commercialResponsableId },
        include: { roles: { include: { role: { select: { name: true } } } } },
      });
      const isCommercial = hasAnyRole(
        target?.roles.map((item) => item.role.name) ?? [],
        COMMERCIAL_ROLES,
      );
      if (!target?.isActive || !isCommercial) {
        throw new BadRequestException(
          'L’utilisateur cible est invalide ou ne possède pas un rôle commercial',
        );
      }
    }

    let prospect = await this.prisma.prospect.findFirst({
      where: {
        OR: [
          ...(contact.email ? [{ email: contact.email }] : []),
          ...(contact.telephone ? [{ telephone: contact.telephone }] : []),
        ],
      },
    });

    // Sans choix explicite, le prospect revient à la personne qui convertit
    // la demande : un commercial doit voir le prospect qu'il vient de créer
    // (périmètre = ses prospects). Un prospect existant sans responsable est
    // rattaché de la même façon ; s'il est déjà suivi par quelqu'un d'autre,
    // il n'est pas réaffecté sans choix explicite.
    const responsable = commercialResponsableId ?? user.id;
    if (!prospect) {
      const [prenom, ...rest] = (contact.nom || '').split(' ');
      prospect = await this.prisma.prospect.create({
        data: {
          nom: rest.length ? rest.join(' ') : contact.nom,
          prenom: rest.length ? prenom : undefined,
          email: contact.email,
          telephone: contact.telephone,
          referenceInterne: await nextProspectReference(this.prisma),
          sourceAcquisition: 'site',
          besoins: `[${contact.sujet || 'Contact public'}] ${contact.message}`,
          statutPipeline: 'nouveau',
          commercialResponsableId: responsable,
        },
      });
    } else if (commercialResponsableId || !prospect.commercialResponsableId) {
      prospect = await this.prisma.prospect.update({
        where: { id: prospect.id },
        data: { commercialResponsableId: responsable },
      });
    }

    await this.prisma.contact.update({
      where: { id },
      data: { lu: true },
    });

    return prospect;
  }
}
