import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { LucideFileText, LucideTrash2, LucideUpload } from '@lucide/angular';
import {
  CHAMPS_ENTREPRISE,
  EntrepriseApiService,
  type ChampEntreprise,
  type ProfilEntreprise,
} from '../../core/services/api/entreprise-api.service';
import { SessionService } from '../../core/services/session.service';
import { NotificationService } from '../../shared/services/notification.service';

/** Poids maximal du logo : il est lu à chaque génération de document. */
export const TAILLE_MAX_LOGO = 2 * 1024 * 1024;

/** Message d'erreur pour un fichier de logo refusé, ou null s'il convient. */
export function problemeLogo(file: Pick<File, 'type' | 'size'>): string | null {
  if (!file.type.startsWith('image/')) return 'Le logo doit être une image (JPG, PNG ou WebP).';
  if (file.size > TAILLE_MAX_LOGO) return 'Le logo ne doit pas dépasser 2 Mo.';
  return null;
}

/**
 * Identité de l'entreprise imprimée sur tous les documents générés (factures,
 * rapports, contrats, quittances) : logo en en-tête et en pied de page,
 * NINEA, RCCM, forme juridique, capital et coordonnées.
 */
@Component({
  selector: 'app-entreprise',
  standalone: true,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, LucideFileText, LucideTrash2, LucideUpload],
  templateUrl: './entreprise.html',
  styleUrl: './entreprise.scss',
})
export class Entreprise implements OnInit {
  private readonly api = inject(EntrepriseApiService);
  private readonly notify = inject(NotificationService);
  private readonly session = inject(SessionService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly canModify = this.session.hasPermission('settings:modifier');

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly busyLogo = signal(false);
  protected readonly profil = signal<ProfilEntreprise | null>(null);
  protected readonly erreurLogo = signal<string | null>(null);

  protected readonly form = this.fb.group(
    Object.fromEntries(CHAMPS_ENTREPRISE.map((champ) => [champ, ['']])) as Record<ChampEntreprise, [string]>,
  );

  ngOnInit(): void {
    this.api.getProfil().subscribe({
      next: (profil) => this.appliquer(profil),
      error: (error: unknown) => {
        this.loading.set(false);
        this.notify.error(error, 'Impossible de charger l’identité de l’entreprise');
      },
    });
  }

  protected enregistrer(): void {
    if (!this.canModify || this.saving()) return;
    this.saving.set(true);
    this.api.enregistrer(this.form.getRawValue()).subscribe({
      next: (profil) => {
        this.appliquer(profil);
        this.saving.set(false);
        this.notify.success('Identité enregistrée : elle apparaît sur les prochains documents');
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notify.error(error, 'Impossible d’enregistrer');
      },
    });
  }

  protected choisirLogo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const probleme = problemeLogo(file);
    this.erreurLogo.set(probleme);
    if (probleme) return;
    this.busyLogo.set(true);
    this.api.changerLogo(file).subscribe({
      next: (profil) => {
        this.profil.set(profil);
        this.busyLogo.set(false);
        this.notify.success('Logo mis à jour');
      },
      error: (error: unknown) => {
        this.busyLogo.set(false);
        this.notify.error(error, 'Impossible de changer le logo');
      },
    });
  }

  protected retirerLogo(): void {
    if (!this.canModify || !confirm('Retirer le logo ? Les documents reprendront le logo MTM par défaut.')) return;
    this.busyLogo.set(true);
    this.api.retirerLogo().subscribe({
      next: (profil) => {
        this.profil.set(profil);
        this.busyLogo.set(false);
        this.notify.success('Logo par défaut rétabli');
      },
      error: (error: unknown) => {
        this.busyLogo.set(false);
        this.notify.error(error, 'Impossible de retirer le logo');
      },
    });
  }

  /** Ouvre un PDF d'essai : les modifications non enregistrées n'y figurent pas. */
  protected voirApercu(): void {
    this.api.apercu().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (error: unknown) => this.notify.error(error, 'Impossible de générer l’aperçu'),
    });
  }

  protected defaut(champ: ChampEntreprise): string {
    const defauts = this.profil()?.parDefaut as Partial<Record<ChampEntreprise, string>> | undefined;
    return defauts?.[champ] ?? '';
  }

  private appliquer(profil: ProfilEntreprise): void {
    this.profil.set(profil);
    this.form.reset(profil.valeurs);
    if (!this.canModify) this.form.disable();
    this.loading.set(false);
  }
}
