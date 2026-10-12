import { CLES_PARCOURS } from '../settings/settings.service';
import { CLES_WORKFLOW, WORKFLOWS, workflowDe } from './workflows.catalogue';
import { WorkflowsService } from './workflows.service';

function service() {
  return new WorkflowsService(
    undefined as never,
    undefined as never,
    undefined as never,
  );
}

describe('parcours configurables', () => {
  it('Paramètres refuse exactement les clés que la page des parcours gère', () => {
    expect([...CLES_PARCOURS].sort()).toEqual([...CLES_WORKFLOW].sort());
  });

  it('chaque parcours protège ses étapes d’origine', () => {
    for (const workflow of WORKFLOWS) {
      expect(workflow.statutsDefauts.length).toBeGreaterThan(2);
    }
  });

  const ventes = workflowDe('ventes')!;
  const base = {
    statuts: [...ventes.statutsDefauts],
    transitions: ventes.transitionsDefauts,
  };

  it('accepte les étapes d’origine telles quelles', () => {
    expect(() => service().validerEntree(ventes, base)).not.toThrow();
  });

  it('accepte une étape en plus, ordonnée où l’on veut', () => {
    const resultat = service().validerEntree(ventes, {
      statuts: [
        'en_cours',
        'attente_notaire',
        ...ventes.statutsDefauts.slice(1),
      ],
      transitions: {
        ...ventes.transitionsDefauts,
        attente_notaire: ['annule'],
      },
    });
    expect(resultat?.attente_notaire).toEqual(['annule']);
  });

  it('complète les passages manquants d’une nouvelle étape par une liste vide', () => {
    const resultat = service().validerEntree(ventes, {
      statuts: [...ventes.statutsDefauts, 'nouvelle_etape'],
      transitions: ventes.transitionsDefauts,
    });
    expect(resultat?.nouvelle_etape).toEqual([]);
  });

  it('refuse de retirer une étape d’origine', () => {
    expect(() =>
      service().validerEntree(ventes, {
        statuts: ventes.statutsDefauts.filter((s) => s !== 'reserve'),
        transitions: ventes.transitionsDefauts,
      }),
    ).toThrow(/ne se retirent pas/);
  });

  it('refuse un nom mal formé ou une étape en double', () => {
    for (const mauvais of [
      'Étape',
      'a',
      'avec espace',
      '1debut',
      'x'.repeat(41),
    ]) {
      expect(() =>
        service().validerEntree(ventes, {
          statuts: [...ventes.statutsDefauts, mauvais],
          transitions: ventes.transitionsDefauts,
        }),
      ).toThrow(/nom d’étape valide/);
    }
    expect(() =>
      service().validerEntree(ventes, {
        statuts: [...ventes.statutsDefauts, 'en_cours'],
        transitions: ventes.transitionsDefauts,
      }),
    ).toThrow(/deux fois/);
  });

  it('refuse un passage vers une étape inconnue ou le retrait d’un passage d’origine', () => {
    expect(() =>
      service().validerEntree(ventes, {
        ...base,
        transitions: { ...ventes.transitionsDefauts, en_cours: ['fantome'] },
      }),
    ).toThrow(/n’existe pas/);
    expect(() =>
      service().validerEntree(ventes, {
        ...base,
        transitions: { ...ventes.transitionsDefauts, reserve: ['annule'] },
      }),
    ).toThrow(/ne peut pas être retiré/);
  });

  it('ignore un passage d’une étape vers elle-même', () => {
    const resultat = service().validerEntree(ventes, {
      ...base,
      transitions: {
        ...ventes.transitionsDefauts,
        solde: ['solde'],
      },
    });
    expect(resultat?.solde).toEqual([]);
  });

  it('un parcours sans passages (pipeline, chantiers) ne demande que les étapes', () => {
    const crm = workflowDe('crm')!;
    expect(
      service().validerEntree(crm, {
        statuts: [...crm.statutsDefauts, 'attente'],
      }),
    ).toBeUndefined();
    expect(() =>
      service().validerEntree(crm, { statuts: crm.statutsDefauts.slice(1) }),
    ).toThrow();
  });
});
