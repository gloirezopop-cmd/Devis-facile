import { createClient } from '@supabase/supabase-js';

// Dans le navigateur, Vite fournit `import.meta.env`. Hors navigateur (script
// Node de vérification), il n'existe pas : on retombe sur `process.env`, ce qui
// permet de tester les vraies fonctions d'accès aux données plutôt qu'une copie.
const env = (typeof import.meta !== 'undefined' && import.meta.env) || globalThis.process?.env || {};

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL ou Anon Key introuvable. Vérifiez votre fichier .env.local');
}

// Polyfill minimal WebSocket pour les environnements Node.js < 22 (scripts de test/vérification)
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class DummyWebSocket {};
}

/**
 * Fetch résilient avec retry automatique pour absorber les micro-coupures réseau,
 * les latences mobiles et les erreurs passerelles Cloudflare (502/504).
 */
async function fetchWithRetry(url, options = {}, retries = 3, delay = 600) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if ([502, 503, 504, 520, 521, 522, 523, 524].includes(res.status) && attempt < retries) {
        await new Promise((r) => setTimeout(r, delay * Math.pow(1.8, attempt)));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, delay * Math.pow(1.8, attempt)));
        continue;
      }
      throw err;
    }
  }
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  global: {
    fetch: fetchWithRetry,
  },
});

