import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'utilisateur@mtm-immobilier.sn' })
  @IsEmail()
  email!: string;
}