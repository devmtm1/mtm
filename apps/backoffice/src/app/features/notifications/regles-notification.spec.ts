import type { EvenementNotification } from '../../core/services/api/notifications-api.service';
import { type LigneRegle, reglesAEnvoyer } from './regles-notification';

function ligne(partiel: Partial<LigneRegle>, evenement: Partial<EvenementNotification> = {}): LigneRegle {
  const base: EvenementNotification = {
    cle: 'nouveau_prospect',
    famille: 'Commercial',
    libelle: 'Nouveau prospect',
    description: '',
    destinataire: 'permission',
    permission: 'crm:administrer',
    emailParDefaut: false,
    regle: {},
    effectif: { actif: true, permission: 'crm:administrer', email: false, sms: false, whatsapp: false },
    ...evenement,
  };
  return {
    evenement: base,
    actif: true,
    permission: base.permission ?? null,
    email: base.emailParDefaut,
    sms: false,
    whatsapp: false,
    ...partiel,
  };
}

describe('reglesAEnvoyer', () => {
  it('n’envoie rien quand tout est comme à l’origine', () => {
    expect(reglesAEnvoyer([ligne({})])).toEqual({});
  });

  it('n’envoie que ce qui s’écarte des réglages d’origine', () => {
    expect(
      reglesAEnvoyer([
        ligne({ actif: false }),
        ligne({ email: true }, { cle: 'autre' }),
        ligne({ permission: 'ventes:valider', sms: true }, { cle: 'troisieme' }),
      ]),
    ).toEqual({
      nouveau_prospect: { actif: false },
      autre: { email: true },
      troisieme: { permission: 'ventes:valider', sms: true },
    });
  });

  it('ne règle pas la permission d’un événement adressé à une personne', () => {
    const regles = reglesAEnvoyer([
      ligne({ permission: 'crm:modifier' }, { cle: 'tache_assignee', destinataire: 'personne', permission: undefined }),
    ]);
    expect(regles).toEqual({});
  });
});
