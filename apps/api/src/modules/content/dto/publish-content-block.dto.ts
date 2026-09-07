import { IsBoolean } from 'class-validator';

export class PublishContentBlockDto {
  @IsBoolean()
  isActive!: boolean;
}