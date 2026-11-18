-- =====================================================================
-- TRABAF CONSTRUCTION — Installation complète Supabase
-- À coller UNE FOIS dans Supabase > SQL Editor > New query > Run.
-- Script ré-exécutable sans risque (if not exists / on conflict).
-- =====================================================================

-- ---------- 1. Tables ----------
create table if not exists public.company_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id text primary key default gen_random_uuid()::text,
  title text not null check (char_length(title) <= 200),
  slug text unique not null,
  description text not null default '',
  icon_name text not null default 'Building2',
  image_url text,
  display_order int not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id text primary key default gen_random_uuid()::text,
  title text not null check (char_length(title) <= 300),
  slug text unique not null,
  short_desc text not null default '',
  full_desc text not null default '',
  category text not null,
  client text,
  location_name text not null default '',
  city text not null default '',
  country text not null default 'Tunisie',
  lat double precision not null default 36.8065,
  lng double precision not null default 10.1815,
  year text not null default '',
  duration text,
  surface_area text,
  status text not null default 'En cours',
  main_image_url text not null default '',
  gallery_urls text[] not null default '{}',
  is_featured boolean not null default false,
  is_published boolean not null default true,
  display_order int not null default 1,
  created_at timestamptz not null default now()
);

-- Demandes de devis / messages de contact (insérées par les visiteurs)
create table if not exists public.messages (
  id text primary key default gen_random_uuid()::text,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null default '' check (char_length(email) <= 200),
  phone text check (char_length(phone) <= 40),
  subject text not null check (char_length(subject) <= 300),
  message text not null check (char_length(message) <= 5000),
  status text not null default 'new' check (status in ('new', 'read', 'processed')),
  source text check (source in ('contact', 'devis')),
  project_type text check (char_length(project_type) <= 80),
  surface text check (char_length(surface) <= 80),
  budget text check (char_length(budget) <= 80),
  project_city text check (char_length(project_city) <= 120),
  timeline text check (char_length(timeline) <= 80),
  location text check (char_length(location) <= 200),
  user_agent text check (char_length(user_agent) <= 500),
  ip_address text check (char_length(ip_address) <= 64),
  is_real boolean not null default true,
  created_at timestamptz not null default now()
);

-- Statistiques de visites (anonymes : pas d'adresse IP)
create table if not exists public.visits (
  id bigint generated always as identity primary key,
  visitor_id text not null check (char_length(visitor_id) <= 64),
  page text not null check (char_length(page) <= 200),
  city text check (char_length(city) <= 100),
  country text check (char_length(country) <= 100),
  device text check (char_length(device) <= 30),
  created_at timestamptz not null default now()
);
create index if not exists visits_created_at_idx on public.visits (created_at desc);

-- Liste des comptes administrateurs (seuls ces comptes peuvent modifier le site)
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- 2. Sécurité (Row Level Security) ----------
alter table public.company_settings enable row level security;
alter table public.services enable row level security;
alter table public.projects enable row level security;
alter table public.messages enable row level security;
alter table public.admins enable row level security;
alter table public.visits enable row level security;

drop policy if exists "settings_read" on public.company_settings;
drop policy if exists "settings_admin" on public.company_settings;
create policy "settings_read" on public.company_settings for select using (true);
create policy "settings_admin" on public.company_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "services_read" on public.services;
drop policy if exists "services_admin" on public.services;
create policy "services_read" on public.services for select using (is_active or public.is_admin());
create policy "services_admin" on public.services for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "projects_read" on public.projects;
drop policy if exists "projects_admin" on public.projects;
create policy "projects_read" on public.projects for select using (is_published or public.is_admin());
create policy "projects_admin" on public.projects for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Les visiteurs peuvent SEULEMENT envoyer un message (jamais lire ceux des autres)
drop policy if exists "messages_insert_public" on public.messages;
drop policy if exists "messages_admin" on public.messages;
create policy "messages_insert_public" on public.messages for insert to anon, authenticated
  with check (status = 'new' and is_real = true);
create policy "messages_admin" on public.messages for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "visits_insert_public" on public.visits;
drop policy if exists "visits_admin" on public.visits;
create policy "visits_insert_public" on public.visits for insert to anon, authenticated with check (true);
create policy "visits_admin" on public.visits for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins_self" on public.admins;
create policy "admins_self" on public.admins for select to authenticated using (user_id = auth.uid());

-- ---------- 3. Stockage des images (bucket public "media") ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

drop policy if exists "media_read" on storage.objects;
drop policy if exists "media_admin_insert" on storage.objects;
drop policy if exists "media_admin_update" on storage.objects;
drop policy if exists "media_admin_delete" on storage.objects;
create policy "media_read" on storage.objects for select using (bucket_id = 'media');
create policy "media_admin_insert" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
create policy "media_admin_update" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin());
create policy "media_admin_delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());

-- ---------- 4. Données de départ (le contenu actuel du site) ----------
insert into public.company_settings (id, data) values (1, '{"company_name":"TRABAF CONSTRUCTION TUNISIE","phone":"+216 50 044 010","email":"contact.trabaf@gmail.com","address":"Zone Industrielle, Tunis","city":"Tunis","country":"Tunisie","whatsapp":"+21650044010","facebook":"https://facebook.com/Trabaf-construction-Tunisie","instagram":"","linkedin":"","working_hours":"Lundi - Vendredi: 08:00 - 17:30 | Samedi: 08:00 - 13:00","lat":36.8065,"lng":10.1815,"slogan":"TRABAF: Bâtir Vos Rêves, Créer Votre Oasis | Construction & Piscines sur Mesure.","description":"TRABAF Construction Tunisie accompagne vos projets de construction, génie civil, bâtiment et création de piscines sur mesure avec exigence, expertise technique et rigueur professionnelle.","stats":[{"id":"1","label":"Projets Réalisés","value":25,"prefix":"+","suffix":"","description":"Bâtiments, génie civil & piscines en Tunisie"},{"id":"2","label":"Années d''Expérience","value":12,"prefix":"+","suffix":" ans","description":"Expertise reconnue en BTP & Piscines"},{"id":"3","label":"Collaborateurs & Ingénieurs","value":85,"prefix":"+","suffix":"","description":"Experts qualifiés et effectif terrain"},{"id":"4","label":"Taux de Satisfaction","value":99,"prefix":"","suffix":"%","description":"Respect strict des délais et de la qualité"}],"partners":[{"id":"partner-nova-dar","name":"Nova Dar","tagline":"Partenaire officiel","description":"Partenaire de confiance de TRABAF Construction Tunisie.","url":"","logo_url":"","accent":"#F5B800","display_order":1,"is_active":true},{"id":"partner-trabaf-pool","name":"Trabaf Pool","tagline":"Piscines sur mesure","description":"Conception, fabrication et pose de piscines béton & liner sur mesure.","url":"","logo_url":"","accent":"#38BDF8","display_order":2,"is_active":true}]}'::jsonb)
  on conflict (id) do nothing;
insert into public.services (id, title, slug, description, icon_name, image_url, display_order, is_active) values ('srv-piscines', 'Création & Fabrication de Piscines sur Mesure', 'piscines-sur-mesure', 'Conception sur mesure, piscines en béton armé & liner, miroir et débordement. Fabrication, pose, filtration automatisée et aménagement d''oasis privées.', 'Waves', '/images/piscines_banner.png', 1, true)
  on conflict (id) do nothing;
insert into public.services (id, title, slug, description, icon_name, image_url, display_order, is_active) values ('srv-1', 'Construction de Bâtiments & Clés en Main', 'construction-de-batiments', 'Réalisation complète de bâtiments administratifs, commerciaux, tertiaires et logements clés en main selon les normes les plus exigeantes.', 'Building2', '/images/hero_bg.png', 2, true)
  on conflict (id) do nothing;
insert into public.services (id, title, slug, description, icon_name, image_url, display_order, is_active) values ('srv-2', 'Génie Civil & Structures', 'genie-civil-structures', 'Étude et exécution d''ouvrages d''art, fondations spéciales, infrastructures lourdes en béton armé et constructions de structures.', 'HardHat', '/images/hero_banner.jpg', 3, true)
  on conflict (id) do nothing;
insert into public.services (id, title, slug, description, icon_name, image_url, display_order, is_active) values ('srv-3', 'Travaux Publics & Voiries', 'travaux-publics-voiries', 'Aménagement urbain, terrassement, réseaux divers (VRD), voiries et infrastructures routières pour les collectivités et le secteur privé.', 'Truck', '/images/hero_bg.png', 4, true)
  on conflict (id) do nothing;
insert into public.services (id, title, slug, description, icon_name, image_url, display_order, is_active) values ('srv-4', 'Construction Résidentielle & Villas', 'construction-residentielle', 'Conception et édification d''immeubles de haut standing, complexes résidentiels et villas de luxe avec espace piscine personnalisé.', 'Home', '/images/residential.png', 5, true)
  on conflict (id) do nothing;
insert into public.services (id, title, slug, description, icon_name, image_url, display_order, is_active) values ('srv-5', 'Construction Industrielle', 'construction-industrielle', 'Bâtiments industriels, usines, entrepôts logistiques, hangars métalliques sur-mesure intégrant contraintes de sécurité et d''exploitation.', 'Factory', '/images/industrial.png', 6, true)
  on conflict (id) do nothing;
insert into public.services (id, title, slug, description, icon_name, image_url, display_order, is_active) values ('srv-6', 'Rénovation & Restructuration', 'renovation-restructuration', 'Réhabilitation lourde, modernisation architecturale, renforcement de structures existantes et mise en conformité.', 'Wrench', '/images/hero_banner.jpg', 7, true)
  on conflict (id) do nothing;
insert into public.services (id, title, slug, description, icon_name, image_url, display_order, is_active) values ('srv-7', 'Études & Ingénierie BTP', 'etudes-ingenierie-btp', 'Assistance à maîtrise d''ouvrage, métrés, planification BIM, contrôle qualité et suivi technique d''exécution.', 'Compass', '/images/hero_bg.png', 8, true)
  on conflict (id) do nothing;
insert into public.projects (id, title, slug, short_desc, full_desc, category, client, location_name, city, country, lat, lng, year, duration, surface_area, status, main_image_url, gallery_urls, is_featured, is_published, display_order) values ('proj-piscine-1', 'Piscine à Débordement & Oasis de Luxe — Projet Démonstration', 'piscine-debordement-oasis-luxe-projet-demonstration', 'Conception sur-mesure et fabrication d''une piscine miroir à débordement béton & liner avec plage immergée et terrasse à Gammarth.', 'Ce projet illustre l''expertise de TRABAF Construction dans la création d''oasis privées et de piscines sur mesure. Réalisation complète comprenant l''étude hydraulique, le terrassement, le cuvelage en béton armé, la pose du liner armé, la filtration haut débit et l''éclairage d''ambiance.', 'Piscines', 'Client Résidentiel Privé (Démo)', 'Gammarth', 'Tunis', 'Tunisie', 36.9167, 10.3, '2026', '3 mois', '120 m²', 'Terminé', '/images/piscines_banner.png', array['/images/piscines_banner.png', '/images/residential.png']::text[], true, true, 1)
  on conflict (id) do nothing;
insert into public.projects (id, title, slug, short_desc, full_desc, category, client, location_name, city, country, lat, lng, year, duration, surface_area, status, main_image_url, gallery_urls, is_featured, is_published, display_order) values ('proj-1', 'Complexe Administratif Moderne — Projet Démonstration', 'complexe-administratif-moderne-projet-demonstration', 'Réalisation d''un immeuble de bureau R+5 de très haut standing avec vitrage structurel et parement moderne à Tunis.', 'Ce projet d''exemple illustre la maîtrise de TRABAF Construction dans l''édification de complexes tertiaires contemporains. L''ouvrage comprend 5 niveaux de bureaux modulables, un sous-sol de parking sécurisé, un atrium vitré à haute efficacité énergétique, ainsi que des finitions intérieures soignées.', 'Génie civil', 'Client Institutionnel (Démo)', 'Les Berges du Lac 2', 'Tunis', 'Tunisie', 36.8431, 10.2674, '2025', '18 mois', '4 500 m²', 'Terminé', '/images/hero_bg.png', array['/images/hero_bg.png', '/images/hero_banner.jpg', '/images/residential.png']::text[], true, true, 2)
  on conflict (id) do nothing;
insert into public.projects (id, title, slug, short_desc, full_desc, category, client, location_name, city, country, lat, lng, year, duration, surface_area, status, main_image_url, gallery_urls, is_featured, is_published, display_order) values ('proj-2', 'Résidence Panoramique avec Espace Aquatique — Projet Démonstration', 'residence-panoramique-projet-demonstration', 'Ensemble immobilier résidentiel R+6 composé d''appartements de luxe avec piscine collective et espaces verts à Hammamet.', 'Exemple de promotion immobilière résidentielle haut de gamme. Le programme comporte 32 appartements de standing, une piscine collective conçue et posée par nos équipes, des espaces paysagers intégrés et des matériaux locaux de première qualité.', 'Résidentiel', 'Promoteur Privé (Démo)', 'Zone Touristique', 'Hammamet', 'Tunisie', 36.4, 10.6167, '2024', '22 mois', '6 200 m²', 'Terminé', '/images/residential.png', array['/images/residential.png', '/images/piscines_banner.png', '/images/hero_bg.png']::text[], true, true, 3)
  on conflict (id) do nothing;
insert into public.projects (id, title, slug, short_desc, full_desc, category, client, location_name, city, country, lat, lng, year, duration, surface_area, status, main_image_url, gallery_urls, is_featured, is_published, display_order) values ('proj-3', 'Parc Logistique & Entrepôt — Projet Démonstration', 'parc-logistique-entrepot-projet-demonstration', 'Construction d''une plateforme logistique industrielle avec charpente métallique et quais de chargement à Sousse.', 'Un exemple de projet industriel d''envergure comprenant un hangar métallique haute portée, un sol en béton quartzé à forte résistance, des bureaux d''administration intégrés et une centrale solaire en toiture.', 'Industriel', 'Groupe Industriel (Démo)', 'Zone Industrielle Enfidha', 'Sousse', 'Tunisie', 36.1417, 10.3798, '2026', '12 mois', '10 000 m²', 'En cours', '/images/industrial.png', array['/images/industrial.png', '/images/hero_banner.jpg']::text[], false, true, 4)
  on conflict (id) do nothing;

-- ---------- 5. Donner les droits admin à ton compte ----------
-- 1) Supabase > Authentication > Users > "Add user" (email + mot de passe, coche "Auto Confirm User")
-- 2) Remplace l'email ci-dessous puis exécute UNIQUEMENT cette ligne :
-- insert into public.admins (user_id) select id from auth.users where email = 'TON-EMAIL@exemple.com' on conflict do nothing;
