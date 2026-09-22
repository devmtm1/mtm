import { applyDecorators, Header } from '@nestjs/common';

/**
 * Durée pendant laquelle une lecture publique reste fraîche, en secondes.
 * Une minute : un terrain publié ou un contenu modifié apparaît au plus tard
 * une minute plus tard sur le site, et la page d'accueil cesse de solliciter
 * l'API à chaque navigation.
 */
const MAX_AGE_SECONDS = 60;

/**
 * Fenêtre pendant laquelle une réponse périmée peut encore être servie
 * pendant que la nouvelle version est récupérée en arrière-plan : le
 * visiteur n'attend jamais l'API, même juste après l'expiration.
 */
const STALE_WHILE_REVALIDATE_SECONDS = 300;

/**
 * Cache des lectures publiques (catalogue, contenus, réalisations).
 *
 * Ces routes servent les mêmes données à tout le monde et ne dépendent
 * d'aucune session : le navigateur — et un cache en périphérie comme
 * Cloudflare — peuvent les conserver. À ne jamais poser sur une route
 * authentifiée, qui servirait alors les données d'un utilisateur à un autre.
 */
export const PublicCache = (): MethodDecorator & ClassDecorator =>
  applyDecorators(
    Header(
      'Cache-Control',
      `public, max-age=${MAX_AGE_SECONDS}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_SECONDS}`,
    ),
  );
