import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { Observable } from 'rxjs';

/** Forme des erreurs HTTP renvoyées par l'API (ValidationPipe : message en tableau). */
interface ApiErrorLike {
  error?: { message?: string | string[] };
  message?: string;
  status?: number;
}

/**
 * Notifications utilisateur, en un seul endroit.
 *
 * Avant : 109 appels directs au snackbar avec six durées différentes, et la
 * plupart des erreurs affichaient un libellé générique en ignorant le message
 * renvoyé par l'API. Ici les durées sont normalisées et `error()` privilégie
 * le message serveur — c'est lui qui explique à l'utilisateur ce qui bloque
 * (« justification obligatoire », « terrain déjà réservé »…).
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  /** Confirmation. `action` : libellé du bouton, dont le clic est renvoyé en Observable. */
  success(message: string, action = 'Fermer'): Observable<void> {
    return this.snackBar.open(message, action, { duration: 3000 }).onAction();
  }

  info(message: string): void {
    this.snackBar.open(message, 'Fermer', { duration: 4000 });
  }

  /**
   * Affiche l'erreur : message de l'API si présent, sinon le repli fourni.
   * Renvoie le message affiché, utile pour le stocker dans un état local.
   */
  error(error: unknown, fallback = 'Une erreur est survenue'): string {
    const message = NotificationService.extractMessage(error) ?? fallback;
    this.snackBar.open(message, 'Fermer', { duration: 5000 });
    return message;
  }

  static extractMessage(error: unknown): string | null {
    if (!error || typeof error !== 'object') return null;
    const { error: body, message, status } = error as ApiErrorLike;
    // Panne réseau ou API injoignable : le message technique n'aide personne.
    if (status === 0) return 'Impossible de joindre le serveur';
    const serverMessage = body?.message;
    if (Array.isArray(serverMessage)) return serverMessage.join(', ');
    if (typeof serverMessage === 'string' && serverMessage.trim()) return serverMessage;
    return typeof message === 'string' && message.trim() && status === undefined ? message : null;
  }
}
