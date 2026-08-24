import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoginDto } from './login.dto';

describe('LoginDto (validation)', () => {
  it('accepte un login valide sans code 2FA', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'admin@mtm-immobilier.sn',
      password: 'MotDePasse123!',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('accepte un login valide avec code 2FA à 6 chiffres', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'admin@mtm-immobilier.sn',
      password: 'MotDePasse123!',
      twoFactorCode: '123456',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejette un email invalide', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'pas-un-email',
      password: 'MotDePasse123!',
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('rejette un mot de passe vide', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'admin@mtm-immobilier.sn',
      password: '',
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('rejette un code 2FA qui ne fait pas 6 chiffres', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'admin@mtm-immobilier.sn',
      password: 'MotDePasse123!',
      twoFactorCode: '123',
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'twoFactorCode')).toBe(true);
  });
});
