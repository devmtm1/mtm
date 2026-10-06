import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { versBooleen } from './booleen.transform';
import { CreateDocumentVenteDto } from '../../modules/ventes/dto/create-document-vente.dto';
import { CreateDocumentCrmDto } from '../../modules/crm/dto/create-document-crm.dto';
import { CreateMandatDocumentDto } from '../../modules/mandats/dto/create-mandat-document.dto';

describe('versBooleen', () => {
  it.each([
    ['true', true],
    ['1', true],
    ['false', false],
    ['0', false],
    [true, true],
    [false, false],
  ])('convertit %p en %p', (value, attendu) => {
    expect(versBooleen({ value })).toBe(attendu);
  });

  it('laisse une valeur inconnue au validateur', () => {
    expect(versBooleen({ value: 'peut-être' })).toBe('peut-être');
    expect(versBooleen({ value: undefined })).toBeUndefined();
  });
});

// Les formulaires d'upload du back-office envoient `isPublic` en texte. Avec
// la configuration réelle du pipeline, « false » doit rester faux : un
// document privé ne doit jamais devenir public.
describe('drapeau isPublic des envois multipart', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });

  it.each([
    ['ventes', CreateDocumentVenteDto],
    ['CRM', CreateDocumentCrmDto],
    ['mandats', CreateMandatDocumentDto],
  ])('%s : « false » reste faux', async (_nom, metatype) => {
    const out = (await pipe.transform(
      { type: 'contrat', isPublic: 'false' },
      { type: 'body', metatype },
    )) as { isPublic: boolean };
    expect(out.isPublic).toBe(false);
  });

  it('« true » reste vrai', async () => {
    const out = (await pipe.transform(
      { type: 'contrat', isPublic: 'true' },
      { type: 'body', metatype: CreateDocumentVenteDto },
    )) as { isPublic: boolean };
    expect(out.isPublic).toBe(true);
  });
});
