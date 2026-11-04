import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateContactDto } from './create-contact.dto';
import { CreatePublicReservationRequestDto } from '../../ventes/dto/create-public-reservation-request.dto';
import { ConfierBienDto } from './confier-bien.dto';

const base = { nom: 'Awa Diop', message: 'Je souhaite être rappelée.' };

async function erreurs<T extends object>(
  classe: new () => T,
  donnees: object,
): Promise<string[]> {
  const resultat = await validate(plainToInstance(classe, donnees));
  return resultat.map((e) => e.property);
}

describe('Demandes du site : e-mail ou téléphone, au minimum un des deux', () => {
  it('refuse un message sans e-mail ni téléphone', async () => {
    expect(await erreurs(CreateContactDto, base)).toContain('email');
  });

  it('accepte un message avec le seul e-mail', async () => {
    expect(
      await erreurs(CreateContactDto, { ...base, email: 'awa@example.com' }),
    ).toEqual([]);
  });

  it('accepte un message avec le seul téléphone', async () => {
    expect(
      await erreurs(CreateContactDto, { ...base, telephone: '77 123 45 67' }),
    ).toEqual([]);
  });

  it('refuse un e-mail mal formé même avec un téléphone', async () => {
    expect(
      await erreurs(CreateContactDto, {
        ...base,
        email: 'pas-un-email',
        telephone: '77 123 45 67',
      }),
    ).toContain('email');
  });

  it('applique la même règle à la demande de réservation', async () => {
    const reservation = {
      terrainId: '0b1f4f64-6a0e-4a39-9d52-3a6e7a0f6c11',
      nom: 'Awa Diop',
    };
    expect(
      await erreurs(CreatePublicReservationRequestDto, reservation),
    ).toContain('email');
    expect(
      await erreurs(CreatePublicReservationRequestDto, {
        ...reservation,
        telephone: '771234567',
      }),
    ).toEqual([]);
  });

  it('rend l’e-mail facultatif quand le téléphone est déjà exigé (confier un bien)', async () => {
    const mauvais = await erreurs(ConfierBienDto, {
      nom: 'Awa Diop',
      telephone: '771234567',
      typeBien: 'villa',
      commune: 'Dakar',
      situation: 'libre',
      consentement: true,
    });
    expect(mauvais).not.toContain('email');
  });

  it.each(['abcdef', '1234', '00000000', '12 34 56 78 90', '77 12'])(
    'refuse le numéro « %s »',
    async (telephone) => {
      expect(await erreurs(CreateContactDto, { ...base, telephone })).toContain(
        'telephone',
      );
    },
  );

  it.each([
    '77 123 45 67',
    '+221 77 123 45 67',
    '00221771234567',
    '+33 6 12 34 56 78',
  ])('accepte le numéro « %s »', async (telephone) => {
    expect(await erreurs(CreateContactDto, { ...base, telephone })).toEqual([]);
  });
});
