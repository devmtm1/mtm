/**
 * Doublure générique de PrismaService pour les tests unitaires.
 *
 * Chaque modèle (`prisma.terrain`, `prisma.dossierVente`…) et chaque méthode
 * (`findUnique`, `create`…) sont créés à la volée comme `jest.fn()` à la
 * première lecture. Les specs n'ont plus à déclarer la liste exhaustive des
 * délégués qu'elles touchent — liste qui divergeait d'un fichier à l'autre et
 * cassait à chaque nouveau modèle.
 *
 * `$transaction` exécute le rappel avec la doublure elle-même, comme le fait
 * Prisma avec le client transactionnel.
 */
export type PrismaModelMock = Record<string, jest.Mock>;

export type PrismaMock = Record<string, PrismaModelMock> & {
  $transaction: jest.Mock;
  $queryRaw: jest.Mock;
  $executeRawUnsafe: jest.Mock;
};

export function createPrismaMock(): PrismaMock {
  const models = new Map<string, PrismaModelMock>();

  const modelProxy = (): PrismaModelMock => {
    const methods = new Map<string, jest.Mock>();
    return new Proxy(
      {},
      {
        get: (_target, method: string) => {
          if (typeof method !== 'string') return undefined;
          if (!methods.has(method)) methods.set(method, jest.fn());
          return methods.get(method);
        },
      },
    );
  };

  const root = {
    $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
      callback(proxy),
    ),
    $queryRaw: jest.fn(),
    $executeRawUnsafe: jest.fn(),
  } as unknown as PrismaMock;

  const proxy: PrismaMock = new Proxy(root, {
    get: (target, prop: string) => {
      if (typeof prop !== 'string') return undefined;
      if (prop in target) return target[prop];
      // `then` : évite qu'un `await prismaMock` le prenne pour une promesse.
      if (prop === 'then') return undefined;
      if (!models.has(prop)) models.set(prop, modelProxy());
      return models.get(prop);
    },
  });

  return proxy;
}
