# Super Car Parts – redesign notes

## What changed

- Rebuilt the homepage with the existing red, charcoal and white brand palette.
- Replaced the previous two-images-per-fade hero with four independent horizontal slides. Slides advance automatically, and users can move between them with the arrows, dots or a touch swipe.
- Added keyboard-friendly controls, pause-on-hover/focus behavior and reduced-motion support.
- Reworked the header and responsive navigation, manufacturer cards, category browsing, approach section and quote area.
- Manufacturer copy below each logo is now specific to Ferrari, Lamborghini, McLaren, Aston Martin, Bentley, Rolls-Royce and Maserati. Existing `brands.tagline` and `brands.about` values take priority; local fallback copy is included in `js/app.js`.
- Applied shared styling improvements to the existing manufacturer and parts-store pages without changing the Supabase data model or quote/order workflow.

## Add your own images

Keep the filenames and replace the existing assets:

- `assets/hero/hero-1.jpg` through `hero-4.jpg`: one wide image per carousel slide (recommended 1920 × 1000 or larger).
- `assets/logos/*.png`: manufacturer logos with transparent backgrounds.
- `assets/parts/*.jpg`: category images.
- `assets/models/<manufacturer>/*.jpg`: model images.
- `assets/brands/<manufacturer>-1.jpg` through `<manufacturer>-4.jpg`: four separate images for each manufacturer-page hero carousel. The first slot can also use the brand `hero_url` configured in Supabase.

The carousel also accepts up to four hosted image URLs in the Supabase `settings` table under the `hero_images` key as a JSON array.

## Configuration

Update `js/config.js` with your own public Supabase URL and anon key, EmailJS public configuration, contact details and currency. Never put a Supabase service-role key in browser code.

The existing Supabase schema and quote submission workflow are retained. If you have not already run `supabase/002_images_and_brand_copy.sql`, it can be run after `supabase/schema.sql` to populate the distinct manufacturer taglines and descriptions in the database.
