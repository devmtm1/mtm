import { lireAdresses } from './reglages-pilotage';

describe('réglages du pilotage', () => {
  it('lit les adresses saisies une par ligne, sans doublon ni casse', () => {
    expect(lireAdresses('DG@mtm.sn\ncompta@mtm.sn\n  dg@mtm.sn  \n')).toEqual(['dg@mtm.sn', 'compta@mtm.sn']);
  });

  it('accepte aussi les virgules et points-virgules', () => {
    expect(lireAdresses('a@x.sn, b@x.sn; c@x.sn')).toEqual(['a@x.sn', 'b@x.sn', 'c@x.sn']);
  });

  it('ne renvoie rien pour une saisie vide', () => {
    expect(lireAdresses('  \n ')).toEqual([]);
  });
});
