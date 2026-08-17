const ITERATIONS = 100_000;
const KEY_LEN    = 32;
const HASH_ALG   = 'SHA-256';

export async function hashPassword(password: string): Promise<{ hash: string; salt: string; iterations: number }> {
  const salt   = crypto.getRandomValues(new Uint8Array(16));
  const saltB64 = btoa(String.fromCharCode(...salt));
  const keyMat  = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits    = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: HASH_ALG },
    keyMat, KEY_LEN * 8
  );
  const hash = btoa(String.fromCharCode(...new Uint8Array(bits)));
  return { hash, salt: saltB64, iterations: ITERATIONS };
}

export async function verifyPassword(
  password: string,
  stored: { hash: string; salt: string; iterations: number }
): Promise<boolean> {
  const salt   = Uint8Array.from(atob(stored.salt), c => c.charCodeAt(0));
  const keyMat = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits   = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: stored.iterations, hash: HASH_ALG },
    keyMat, KEY_LEN * 8
  );
  const hash = btoa(String.fromCharCode(...new Uint8Array(bits)));
  return hash === stored.hash;
}
