import * as Joi from 'joi';

/**
 * Schéma de validation des variables d'environnement.
 * L'application refuse de démarrer si une variable critique est manquante
 * ou invalide (fail-fast), plutôt que de tomber en erreur plus tard en
 * production sur un secret vide par exemple.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  API_PORT: Joi.number().default(Joi.ref('PORT')),
  PORT: Joi.number().optional(),
  CORS_ORIGIN: Joi.string().default('http://localhost:4200'),

  DATABASE_URL: Joi.string().required(),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  BCRYPT_SALT_ROUNDS: Joi.number().min(10).max(15).default(12),
  LOGIN_RATE_LIMIT_TTL: Joi.number().default(60),
  LOGIN_RATE_LIMIT_MAX: Joi.number().default(5),
  ACCOUNT_LOCK_THRESHOLD: Joi.number().default(5),
  ACCOUNT_LOCK_DURATION_MINUTES: Joi.number().default(15),

  TWO_FACTOR_APP_NAME: Joi.string().default('MTM Immobilier'),
  CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
  CLOUDINARY_API_KEY: Joi.string().optional(),
  CLOUDINARY_API_SECRET: Joi.string().optional(),
});
