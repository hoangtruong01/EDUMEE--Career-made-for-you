export interface JwtPayload extends Record<string, unknown> {
  exp?: number;
}

export const TOKEN_EXPIRY_SKEW_MS = 5_000;

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || typeof globalThis.atob !== 'function') {
      return null;
    }

    const normalizedPayload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '=',
    );
    const decodedPayload = globalThis.atob(paddedPayload);
    const payloadBytes = Uint8Array.from(decodedPayload, (char) => char.charCodeAt(0));

    return JSON.parse(new TextDecoder().decode(payloadBytes)) as JwtPayload;
  } catch {
    return null;
  }
}

export function getJwtExpirationMs(token: string): number | null {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp || typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
    return null;
  }

  return payload.exp * 1000;
}

export function getJwtExpiryDelayMs(token: string, skewMs = TOKEN_EXPIRY_SKEW_MS): number | null {
  const expiresAtMs = getJwtExpirationMs(token);
  if (!expiresAtMs) {
    return null;
  }

  return Math.max(expiresAtMs - Date.now() - skewMs, 0);
}

export function isJwtExpired(token: string, skewMs = TOKEN_EXPIRY_SKEW_MS): boolean {
  const expiresAtMs = getJwtExpirationMs(token);
  if (!expiresAtMs) {
    return true;
  }

  return Date.now() + skewMs >= expiresAtMs;
}
