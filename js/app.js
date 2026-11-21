
/* =========================================================
   SUPER CAR PARTS
   Main Website JavaScript
   Supabase + EmailJS + Manufacturer Pages + Search
========================================================= */


/* =========================================================
   1. GLOBAL HELPERS AND CONFIGURATION
========================================================= */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

const money = n =>
  CFG.CURRENCY + Number(n).toLocaleString(undefined, {
    maximumFractionDigits: 0
  });

const slug = s => s.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const sb = CFG.SUPABASE_URL.includes('YOUR_')
  ? null
  : supabase.createClient(
      CFG.SUPABASE_URL,
      CFG.SUPABASE_ANON_KEY
    );


/* =========================================================
   EMAILJS CONFIGURATION
========================================================= */

const EMAILJS_CONFIG = CFG.EMAILJS || {};

const mail = Boolean(
  typeof window.emailjs?.send === 'function' &&
  EMAILJS_CONFIG.serviceId &&
  EMAILJS_CONFIG.templateId &&
  EMAILJS_CONFIG.publicKey &&
  ![
    EMAILJS_CONFIG.serviceId,
    EMAILJS_CONFIG.templateId,
    EMAILJS_CONFIG.publicKey
  ].some(value => String(value).includes('YOUR_'))
);

const named = a => a.map((name, i) => ({
  id: i,
  slug: slug(name),
  name
}));

const PH = 'assets/placeholder.svg';


/* =========================================================
   2. IMAGE HELPERS
========================================================= */

// <img> that falls back to a placeholder
const pic = (
  url,
  path,
  alt = '',
  cls = '',
  lazy = true
) => `
  <img
    ${cls ? `class="${cls}"` : ''}
    src="${esc(url || path)}"
    alt="${esc(alt)}"
    ${lazy ? 'loading="lazy"' : ''}
    onerror="this.onerror=null;this.src='${PH}'"
  >
`;

const logo = (b, cls) =>
  pic(
    b.logo_url,
    `assets/logos/${b.slug}.png`,
    `${b.name} logo`,
    cls
  );


/* =========================================================
   3. ICONS
========================================================= */

const ICON = {
  shield:
    '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',

  award:
    '<circle cx="12" cy="9" r="5.5"/><path d="m8.7 13.6-1.4 7.4L12 18.5l4.7 2.5-1.4-7.4"/><path d="m10 9 1.5 1.5L14.2 7.8"/>',

  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'
};

const ico = k => `
  <span class="ico">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      ${ICON[k]}
    </svg>
  </span>
`;


/* =========================================================
   4. DEMO DATA
========================================================= */

const DEMO = {
  brands: named([
    'Ferrari',
    'Lamborghini',
    'McLaren',
    'Aston Martin',
    'Bentley',
    'Rolls-Royce',
    'Maserati'
  ]),

  categories: named([
    'Pads and Discs',
    'Clutch Kits',
    'Suspension Parts',
    'Engine and Gearbox',
    'Oil, Air and Fuel Filters',
    'Exhaust Systems',
    'Body Panels and Bumpers',
    'Interior Trim',
    'Carbon Fibre Parts',
    'Service Kits',
    'Headlights and Tail Lights',
    'Wheels, Badges and Emblems'
  ])
};


/* =========================================================
   5. MANUFACTURER-SPECIFIC BRAND CONTENT
========================================================= */

const BRAND_STORIES = {
  ferrari: {
    tagline: 'Maranello performance, matched part by part.',

    about: 'From naturally aspirated V8 and V12 icons to modern hybrid models, Ferrari ownership calls for exact fitment. We help identify the right genuine parts for maintenance, repairs and considered restoration.'
  },

  lamborghini: {
    tagline: 'Purpose-built parts for unmistakable Italian supercars.',

    about: 'Lamborghini models are known for dramatic design, demanding engineering and high-performance powertrains. Our sourcing service covers the range, from celebrated V10 and V12 classics to the latest-generation cars.'
  },

  mclaren: {
    tagline: 'Lightweight engineering deserves exact components.',

    about: 'McLaren’s focus on carbon-fibre construction and precision performance makes correct specification essential. We help owners and specialists identify parts for road cars spanning the marque’s modern history.'
  },

  'aston-martin': {
    tagline: 'British grand-touring character, maintained with care.',

    about: 'From the timeless DB lineage to contemporary V8 and V12 grand tourers, Aston Martin models blend performance with craftsmanship. We help source the components needed to preserve that balance.'
  },

  bentley: {
    tagline: 'Craftsmanship that deserves the right replacement.',

    about: 'Bentley vehicles combine powerful performance with hand-finished luxury. Our parts sourcing covers refined saloons, grand-touring coupes and SUVs, with attention to model, year and specification.'
  },

  'rolls-royce': {
    tagline: 'Exacting details for exceptional motor cars.',

    about: 'Rolls-Royce ownership is defined by bespoke specification, comfort and meticulous detail. We help locate the correct parts for both heritage models and modern Goodwood-era vehicles.'
  },

  maserati: {
    tagline: 'Italian grand touring, from heritage icons to MC20.',

    about: 'Maserati brings together racing heritage, distinctive design and long-distance refinement. We support parts requests across its history, from classic grand tourers to contemporary performance models.'
  }
};

const brandStory = brand => {
  const fallback = BRAND_STORIES[brand.slug] || {
    tagline: `Specialist parts sourcing for ${brand.name} models.`,

    about: `We help owners and workshops identify the right parts for ${brand.name} vehicles, from model details and variants to part-number checks.`
  };

  return {
    tagline: brand.tagline || fallback.tagline,
    about: brand.about || fallback.about
  };
};


/* =========================================================
   6. SUPABASE DATA RETRIEVAL
========================================================= */

async function get(table, mod = q => q) {
  if (!sb) return DEMO[table] || [];

  const { data, error } = await mod(
    sb.from(table).select('*')
  );

  if (error) {
    console.error(table, error.message);
  }

  return data || [];
}


/* =========================================================
   7. WEBSITE HEADER, NAVIGATION AND FOOTER
========================================================= */

async function layout() {
  const brands = await get(
    'brands',
    q => q.order('sort')
  );

  $('#hdr').innerHTML = `
    <div class="utility-bar">
      <div class="utility-inner">

        <span>
          Independent specialist in premium marque parts
        </span>

        <span class="utility-right">
          <span>Worldwide sourcing</span>
          <span class="utility-divider"></span>

          <a href="mailto:${esc(CFG.EMAIL)}">
            ${esc(CFG.EMAIL)}
          </a>
        </span>

      </div>
    </div>

    <nav class="nav" aria-label="Main navigation">

      <a
        class="logo"
        href="index.html"
        aria-label="Super Car Parts home"
      >
        <i></i>
        <span>Super <b>Car</b> Parts</span>
      </a>

      <button
        class="burger"
        type="button"
        aria-label="Open navigation"
        aria-expanded="false"
        aria-controls="mainLinks"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div class="links" id="mainLinks">

        <a href="index.html">Home</a>

        <a href="index.html#brands">Manufacturers</a>

        <a href="store.html">Parts Store</a>

        <a href="index.html#about">Our Approach</a>

        <a class="btn sm nav-cta" href="index.html#quote">
          Request a Quote
          <span aria-hidden="true">↗</span>
        </a>

      </div>
    <button class="cart-btn" id="cartBtn" type="button" aria-label="Open cart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg><span class="cart-count" hidden>0</span></button>
    </nav>
  `;

  cartInit(brands);

  const burger = $('.burger', $('#hdr'));

  burger.addEventListener('click', () => {
    const open = document.body.classList.toggle('open');

    burger.setAttribute(
      'aria-expanded',
      String(open)
    );

    burger.setAttribute(
      'aria-label',
      open ? 'Close navigation' : 'Open navigation'
    );
  });

  $$('.links a', $('#hdr')).forEach(a => {
    a.addEventListener('click', () => {
      document.body.classList.remove('open');

      burger.setAttribute('aria-expanded', 'false');

      burger.setAttribute(
        'aria-label',
        'Open navigation'
      );
    });
  });

  document.addEventListener('keydown', e => {
    if (
      e.key === 'Escape' &&
      document.body.classList.contains('open')
    ) {
      document.body.classList.remove('open');

      burger.setAttribute('aria-expanded', 'false');

      burger.setAttribute(
        'aria-label',
        'Open navigation'
      );
    }
  });


  /* FOOTER */

  $('#ftr').innerHTML = `
    <div class="wrap">

      <div>
        <h3>Super Car Parts</h3>

        <p>
          Independent specialist in genuine supercar spare parts,
          shipped worldwide.
        </p>
      </div>

      <div>
        <h3>Manufacturers</h3>

        ${brands.map(b => `
          <a href="brand.html?b=${esc(b.slug)}">
            ${esc(b.name)}
          </a>
        `).join('')}
      </div>

      <div>
        <h3>Shop</h3>

        <a href="store.html">Parts store</a>
        <a href="index.html#quote">Request a quote</a>
        <a href="index.html#about">About us</a>
      </div>

      <div>
        <h3>Contact</h3>

        <a href="tel:${esc(CFG.PHONE.replace(/\s/g, ''))}">
          ${esc(CFG.PHONE)}
        </a>

        <a
          href="https://wa.me/${esc(CFG.WHATSAPP)}"
          target="_blank"
          rel="noopener"
        >
          WhatsApp
        </a>

        <a href="mailto:${esc(CFG.EMAIL)}">
          ${esc(CFG.EMAIL)}
        </a>
      </div>

    </div>

    <p class="copy">
      &copy; ${new Date().getFullYear()} Super Car Parts.
      Manufacturer names and logos belong to their respective owners.

      <a class="admin-link" href="admin.html" rel="nofollow">
        Admin
      </a>
    </p>

    <a
      class="wa"
      href="https://wa.me/${esc(CFG.WHATSAPP)}"
      target="_blank"
      rel="noopener"
    >
      WhatsApp us
    </a>
  `;

  return brands;
}


/* =========================================================
   8. EMAILJS NOTIFICATION
========================================================= */

async function sendRequestNotification(request) {

  if (!mail) {
    throw new Error(
      'EmailJS is not configured or the EmailJS SDK is unavailable.'
    );
  }

  const emailParams = {

    // Request type
    kind: request.kind || 'quote',

    kind_label:
      request.kind === 'order'
        ? 'New Order'
        : 'New Quote',

    // Customer details
    name: request.name || 'Not provided',

    email: request.email || 'Not provided',

    phone: request.phone || 'Not provided',

    // Vehicle details
    make: request.make || 'Not provided',

    model: request.model || 'Not provided',

    variant: request.variant || 'Not provided',

    part_no: request.part_no || (request.items?.length ? 'See order items' : 'Not provided'),

    // Customer message
    details: request.details || 'No additional details',

    // Submission date
    submitted_at: new Date().toLocaleString(
      undefined,
      {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    ),

    // Website page
    page_url: window.location.href,

    // Cart order details (used by the {{#is_order}} section of the template)
    is_order: request.items?.length ? 'yes' : '',
    orders: (request.items || []).map(i => ({ name: i.name, part_no: i.part_no || 'N/A', qty: i.qty, price: money(i.price), line_total: money(i.price * i.qty) })),
    total: request.total != null ? money(request.total) : '',
    payment_method: request.payment_method || 'Not applicable'
  };

  const response = await window.emailjs.send(
    EMAILJS_CONFIG.serviceId,
    EMAILJS_CONFIG.templateId,
    emailParams,
    {
      publicKey: EMAILJS_CONFIG.publicKey
    }
  );

  return response;
}


/* =========================================================
   9. QUOTE AND ORDER FORM
   Saves to Supabase and sends EmailJS notification.
========================================================= */

function quoteForm(el, brands, o = {}) {

  el.innerHTML = `
    <form class="qf">

      <input
        name="name"
        placeholder="Full name"
        autocomplete="name"
        required
      >

      <input
        name="email"
        type="email"
        placeholder="Email address"
        autocomplete="email"
        required
      >

      <input
        name="phone"
        type="tel"
        placeholder="Phone or WhatsApp number"
        autocomplete="tel"
      >

      <select
        name="make"
        aria-label="Car make"
        required
      >
        <option value="">Car make</option>

        ${brands.map(b => `
          <option
            value="${esc(b.name)}"
            ${b.name === o.make ? 'selected' : ''}
          >
            ${esc(b.name)}
          </option>
        `).join('')}

        <option value="Other">Other</option>
      </select>

      <input
        name="model"
        placeholder="Model, e.g. 488 GTB"
        required
      >

      <input
        name="variant"
        placeholder="Variant and year"
      >

      <input
        name="part_no"
        placeholder="Part number, if known"
        value="${esc(o.part || '')}"
      >

      <textarea
        name="details"
        rows="4"
        placeholder="Which parts do you need? Add anything that helps us match them, such as a chassis number."
        required
      >${esc(o.note || '')}</textarea>

      <button class="btn" type="submit">
        ${o.kind === 'order' ? 'Place order' : 'Request quote'}
      </button>

      <p class="msg" role="status" aria-live="polite"></p>

    </form>
  `;


  if (o.cart) {
    const total = o.cart.reduce((n, i) => n + i.qty * i.price, 0), wire = total > CFG.WIRE_MIN;
    $('[name="part_no"]', el).remove();
    const note = $('textarea', el); note.required = false; note.placeholder = 'Notes for our team (optional)';
    $('button[type="submit"]', el).insertAdjacentHTML('beforebegin', `
      <fieldset class="pay">
        <legend>Payment method</legend>
        ${['Zelle', 'Chime', 'Apple Pay', 'Cash App'].map((m, i) => `<label><input type="radio" name="payment_method" value="${m}"${i ? '' : ' required'}> ${m}</label>`).join('')}
        <label class="${wire ? '' : 'off'}"><input type="radio" name="payment_method" value="Wire transfer"${wire ? '' : ' disabled'}> Wire transfer <small>${wire ? '' : `Orders above ${money(CFG.WIRE_MIN)} only`}</small></label>
        <p class="hint">We will send payment instructions for your chosen method once we confirm your order.</p>
      </fieldset>`);
  }

  const form = $('form', el);

  form.onsubmit = async e => {

    e.preventDefault();

    const f = e.target;

    const msg = $('.msg', f);

    const btn = $('button[type="submit"]', f);

    if (!f.reportValidity()) return;


    /* COLLECT CUSTOMER INFORMATION */

    const values = Object.fromEntries(
      new FormData(f)
    );


    /* MATCH SUPABASE REQUESTS TABLE */

    const row = {

      name: String(values.name || '').trim(),

      email: String(values.email || '').trim(),

      phone:
        String(values.phone || '').trim() || null,

      make: values.make || null,

      model: String(values.model || '').trim(),

      variant:
        String(values.variant || '').trim() || null,

      part_no:
        String(values.part_no || '').trim() || null,

      details:
        String(values.details || '').trim(),

      kind:
        o.kind === 'order' ? 'order' : 'quote'
    };


    if (o.cart) {
      const items = o.cart.map(({ id, name, part_no, price, qty }) => ({ id, name, part_no, price, qty }));
      Object.assign(row, { kind: 'order', part_no: null, items, total: items.reduce((n, i) => n + i.qty * i.price, 0), payment_method: values.payment_method || null });
    }

    btn.disabled = true;

    msg.className = 'msg';

    msg.textContent = 'Submitting your request...';


    let savedToDatabase = false;

    let emailSent = false;


    /* =====================================================
       SAVE REQUEST TO SUPABASE
    ===================================================== */

    if (sb) {

      try {

        const { error } = await sb
          .from('requests')
          .insert(row);

        if (error) throw error;

        savedToDatabase = true;

        console.log(
          'Request successfully saved to Supabase.'
        );

      } catch (dbError) {

        console.error(
          'Supabase submission failed:',
          dbError
        );

      }
    }


    /* =====================================================
       SEND EMAIL NOTIFICATION THROUGH EMAILJS
    ===================================================== */

    if (mail) {

      try {

        await sendRequestNotification(row);

        emailSent = true;

        console.log(
          'EmailJS notification successfully sent.'
        );

      } catch (emailError) {

        console.error(
          'EmailJS notification failed:',
          emailError
        );

      }

    } else {

      console.warn(
        'EmailJS is not configured or the SDK is unavailable.'
      );

    }


    /* =====================================================
       HANDLE DELIVERY RESULTS
    ===================================================== */

    if (!savedToDatabase && !emailSent) {

      msg.className = 'msg err';

      msg.textContent =
        'We could not submit your request. Please try again or contact us through WhatsApp.';

      btn.disabled = false;

      return;
    }


    /* RESET FORM AFTER SUCCESSFUL DELIVERY */

    f.reset();

    if (o.cart) { cart.clear(); f.classList.add('done'); }

    msg.className = 'msg ok';


    if (savedToDatabase && emailSent) {

      msg.textContent =
        row.kind === 'order'

          ? 'Your order request has been received successfully. Our team will contact you shortly to confirm availability and shipping.'

          : 'Your quote request has been received successfully. Our team will review your requirements and get back to you shortly.';

    } else if (savedToDatabase) {

      msg.textContent =
        'Your request has been saved successfully. Our team can review it, although the email notification is temporarily unavailable.';

    } else {

      msg.textContent =
        'Your request has been sent to our team by email. However, the online request record could not be saved.';

    }


    btn.disabled = false;

  };

}


/* =========================================================
   10. SEARCH AUTOCOMPLETE
========================================================= */

async function initSearch(input, box) {

  const [b, m, c, p] = await Promise.all([

    get('brands'),

    get('models'),

    get('categories'),

    get('products', q => q.limit(500))

  ]);


  const bn = Object.fromEntries(
    b.map(x => [x.id, x])
  );


  const idx = [

    ...b.map(x => ({
      t: x.name,
      s: 'Manufacturer',
      h: `brand.html?b=${x.slug}`
    })),

    ...m
      .filter(x => bn[x.brand_id])
      .map(x => ({
        t: `${bn[x.brand_id].name} ${x.name}`,
        s: 'Model',
        h: `brand.html?b=${bn[x.brand_id].slug}#models`
      })),

    ...c.map(x => ({
      t: x.name,
      s: 'Part type',
      h: `store.html?cat=${x.slug}`
    })),

    ...p.map(x => ({
      t: x.name + (
        x.part_no ? ` (${x.part_no})` : ''
      ),
      s: 'Part',
      h: `store.html?q=${encodeURIComponent(x.part_no || x.name)}`
    }))

  ];


  let sel = -1;

  let hits = [];


  const draw = () => {

    box.innerHTML = hits.map((h, i) => `

      <a
        class="${i === sel ? 'on' : ''}"
        href="${h.h}"
      >

        <span>${esc(h.t)}</span>

        <em>${esc(h.s)}</em>

      </a>

    `).join('');

    box.hidden = !hits.length;

  };


  input.oninput = () => {

    const w = input.value
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    sel = -1;

    hits = w.length

      ? idx.filter(x =>
          w.every(k =>
            x.t.toLowerCase().includes(k)
          )
        ).slice(0, 8)

      : [];

    draw();

  };


  input.onkeydown = e => {

    if (
      (e.key === 'ArrowDown' || e.key === 'ArrowUp') &&
      hits.length
    ) {

      e.preventDefault();

      sel = (
        sel +
        (e.key === 'ArrowDown' ? 1 : -1) +
        hits.length
      ) % hits.length;

      draw();

    } else if (
      e.key === 'Enter' &&
      input.value.trim()
    ) {

      location.href =
        hits[sel]?.h ||
        `store.html?q=${encodeURIComponent(input.value.trim())}`;

    } else if (e.key === 'Escape') {

      hits = [];

      draw();

    }

  };


  document.addEventListener('click', e => {

    if (
      e.target !== input &&
      !box.contains(e.target)
    ) {

      hits = [];

      draw();

    }

  });

}


/* =========================================================
   CART (kept in localStorage; checkout reuses quoteForm)
========================================================= */

const cart = {
  items: [],
  load() { try { this.items = JSON.parse(localStorage.getItem('scp_cart')) || []; } catch { this.items = []; } },
  save() { try { localStorage.setItem('scp_cart', JSON.stringify(this.items)); } catch {} document.dispatchEvent(new Event('cart')); },
  count() { return this.items.reduce((n, i) => n + i.qty, 0); },
  total() { return this.items.reduce((n, i) => n + i.qty * i.price, 0); },
  add(p) {
    const i = this.items.find(x => String(x.id) === String(p.id));
    if (i) i.qty++; else this.items.push({ id: p.id, name: p.name, part_no: p.part_no || '', price: Number(p.price), image_url: p.image_url || '', qty: 1 });
    this.save();
  },
  set(id, qty) { this.items = this.items.map(i => String(i.id) === String(id) ? { ...i, qty } : i).filter(i => i.qty > 0); this.save(); },
  clear() { this.items = []; this.save(); }
};

function cartInit(brands) {
  cart.load();
  const dlg = document.createElement('dialog');
  dlg.className = 'cart-drawer';
  document.body.appendChild(dlg);
  let step = 'cart';

  const badge = () => { const n = cart.count(), b = $('.cart-count'); b.textContent = n; b.hidden = !n; };

  const show = s => {
    step = s === 'checkout' && cart.items.length ? 'checkout' : 'cart';
    const total = cart.total();
    const list = cart.items.map(i => `
      <li class="ci">
        ${pic(i.image_url, PH, i.name)}
        <div><b>${esc(i.name)}</b><small>${esc(i.part_no)}</small><span class="cp">${money(i.price * i.qty)}</span></div>
        <div class="qty"><button type="button" data-m="${esc(i.id)}" aria-label="Decrease quantity">&minus;</button><span>${i.qty}</span><button type="button" data-p="${esc(i.id)}" aria-label="Increase quantity">+</button></div>
        <button type="button" class="rm" data-r="${esc(i.id)}" aria-label="Remove ${esc(i.name)}">&times;</button>
      </li>`).join('');
    const summary = cart.items.map(i => `<li><span>${i.qty} &times; ${esc(i.name)}</span><span>${money(i.price * i.qty)}</span></li>`).join('');
    let body;
    if (!cart.items.length) body = `<div class="cb"><p class="note">Your cart is empty.</p><a class="btn" href="store.html">Browse the parts store</a></div>`;
    else if (step === 'cart') body = `<ul class="cb">${list}</ul><footer><p class="tot"><span>Subtotal</span><b>${money(total)}</b></p><p class="hint">Shipping is confirmed with your order.</p><button type="button" class="btn" data-go="checkout">Checkout</button></footer>`;
    else body = `<div class="cb"><ul class="sum">${summary}</ul><p class="tot"><span>Total</span><b>${money(total)}</b></p><div id="co"></div></div><footer><button type="button" class="btn line" data-go="cart">Back to cart</button></footer>`;
    dlg.innerHTML = `<header><h2>${step === 'cart' ? 'Your cart' : 'Checkout'}</h2><button type="button" class="x" data-x aria-label="Close">&times;</button></header>${body}`;
    if (step === 'checkout') quoteForm($('#co', dlg), brands, { kind: 'order', cart: cart.items.map(i => ({ ...i })) });
  };

  dlg.addEventListener('click', e => {
    if (e.target === dlg) return dlg.close();
    const t = e.target.closest('button'); if (!t) return;
    const d = t.dataset, line = id => cart.items.find(i => String(i.id) === id);
    if ('x' in d) dlg.close();
    else if (d.go) show(d.go);
    else if (d.p && line(d.p)) cart.set(d.p, line(d.p).qty + 1);
    else if (d.m && line(d.m)) cart.set(d.m, line(d.m).qty - 1);
    else if (d.r) cart.set(d.r, 0);
  });
  document.addEventListener('cart', () => { badge(); if (dlg.open && step === 'cart') show('cart'); });
  window.addEventListener('storage', e => { if (e.key === 'scp_cart') { cart.load(); badge(); } });
  $('#cartBtn').addEventListener('click', () => { show('cart'); dlg.showModal(); });
  badge();
}
