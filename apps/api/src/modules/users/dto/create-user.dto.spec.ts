import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';

describe('CreateUserDto (validation)', () => {
  const validPayload = {
    email: 'commercial@mtm-immobilier.sn',
    password: 'MotDePasseSecurise123!',
    firstName: 'Fatou',
    lastName: 'Diop',
  };

  it('accepte un payload valide', async () => {
    const dto = plainToInstance(CreateUserDto, validPayload);

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejette un mot de passe trop court (< 12 caractères)', async () => {
    const dto = plainToInstance(CreateUserDto, {
      ...validPayload,
      password: 'court1!',
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('rejette un email invalide', async () => {
    const dto = plainToInstance(CreateUserDto, {
      ...validPayload,
      email: 'invalide',
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('rejette un prénom vide', async () => {
    const dto = plainToInstance(CreateUserDto, {
      ...validPayload,
      firstName: '',
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'firstName')).toBe(true);
  });
});
