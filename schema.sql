-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase (Menu de gauche > SQL Editor > New query)

-- 1. Création de la table 'projects' pour sauvegarder les devis
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Sécurisation : Activer RLS (Row Level Security)
alter table public.projects enable row level security;

-- 3. Politique : Un utilisateur ne peut voir que SES propres projets
create policy "Les utilisateurs peuvent voir leurs propres projets"
  on public.projects for select
  using ( auth.uid() = user_id );

-- 4. Politique : Un utilisateur peut insérer SES propres projets
create policy "Les utilisateurs peuvent insérer leurs propres projets"
  on public.projects for insert
  with check ( auth.uid() = user_id );

-- 5. Politique : Un utilisateur peut modifier SES propres projets
create policy "Les utilisateurs peuvent modifier leurs propres projets"
  on public.projects for update
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- 6. Politique : Un utilisateur peut supprimer SES propres projets
create policy "Les utilisateurs peuvent supprimer leurs propres projets"
  on public.projects for delete
  using ( auth.uid() = user_id );
