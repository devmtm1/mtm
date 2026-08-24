import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'responsable_marketing' })
  @IsString()
  @Length(2, 50)
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'Le nom du rôle doit être en minuscules, chiffres et underscores uniquement',
  })
  name!: string;

  @ApiProperty({ required: false, example: 'Responsable marketing' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}
