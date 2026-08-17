// Cifrado simétrico (AES-256-GCM) para secretos que se guardan en D1 en vez
// de en `wrangler secret` — por ejemplo, las API keys de IA que un admin
// puede editar desde la UI en cualquier momento (wrangler secret solo se
// puede cambiar por CLI en el momento del deploy, no sirve para eso).

async function importKey(rawKeyB64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(rawKeyB64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encrypt(plaintext: string, rawKeyB64: string): Promise<string> {
  const key = await importKey(rawKeyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(payloadB64: string, rawKeyB64: string): Promise<string> {
  const key = await importKey(rawKeyB64);
  const combined = Uint8Array.from(atob(payloadB64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}
