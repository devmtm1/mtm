import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Contexte de la requête HTTP en cours, accessible depuis n'importe quelle
 * couche sans le faire transiter par tous les paramètres.
 *
 * Usage principal : le journal d'audit (section 24 du cahier des charges)
 * complète automatiquement adresse IP et navigateur de chaque entrée. Avant,
 * seuls 15 appels sur 49 les renseignaient, selon que le contrôleur y avait
 * pensé ou non.
 */
const storage = new AsyncLocalStorage<RequestContext>();

export function requestContextMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  storage.run(
    {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    },
    () => next(),
  );
}

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}
