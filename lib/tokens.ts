import crypto from 'crypto';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function generateVerificationToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  return { rawToken, tokenHash, expiresAt };
}

export function hashToken(rawToken: string) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}