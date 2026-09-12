import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSettingDto } from './dto/create-setting.dto';

export interface SafeSetting {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  isSensitive: boolean;
  updatedAt: Date;
  createdAt: Date;
  /** true si la valeur a été masquée faute de permission suffisante */
  redacted: boolean;
}

interface RawSetting {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  isSensitive: boolean;
  updatedAt: Date;
  createdAt: Date;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(canViewSensitive: boolean): Promise<SafeSetting[]> {
    const settings = await this.prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
    return settings.map((s: RawSetting) =>
      this.toSafeSetting(s, canViewSensitive),
    );
  }

  async findByKey(
    key: string,
    canViewSensitive: boolean,
  ): Promise<SafeSetting> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    if (!setting) {
      throw new NotFoundException('Paramètre introuvable');
    }
    return this.toSafeSetting(setting, canViewSensitive);
  }

  /**
   * Retourne la valeur brute (non masquée) d'un paramètre, pour un usage
   * interne par d'autres services applicatifs (jamais exposée directement
   * à un utilisateur sans passer par le contrôle de permission).
   */
  async getRawValue(key: string): Promise<unknown> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    return setting?.value;
  }

  /**
   * Liste de chaînes paramétrée (statuts, types, priorités…), avec repli sur
   * les valeurs par défaut du code si le paramètre est absent ou mal formé.
   * Point d'entrée unique pour la section 25 du cahier des charges
   * (« modifiable sans code ») : les modules métier ne lisent jamais
   * SystemSetting directement pour ce besoin.
   */
  async getStringList(
    key: string,
    fallback: readonly string[],
  ): Promise<string[]> {
    return SettingsService.asStringList(await this.getRawValue(key), fallback);
  }

  /** Nombre paramétré, strictement positif, avec repli. */
  async getPositiveNumber(key: string, fallback: number): Promise<number> {
    const value = await this.getRawValue(key);
    return typeof value === 'number' && value > 0 ? value : fallback;
  }

  /**
   * Vérifie qu'une valeur appartient à la liste paramétrée sous `key`.
   * `undefined` passe (champ optionnel non renseigné) ; sinon lève une
   * BadRequestException avec le libellé fourni.
   */
  async assertInList(
    key: string,
    fallback: readonly string[],
    value: string | undefined,
    invalidMessage: string,
  ): Promise<void> {
    if (value === undefined) return;
    const allowed = await this.getStringList(key, fallback);
    if (!allowed.includes(value)) {
      throw new BadRequestException(invalidMessage);
    }
  }

  static asStringList(value: unknown, fallback: readonly string[]): string[] {
    return Array.isArray(value) &&
      value.every((item): item is string => typeof item === 'string')
      ? value
      : [...fallback];
  }

  async create(dto: CreateSettingDto, updatedById: string) {
    const existing = await this.prisma.systemSetting.findUnique({
      where: { key: dto.key },
    });
    if (existing) {
      throw new ConflictException('Un paramètre avec cette clé existe déjà');
    }

    return this.prisma.systemSetting.create({
      data: {
        key: dto.key,
        value: this.toJson(dto.value),
        description: dto.description,
        isSensitive: dto.isSensitive ?? false,
        updatedById,
      },
    });
  }

  async update(
    key: string,
    value: unknown,
    description: string | undefined,
    updatedById: string,
  ) {
    const existing = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    if (!existing) {
      throw new NotFoundException('Paramètre introuvable');
    }

    return this.prisma.systemSetting.update({
      where: { key },
      data: {
        value: this.toJson(value),
        ...(description !== undefined ? { description } : {}),
        updatedById,
      },
    });
  }

  async remove(key: string): Promise<void> {
    const existing = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    if (!existing) {
      throw new NotFoundException('Paramètre introuvable');
    }
    await this.prisma.systemSetting.delete({ where: { key } });
  }

  async isSensitive(key: string): Promise<boolean> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
      select: { isSensitive: true },
    });
    return setting?.isSensitive ?? false;
  }

  private toSafeSetting(
    setting: RawSetting,
    canViewSensitive: boolean,
  ): SafeSetting {
    const shouldRedact = setting.isSensitive && !canViewSensitive;
    return {
      id: setting.id,
      key: setting.key,
      value: shouldRedact ? undefined : setting.value,
      description: setting.description,
      isSensitive: setting.isSensitive,
      updatedAt: setting.updatedAt,
      createdAt: setting.createdAt,
      redacted: shouldRedact,
    };
  }

  private toJson(value: unknown) {
    if (value === undefined) {
      return {} as object;
    }

    return structuredClone(value) as object;
  }
}
