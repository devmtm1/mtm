import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EtatPorte } from './porte-sequence';

/**
 * La porte à deux battants de l'écran de connexion : une clé s'approche de la serrure, tourne, et les battants s'écartent sur
 * une pièce lumineuse. Composant de présentation pur : il reçoit l'état de la séquence (voir SequencePorte) et ne connaît ni
 * l'authentification ni la navigation. `variante` change seulement la teinte : « staff » (institutionnelle, marine) pour le
 * back-office, « client » (plus claire et chaleureuse) pour l'espace client.
 */
@Component({
  selector: 'app-porte-acces',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './porte-acces.scss',
  template: `
    <div class="porte" [attr.data-etat]="etat()" [attr.data-variante]="variante()" [attr.data-reduit]="reduit()">
      <div class="porte__scene" aria-hidden="true">
        <div class="porte__cadre"></div>
        <div class="porte__lumiere"></div>
        <div class="porte__halo"></div>
        <div class="porte__battant porte__battant--g">
          <i class="porte__panneau"></i><i class="porte__panneau"></i><b class="porte__poignee"></b>
          <u class="porte__charniere"></u><u class="porte__charniere"></u><u class="porte__charniere"></u>
        </div>
        <div class="porte__battant porte__battant--d">
          <i class="porte__panneau"></i><i class="porte__panneau"></i><b class="porte__poignee"></b>
          <u class="porte__charniere"></u><u class="porte__charniere"></u><u class="porte__charniere"></u>
        </div>
        <div class="porte__serrure"><span class="porte__anneau"></span></div>
        <svg class="porte__cle" viewBox="0 0 132 40" focusable="false">
          <defs>
            <linearGradient id="porte-cle-degrade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#ffffff" />
              <stop offset="0.55" stop-color="#c9d6e4" />
              <stop offset="1" stop-color="#8fa3b8" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="16" fill="url(#porte-cle-degrade)" stroke="#6b819a" stroke-width="1.5" />
          <circle cx="20" cy="20" r="6" fill="#b52c36" />
          <rect x="34" y="16" width="96" height="8" rx="3" fill="url(#porte-cle-degrade)" stroke="#6b819a" stroke-width="1.2" />
          <path d="M92 24v9h7v-9M106 24v6h6v-6" fill="url(#porte-cle-degrade)" stroke="#6b819a" stroke-width="1.2" stroke-linejoin="round" />
        </svg>
      </div>

      <div class="porte__simple" aria-hidden="true">
        @if (etat() === 'ouverture' || etat() === 'ouvert') {
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        } @else {
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
        }
      </div>

      <p class="porte__message" role="status" aria-live="polite">{{ message() }}</p>
    </div>
  `,
})
export class PorteAcces {
  readonly etat = input.required<EtatPorte>();
  readonly variante = input<'staff' | 'client'>('staff');
  /** Mouvement réduit ou 3D indisponible : la scène est remplacée par un simple cercle. */
  readonly reduit = input(false);

  protected readonly message = computed(() => {
    switch (this.etat()) {
      case 'approche':
      case 'attente':
        return 'Vérification de vos accès…';
      case 'ouverture':
      case 'ouvert':
        return this.variante() === 'staff' ? 'Accès autorisé' : 'Bienvenue chez vous';
      default:
        return '';
    }
  });
}
