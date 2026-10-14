import { Injectable } from '@nestjs/common';
import { MailService } from '../../common/mail/mail.service';
import { AuditService } from '../audit/audit.service';
import { SettingsService } from '../settings/settings.service';
import {
  CLE_ENVOI_AUTOMATIQUE,
  ENVOI_PAR_DEFAUT,
  lireEnvoi,
} from './envoi-automatique';
import { EnvoiAutomatiqueService } from './envoi-automatique.service';
import { CLE_SEUILS_BLOCAGE, lireSeuils } from './pilotage.calculs';
import { CATALOGUE_RAPPORTS } from './rapports.catalogue';

/**
 * Réglages du pilotage : délais de « dossier bloqué » et envoi automatique des
 * rapports. Ces deux paramètres étaient jusqu'ici saisis en JSON dans la page
 * Paramètres ; l'écran dédié les présente comme un formulaire et ajoute ce que
 * le JSON ne pouvait pas donner : l'état de la messagerie, un envoi d'essai et
 * les derniers envois.
 */
@Injectable()
export class ReglagesPilotageService {
  constructor(
    private readonly settings: SettingsService,
    private readonly envoi: EnvoiAutomatiqueService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
  ) {}

  async lire() {
    const [seuils, envoi, derniersEnvois] = await Promise.all([
      this.settings.getRawValue(CLE_SEUILS_BLOCAGE),
      this.settings.getRawValue(CLE_ENVOI_AUTOMATIQUE),
      this.envoi.derniersEnvois(),
    ]);
    return {
      seuils: lireSeuils(seuils),
      envoi: lireEnvoi(envoi) ?? ENVOI_PAR_DEFAUT,
      messagerieConfiguree: this.mail.isConfigured(),
      rapports: CATALOGUE_RAPPORTS.map((r) => ({
        code: r.code,
        titre: r.titre,
      })),
      derniersEnvois,
    };
  }

  async enregistrerSeuils(valeur: Record<string, number>, userId: string) {
    // On enregistre le jeu complet : un délai non précisé garde sa valeur actuelle.
    const complet = {
      ...lireSeuils(await this.settings.getRawValue(CLE_SEUILS_BLOCAGE)),
      ...Object.fromEntries(
        Object.entries(valeur).filter(([, jours]) => jours !== undefined),
      ),
    };
    return this.enregistrer(
      CLE_SEUILS_BLOCAGE,
      complet,
      'Jours sans mouvement au-delà desquels un dossier est dit bloqué (tableau de bord manager)',
      userId,
    );
  }

  async enregistrerEnvoi(valeur: unknown, userId: string) {
    return this.enregistrer(
      CLE_ENVOI_AUTOMATIQUE,
      valeur,
      'Envoi automatique de rapports par e-mail (lundi pour hebdomadaire, le 1er du mois pour mensuel)',
      userId,
    );
  }

  private async enregistrer(
    cle: string,
    valeur: unknown,
    description: string,
    userId: string,
  ) {
    const avant = await this.settings.getRawValue(cle).catch(() => undefined);
    const setting = await this.settings.upsert(
      cle,
      valeur,
      description,
      userId,
    );
    await this.audit.record({
      userId,
      action: 'setting.updated',
      entityType: 'SystemSetting',
      entityId: setting.id,
      oldValue: { key: cle, value: avant },
      newValue: { key: cle, value: valeur },
    });
    return this.lire();
  }
}
