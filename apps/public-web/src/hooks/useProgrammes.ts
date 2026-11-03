import { useMemo } from 'react';
import { fetchProgrammes, type ProgrammeFilters, type ProgrammePublic } from '../api/programmes';
import { useAsyncData, type AsyncState } from './useAsyncData';

/**
 * Les programmes (lotissements) qui ont encore des lots à vendre, filtrés comme le catalogue.
 * `filters` à `null` : on n'en veut pas (le visiteur cherche une villa, ou des biens vendus), aucun appel n'est fait.
 */
export function useProgrammes(filters: ProgrammeFilters | null): AsyncState<ProgrammePublic[]> {
  const cle = JSON.stringify(filters);
  // La clé est la seule dépendance voulue : l'objet `filters` change d'identité à chaque rendu.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stable = useMemo(() => filters, [cle]);
  const { data, loading, error } = useAsyncData(
    () => (stable ? fetchProgrammes(stable) : Promise.resolve([] as ProgrammePublic[])),
    [stable],
  );
  return { data, loading, error };
}
