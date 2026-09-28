export const DEV_JWT_SECRET = 'dev-only-change-me';

/** En producción no hay secreto por defecto: la API no arranca sin JWT_SECRET. */
export function resolveJwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  if (env.JWT_SECRET) return env.JWT_SECRET;
  if (env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET es obligatorio con NODE_ENV=production');
  }
  return DEV_JWT_SECRET;
}

export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: resolveJwtSecret(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',
});
