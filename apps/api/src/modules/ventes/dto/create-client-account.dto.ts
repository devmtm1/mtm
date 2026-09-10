import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, Length, Matches } from 'class-validator';

export class CreateClientAccountDto {
  @ApiProperty()
  @IsUUID()
  prospectId!: string;

  @ApiProperty({ example: 'MotDePasseClient123!' })
  @IsString()
  @Length(12, 200)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
  password!: string;
}
