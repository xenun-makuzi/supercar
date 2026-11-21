-- Super Car Parts: run once in the Supabase SQL editor.
-- After running: Auth > disable public sign-ups, then create your admin user.
-- Policies treat every authenticated user as an admin, so keep sign-ups closed.
-- Hero images: insert into settings values ('hero_images', '["https://.../1.jpg","https://.../2.jpg"]');
-- Upload logos, hero and model photos to the public "media" bucket and paste the URLs into the *_url columns.

create table brands (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, name text not null,
  logo_url text, hero_url text, tagline text, about text, sort int default 0
);
create table models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands on delete cascade,
  name text not null, era text not null check (era in ('modern','recent','heritage')),
  note text, image_url text, sort int default 0
);
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, name text not null, note text, sort int default 0
);
create table products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands on delete set null,
  category_id uuid references categories on delete set null,
  name text not null, part_no text, price numeric(12,2), image_url text, description text,
  created_at timestamptz default now()
);
create table settings (key text primary key, value jsonb);
create table requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'quote' check (kind in ('quote','order')),
  status text not null default 'new',
  name text not null, email text not null, phone text,
  make text, model text, variant text, part_no text, details text,
  created_at timestamptz default now()
);
create index on models (brand_id);
create index on products (brand_id, category_id);

-- RLS: public read on catalogue tables, admin write; visitors may only insert requests
do $$ declare t text; begin
  foreach t in array array['brands','models','categories','products','settings'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "public read" on %I for select using (true)', t);
    execute format('create policy "admin write" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
alter table requests enable row level security;
create policy "visitors can submit" on requests for insert to anon, authenticated with check (true);
create policy "admin manage" on requests for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict do nothing;
create policy "media read" on storage.objects for select using (bucket_id = 'media');
create policy "media admin" on storage.objects for all to authenticated using (bucket_id = 'media') with check (bucket_id = 'media');

-- Seed: manufacturers
insert into brands (slug, name, sort)
select lower(regexp_replace(n, '[^a-zA-Z0-9]+', '-', 'g')), n, o
from unnest(array['Ferrari','Lamborghini','McLaren','Aston Martin','Bentley','Rolls-Royce','Maserati']) with ordinality t(n, o);

-- Seed: part categories (shown on every brand page with the brand name in front)
insert into categories (slug, name, note, sort)
select lower(regexp_replace(n, '[^a-zA-Z0-9]+', '-', 'g')), n, d, o
from (values
 (1,'Pads and Discs','Brake pads, discs and wear sensors.'),
 (2,'Clutch Kits','Clutch kits and flywheels for manual and paddle-shift cars.'),
 (3,'Suspension Parts','Dampers, springs, arms and bushes.'),
 (4,'Engine and Gearbox','Engine components and transmission parts.'),
 (5,'Oil, Air and Fuel Filters','Genuine filters for every service.'),
 (6,'Exhaust Systems','Silencers, catalysts and tailpipes.'),
 (7,'Body Panels and Bumpers','Wings, bonnets, doors and bumpers.'),
 (8,'Interior Trim','Seats, switchgear and cabin finishers.'),
 (9,'Carbon Fibre Parts','Splitters, mirror caps and aero parts.'),
 (10,'Service Kits','Everything for an oil and filter service.'),
 (11,'Headlights and Tail Lights','Headlamps, tail lamps and lighting parts.'),
 (12,'Wheels, Badges and Emblems','Wheels, centre caps, badges and emblems.')
) c(o, n, d);

-- Seed: six models per brand, two per era (editable later from the admin)
insert into models (brand_id, name, era, note, sort)
select b.id, m.n, m.e, m.t, m.o from (values
 ('Ferrari','modern','296 GTB','Plug-in hybrid V6 berlinetta',1),
 ('Ferrari','modern','SF90 Stradale','Plug-in hybrid V8 flagship',2),
 ('Ferrari','recent','458 Italia','Naturally aspirated mid-engine V8',3),
 ('Ferrari','recent','F430','Mid-engine V8 berlinetta',4),
 ('Ferrari','heritage','F40','Twin-turbo V8 icon',5),
 ('Ferrari','heritage','Testarossa','Flat-12 grand tourer',6),
 ('Lamborghini','modern','Revuelto','Hybrid V12 flagship',1),
 ('Lamborghini','modern','Huracán','V10 super sports car',2),
 ('Lamborghini','recent','Gallardo','V10 supercar',3),
 ('Lamborghini','recent','Murciélago','V12 flagship',4),
 ('Lamborghini','heritage','Countach','Wedge-shaped V12 icon',5),
 ('Lamborghini','heritage','Diablo','V12 supercar of the 1990s',6),
 ('McLaren','modern','720S','Twin-turbo V8 supercar',1),
 ('McLaren','modern','Artura','Hybrid V6 supercar',2),
 ('McLaren','recent','MP4-12C','The first modern road-going McLaren',3),
 ('McLaren','recent','P1','Hybrid hypercar',4),
 ('McLaren','heritage','F1','Central-seat V12 legend',5),
 ('McLaren','heritage','SLR McLaren','Front-engine supercharged V8 GT',6),
 ('Aston Martin','modern','DB12','Twin-turbo V8 grand tourer',1),
 ('Aston Martin','modern','Vantage','V8 sports car',2),
 ('Aston Martin','recent','DB9','V12 grand tourer',3),
 ('Aston Martin','recent','Vanquish','V12 flagship',4),
 ('Aston Martin','heritage','DB5','The classic 1960s grand tourer',5),
 ('Aston Martin','heritage','DB6','Classic grand tourer',6),
 ('Bentley','modern','Continental GT','Twin-turbo grand tourer',1),
 ('Bentley','modern','Bentayga','Luxury SUV',2),
 ('Bentley','recent','Arnage','Twin-turbo V8 saloon',3),
 ('Bentley','recent','Mulsanne','Flagship luxury saloon',4),
 ('Bentley','heritage','Turbo R','1980s performance saloon',5),
 ('Bentley','heritage','R-Type Continental','Post-war coachbuilt classic',6),
 ('Rolls-Royce','modern','Ghost','Modern luxury saloon',1),
 ('Rolls-Royce','modern','Cullinan','Luxury SUV',2),
 ('Rolls-Royce','recent','Phantom VII','V12 flagship saloon',3),
 ('Rolls-Royce','recent','Silver Seraph','Late-1990s luxury saloon',4),
 ('Rolls-Royce','heritage','Silver Shadow','Classic 1960s saloon',5),
 ('Rolls-Royce','heritage','Corniche','Classic coupe and convertible',6),
 ('Maserati','modern','MC20','Twin-turbo V6 supercar',1),
 ('Maserati','modern','Grecale','Performance SUV',2),
 ('Maserati','recent','GranTurismo','V8 grand tourer',3),
 ('Maserati','recent','Quattroporte','Luxury sports saloon',4),
 ('Maserati','heritage','Bora','Mid-engine V8 coupe',5),
 ('Maserati','heritage','Khamsin','Front-engine V8 grand tourer',6)
) m(b, e, n, t, o) join brands b on b.name = m.b;

-- Seed: sample products (SAMPLE-* part numbers and prices are placeholders; delete before launch)
insert into products (brand_id, category_id, name, part_no, price)
select b.id, c.id, p.n, p.no, p.pr from (values
 ('Ferrari','Pads and Discs','Ferrari Front Brake Disc and Pad Set','SAMPLE-001',1850),
 ('Lamborghini','Clutch Kits','Lamborghini Clutch Kit','SAMPLE-002',2400),
 ('McLaren','Service Kits','McLaren Annual Service Kit','SAMPLE-003',390),
 ('Maserati','Exhaust Systems','Maserati Sport Exhaust System','SAMPLE-004',3200),
 ('Bentley','Suspension Parts','Bentley Front Air Spring','SAMPLE-005',980),
 ('Rolls-Royce','Oil, Air and Fuel Filters','Rolls-Royce Air Filter Pair','SAMPLE-006',140)
) p(b, c, n, no, pr) join brands b on b.name = p.b join categories c on c.name = p.c;
