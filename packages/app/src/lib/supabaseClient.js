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

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
