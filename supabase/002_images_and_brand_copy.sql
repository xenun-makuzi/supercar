-- Run after schema.sql (safe to re-run).
alter table categories add column if not exists image_url text;

-- Brand-specific hero line and about text (also shown on the home page manufacturer cards)
update brands b set tagline = v.t, about = v.a from (values
 ('Ferrari', 'Genuine parts for Maranello’s road cars, from the F40 to the SF90 Stradale.', 'Ferrari has built road cars in Maranello, Italy since 1947, from naturally aspirated V12s to plug-in hybrids. We supply genuine parts across the range, including heritage and recent classic models.'),
 ('Lamborghini', 'Genuine parts for Sant’Agata’s V10 and V12 supercars, from the Countach to the Revuelto.', 'Lamborghini was founded in 1963 in Sant’Agata Bolognese, Italy, and is known for dramatic V10 and V12 supercars. We supply genuine parts for current, recent and heritage models.'),
 ('McLaren', 'Genuine parts for McLaren’s carbon-fibre supercars, from the F1 to the Artura.', 'McLaren builds lightweight, carbon-fibre supercars in Woking, England. We supply genuine parts for road cars across the range, from the F1 to the latest hybrids.'),
 ('Aston Martin', 'Genuine parts for British grand tourers, from the DB5 to the DB12.', 'Aston Martin was founded in 1913 and is best known for its British grand tourers. We supply genuine parts for models from the classic DB series to today’s V8 and V12 cars.'),
 ('Bentley', 'Genuine parts for Crewe-built luxury, from classic Continentals to the Continental GT.', 'Bentley was founded in 1919 and builds its cars in Crewe, England, combining hand-finished luxury with real performance. We supply genuine parts for saloons, coupes and SUVs.'),
 ('Rolls-Royce', 'Genuine parts for the marque of Goodwood, from the Silver Shadow to the Cullinan.', 'Rolls-Royce Motor Cars builds bespoke luxury cars at Goodwood, England. We supply genuine parts for classic and current models, from the Silver Shadow to the Ghost.'),
 ('Maserati', 'Genuine parts for Modena’s grand tourers, from the Bora to the MC20.', 'Maserati was founded in Bologna in 1914 and pairs racing heritage with grand-touring comfort. We supply genuine parts for models from the 1970s to the MC20.')
) v(n, t, a) where b.name = v.n;
