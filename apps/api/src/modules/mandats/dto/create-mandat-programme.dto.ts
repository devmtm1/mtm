import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Confier d'un coup tous les lots d'un programme de lotissement à un mandat. */
export class CreateMandatProgrammeDto {
  @ApiProperty() @IsUUID() programmeId!: string;
}
