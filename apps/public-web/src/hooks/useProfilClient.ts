import { useClientData } from '../contexts/client-data-store';
import { profilClient, type ProfilClient } from '../utils/clientProfil';

/** Les espaces que ce compte utilise vraiment, d'après les données de la coquille. */
export function useProfilClient(): ProfilClient {
  const d = useClientData();
  return profilClient({
    chargement: d.dossiersLoading || d.proprietaireLoading || d.locataireLoading,
    nbDossiers: d.dossiers?.length ?? 0,
    nbMissions: d.missions?.length ?? 0,
    gestion: (d.proprietaireBiens?.length ?? 0) > 0 || (d.locataireBaux?.length ?? 0) > 0,
    chantier: (d.chantiers?.length ?? 0) > 0,
  });
}
