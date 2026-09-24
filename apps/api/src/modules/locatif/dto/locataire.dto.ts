import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class CreateLocataireDto {
  @IsString() @Length(1, 100) firstName!: string;
  @IsString() @Length(1, 100) lastName!: string;
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email?: string;
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Length(1, 30)
  phone?: string;
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Length(0, 500)
  notes?: string;
}

export class UpdateLocataireDto {
  @IsOptional() @IsString() @Length(1, 100) firstName?: string;
  @IsOptional() @IsString() @Length(1, 100) lastName?: string;
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email?: string;
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Length(1, 30)
  phone?: string;
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Length(0, 500)
  notes?: string;
}
