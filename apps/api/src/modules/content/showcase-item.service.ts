import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CloudinaryService } from '../../common/storage/cloudinary.service';
import { validateUploadedAsset } from '../../common/storage/asset-validation';
import { CreateShowcaseItemDto } from './dto/create-showcase-item.dto';
import { UpdateShowcaseItemDto } from './dto/update-showcase-item.dto';

@Injectable()
export class ShowcaseItemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  private readonly publicSelect = {
    id: true,
    category: true,
    title: true,
    description: true,
    location: true,
    date: true,
    storageKey: true,
    resourceType: true,
    ordre: true,
  } as const;

  async findAll(category?: string) {
    const items = await this.prisma.showcaseItem.findMany({
      where: { isActive: true, ...(category ? { category } : {}) },
      select: this.publicSelect,
      orderBy: [{ ordre: 'asc' }, { date: 'desc' }],
    });
    return items.map((item) => this.toPublic(item));
  }

  async findAllAdmin() {
    const items = await this.prisma.showcaseItem.findMany({
      orderBy: [{ category: 'asc' }, { ordre: 'asc' }],
    });
    return items.map((item) => ({
      ...item,
      imageUrl: item.storageKey
        ? this.cloudinary.url(item.storageKey, item.resourceType, true)
        : null,
    }));
  }

  async create(dto: CreateShowcaseItemDto, user: { id: string }) {
    return this.prisma.showcaseItem.create({
      data: {
        category: dto.category,
        title: dto.title,
        description: dto.description,
        location: dto.location,
        date: dto.date ? new Date(dto.date) : undefined,
        ordre: dto.ordre ?? 0,
        isActive: dto.isActive ?? true,
        createdById: user.id,
      },
    });
  }

  async update(id: string, dto: UpdateShowcaseItemDto) {
    await this.ensureExists(id);
    return this.prisma.showcaseItem.update({
      where: { id },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
    });
  }

  async setActive(id: string, isActive: boolean) {
    await this.ensureExists(id);
    return this.prisma.showcaseItem.update({
      where: { id },
      data: { isActive },
    });
  }

  async remove(id: string): Promise<void> {
    const item = await this.ensureExists(id);
    await this.prisma.showcaseItem.delete({ where: { id } });
    if (item.storageKey) {
      await this.cloudinary.destroy(item.storageKey, item.resourceType, true);
    }
  }

  async uploadImage(id: string, file: Express.Multer.File) {
    const item = await this.ensureExists(id);
    validateUploadedAsset(file, 'media');
    const uploaded = await this.cloudinary.upload(file, 'mtm/showcase', true);
    if (item.storageKey) {
      await this.cloudinary.destroy(item.storageKey, item.resourceType, true);
    }
    return this.prisma.showcaseItem.update({
      where: { id },
      data: {
        storageKey: uploaded.publicId,
        resourceType: uploaded.resourceType,
      },
    });
  }

  private async ensureExists(id: string) {
    const item = await this.prisma.showcaseItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Élément de portfolio introuvable');
    return item;
  }

  private toPublic(item: Record<string, unknown>) {
    const storageKey = item['storageKey'];
    const resourceType =
      typeof item['resourceType'] === 'string' ? item['resourceType'] : 'image';
    return {
      ...item,
      imageUrl:
        typeof storageKey === 'string'
          ? this.cloudinary.url(storageKey, resourceType, true)
          : null,
      storageKey: undefined,
      resourceType: undefined,
    };
  }
}
