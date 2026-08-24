import {
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
    return JSON.parse(JSON.stringify(value)) as object;
  }
}
