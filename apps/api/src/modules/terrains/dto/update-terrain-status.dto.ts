import { IsString, Length } from 'class-validator';

export class UpdateTerrainStatusDto {
  @IsString() @Length(1, 100) value!: string;
}
