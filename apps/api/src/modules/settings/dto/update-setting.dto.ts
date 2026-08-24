import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class UpdateSettingDto {
  @ApiProperty({
    description: 'Nouvelle valeur JSON quelconque',
    example: 6,
  })
  @IsNotEmpty()
  value!: unknown;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}
