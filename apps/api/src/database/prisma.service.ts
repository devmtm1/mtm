import {
  INestApplication,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Codes Prisma d'une connexion perdue ou d'un serveur injoignable : la base
 * hébergée (Neon) s'endort après quelques minutes d'inactivité et coupe les
 * connexions restées ouvertes dans le pool ; la première requête suivante
 * échoue alors avec « Server has closed the connection » ou « Can't reach
 * database server ». Ces erreurs sont rejouées une fois la connexion
 * rouverte, plutôt que renvoyées en 500 à l'utilisateur.
 */
const TRANSIENT_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017']);
const TRANSIENT_MESSAGES = [
  'closed the connection',
  "Can't reach database server",
  'Connection reset',
  'ECONNRESET',
];
const RETRY_DELAYS_MS = [400, 1500, 4000];

function isTransient(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_CODES.has(error.code);
  }
  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    return TRANSIENT_MESSAGES.some((needle) => error.message.includes(needle));
  }
  return false;
}

const retryLogger = new Logger('PrismaRetry');

function withRetry(base: PrismaClient) {
  return base.$extends({
    name: 'retry-transient-connection-errors',
    query: {
      async $allOperations({ model, operation, args, query }) {
        let attempt = 0;
        for (;;) {
          try {
            // L'extension Prisma type le retour en `any` : on le rend opaque
            // ici, le typage fort revient au niveau des appels des services.
            return (await query(args)) as unknown;
          } catch (error) {
            if (!isTransient(error) || attempt >= RETRY_DELAYS_MS.length) {
              throw error;
            }
            const delay = RETRY_DELAYS_MS[attempt];
            attempt += 1;
            retryLogger.warn(
              `${model ?? 'raw'}.${operation} : connexion perdue, nouvel essai ${attempt}/${RETRY_DELAYS_MS.length} dans ${delay} ms`,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      },
    },
  });
}

/**
 * Le client étendu garde le type complet de PrismaClient (modèles,
 * $transaction, $queryRaw) — motif recommandé par Prisma pour NestJS.
 */
class UntypedExtendedClient extends PrismaClient {
  constructor(options?: ConstructorParameters<typeof PrismaClient>[0]) {
    super(options);
    return withRetry(this) as this;
  }
}

const ExtendedPrismaClient = UntypedExtendedClient as unknown as new (
  options?: ConstructorParameters<typeof PrismaClient>[0],
) => ReturnType<typeof withRetry>;

/**
 * Service Prisma centralisé. Toute donnée transite par ce service —
 * aucun module ne doit instancier son propre PrismaClient.
 */
@Injectable()
export class PrismaService
  extends ExtendedPrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      // La base est hébergée sur Neon (réveil à froid, ~300 ms par requête
      // depuis le Sénégal / l'Europe) : les valeurs par défaut de Prisma
      // (2 s d'attente, 5 s par transaction interactive) faisaient échouer
      // les transactions à plusieurs étapes — validation d'un paiement,
      // création d'un dossier — avec « Transaction not found ».
      transactionOptions: { maxWait: 15_000, timeout: 60_000 },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connexion à PostgreSQL établie');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Ferme proprement les connexions lors d'un arrêt applicatif
   * (utilisé conjointement avec app.enableShutdownHooks()).
   */
  enableShutdownHooks(app: INestApplication): void {
    process.on('beforeExit', () => {
      void app.close();
    });
  }
}

/** Client d'une transaction interactive `prisma.$transaction(async (tx) => …)`. */
export type PrismaTransaction = Parameters<
  Extract<Parameters<PrismaService['$transaction']>[0], (tx: never) => unknown>
>[0];
