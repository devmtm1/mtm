import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { signalerVisite, type TypeVisite } from '../utils/suivi';

/** Compte une page vue du site à chaque changement de page (à poser une fois, dans la mise en page). */
export function useSuiviVisites(): void {
  const { pathname } = useLocation();
  useEffect(() => {
    signalerVisite('site');
  }, [pathname]);
}

/** Compte une consultation de fiche (bien, location, réalisation, projet), une fois le bien chargé. */
export function useVueFiche(type: Exclude<TypeVisite, 'site'>, id: string | undefined): void {
  const dejaCompte = useRef<string | null>(null);
  useEffect(() => {
    if (!id || dejaCompte.current === `${type}:${id}`) return;
    dejaCompte.current = `${type}:${id}`;
    signalerVisite(type, id);
  }, [type, id]);
}
