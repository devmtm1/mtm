import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { ActiviteReseau } from '../services/activite-reseau.service';

/** À poser sur une requête de fond (compteurs, notifications) : elle ne fait pas bouger la barre de progression. */
export const EN_ARRIERE_PLAN = new HttpContextToken<boolean>(() => false);

/** Compte les requêtes en cours pour la barre de progression du haut de l'écran. */
export const activiteInterceptor: HttpInterceptorFn = (req, next) => {
  const activite = inject(ActiviteReseau);
  if (req.context.get(EN_ARRIERE_PLAN) || activite.enSilence) return next(req);
  activite.debut();
  return next(req).pipe(finalize(() => activite.fin()));
};
