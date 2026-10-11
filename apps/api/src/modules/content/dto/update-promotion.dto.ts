import { PartialType } from '@nestjs/swagger';
import { OmitType } from '@nestjs/swagger';
import { CreatePromotionDto } from './create-promotion.dto';

/** Mise à jour : la publication passe par sa propre route (permission distincte). */
export class UpdatePromotionDto extends PartialType(
  OmitType(CreatePromotionDto, ['isActive'] as const),
) {}
