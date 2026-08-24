import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateSettingDto } from './create-setting.dto';

describe('CreateSettingDto (validation)', () => {
  it('accepte une clé au format resource.action valide', async () => {
    const dto = plainToInstance(CreateSettingDto, {
      key: 'commission.taux_defaut',
      value: 5,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejette une clé contenant des majuscules', async () => {
    const dto = plainToInstance(CreateSettingDto, {
      key: 'Commission.Taux',
      value: 5,
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'key')).toBe(true);
  });

  it('rejette une clé contenant des espaces', async () => {
    const dto = plainToInstance(CreateSettingDto, {
      key: 'commission taux',
      value: 5,
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'key')).toBe(true);
  });

  it('accepte isSensitive optionnel (absent)', async () => {
    const dto = plainToInstance(CreateSettingDto, {
      key: 'app.name',
      value: 'MTM Immobilier',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejette isSensitive non booléen', async () => {
    const dto = plainToInstance(CreateSettingDto, {
      key: 'app.name',
      value: 'MTM Immobilier',
      isSensitive: 'oui',
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'isSensitive')).toBe(true);
  });
});
