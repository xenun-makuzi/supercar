// Super Car Parts admin. Every "authenticated" row-level-security policy in schema.sql acts as the admin check,
// so keep public sign-ups disabled in Supabase Auth and create admin users by hand.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const money = n => n == null ? '' : CFG.CURRENCY + Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
const sb = CFG.SUPABASE_URL.includes('YOUR_') ? null : supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
const STATUS = ['new', 'contacted', 'quoted', 'closed'];

// One entry per editable table. Fields are [column, label, type, required].
// Types: text, number, area, image, select:a,b,c and ref:table
const TABLES = {
  brands: { title: 'Manufacturers', order: ['sort'], thumb: 'logo_url', cols: ['name', 'slug', 'sort'], fields: [
    ['name', 'Name', 'text', 1], ['slug', 'URL slug (auto from name if empty)', 'text'], ['logo_url', 'Logo', 'image'],
    ['hero_url', 'Hero image (carousel slide 1)', 'image'], ['tagline', 'Hero tagline', 'text'], ['about', 'About text', 'area'], ['sort', 'Sort order', 'number']] },
  models: { title: 'Models', order: ['name'], thumb: 'image_url', cols: ['brand_id', 'name', 'era', 'note'], fields: [
    ['brand_id', 'Manufacturer', 'ref:brands', 1], ['name', 'Model name', 'text', 1], ['era', 'Era', 'select:modern,recent,heritage', 1],
    ['note', 'Short note', 'text'], ['image_url', 'Photo', 'image'], ['sort', 'Sort order', 'number']] },
  categories: { title: 'Part types', order: ['sort'], thumb: 'image_url', cols: ['name', 'slug', 'note'], fields: [
    ['name', 'Name', 'text', 1], ['slug', 'URL slug (auto from name if empty)', 'text'], ['note', 'Short note', 'text'],
    ['image_url', 'Image', 'image'], ['sort', 'Sort order', 'number']] },
  products: { title: 'Products', order: ['created_at', false], thumb: 'image_url', cols: ['brand_id', 'category_id', 'name', 'part_no', 'price'], fields: [
    ['brand_id', 'Manufacturer', 'ref:brands'], ['category_id', 'Part type', 'ref:categories'], ['name', 'Product name', 'text', 1],
    ['part_no', 'Part number', 'text'], ['price', 'Price (leave empty for price on request)', 'number'], ['image_url', 'Photo', 'image'], ['description', 'Description', 'area']] }
};
const one = C => C.title.replace(/s$/, '');
const S = { refs: {} };
let user = null, toastTimer;

const toast = (m, bad) => {
  const t = $('#toast'); t.textContent = m; t.className = 'show' + (bad ? ' bad' : '');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.className = '', 3500);
};
const fail = e => { console.error(e); toast(e.message || String(e), 1); };

// Lookup lists used by select fields and table labels
async function refs() {
  for (const n of ['brands', 'categories']) if (!S.refs[n]) {
    const { data, error } = await sb.from(n).select('id,name').order('name');
    if (error) throw error;
    S.refs[n] = data;
  }
}
const nameOf = (t, id) => S.refs[t]?.find(x => x.id === id)?.name ?? '';
const cell = (r, c) => c === 'brand_id' ? nameOf('brands', r[c]) : c === 'category_id' ? nameOf('categories', r[c]) : c === 'price' ? money(r[c]) : r[c];

// Uploads to the public "media" bucket (created by schema.sql) and returns the public URL
async function upload(file, dir) {
  if (file.size > 6e6) throw new Error(`${file.name} is larger than 6 MB`);
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${dir}/${Date.now()}-${slug(file.name.replace(/\.[^.]+$/, '')) || 'image'}.${ext}`;
  const { error } = await sb.storage.from('media').upload(path, file, { contentType: file.type, cacheControl: '31536000' });
  if (error) throw error;
  return sb.storage.from('media').getPublicUrl(path).data.publicUrl;
}

function input([k, , type, req], v) {
  const a = `name="${k}"${req ? ' required' : ''}`;
  if (type === 'area') return `<textarea ${a} rows="4">${esc(v)}</textarea>`;
  if (type === 'number') return `<input ${a} type="number" step="any" value="${esc(v)}">`;
  if (type === 'image') return `<span class="img"><img alt="" ${v ? `src="${esc(v)}"` : 'style="visibility:hidden"'} onerror="this.style.visibility='hidden'"><input type="file" accept="image/*" data-k="${k}"><input type="hidden" name="${k}" value="${esc(v)}"></span>`;
  if (/^(select|ref):/.test(type)) {
    const o = type.startsWith('ref:') ? S.refs[type.slice(4)].map(x => [x.id, x.name]) : type.slice(7).split(',').map(x => [x, x]);
    return `<select ${a}><option value=""${v ? '' : ' selected'}${req ? ' disabled' : ''}>${req ? 'Choose' : 'None'}</option>${o.map(([id, n]) => `<option value="${esc(id)}"${id === v ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
  }
  return `<input ${a} value="${esc(v)}">`;
}

function form(t, row = {}) {
  const C = TABLES[t], f = $('#f'), files = {};
  f.innerHTML = `<h2>${row.id ? 'Edit' : 'Add'} ${esc(one(C))}</h2>
    <div class="fg">${C.fields.map(fd => `<label${/area|image/.test(fd[2]) ? ' class="wide"' : ''}>${esc(fd[1])}${fd[3] ? ' *' : ''}${input(fd, row[fd[0]])}</label>`).join('')}</div>
    <div class="end"><button type="button" class="btn line" id="cx">Cancel</button><button class="btn">Save</button></div>`;
  $('#cx').onclick = () => $('#dlg').close();
  $$('input[type=file]', f).forEach(i => i.onchange = () => {
    const file = i.files[0]; if (!file) return;
    files[i.dataset.k] = file;
    const im = $('img', i.parentNode); im.src = URL.createObjectURL(file); im.style.visibility = 'visible';
  });
  f.onsubmit = async e => {
    e.preventDefault();
    const btn = $('button:not([type])', f), fd = new FormData(f), d = {};
    btn.disabled = true;
    try {
      for (const [k, , type] of C.fields) {
        let v = fd.get(k);
        if (type === 'image' && files[k]) v = await upload(files[k], t);
        if (k === 'slug') v = slug(v || fd.get('name'));
        else if (type === 'number') v = v === '' ? (k === 'sort' ? 0 : null) : Number(v);
        else if (v === '') v = null;
        d[k] = v;
      }
      const { error } = row.id ? await sb.from(t).update(d).eq('id', row.id) : await sb.from(t).insert(d);
      if (error) throw error;
      S.refs = {}; $('#dlg').close(); toast('Saved'); route();
    } catch (err) { fail(err); btn.disabled = false; }
  };
  $('#dlg').showModal();
}

async function tableView(t) {
  const C = TABLES[t]; await refs();
  const { data, error } = await sb.from(t).select('*').order(C.order[0], { ascending: C.order[1] !== false });
  if (error) throw error;
  const label = c => C.fields.find(f => f[0] === c)[1].split(' (')[0], byBrand = C.fields.some(f => f[0] === 'brand_id');
  $('#act').innerHTML = `<button class="btn" id="add">Add ${esc(one(C))}</button>`;
  $('#view').innerHTML = `<div class="bar"><input id="fq" type="search" placeholder="Search" aria-label="Search">${byBrand ? `<select id="fb" aria-label="Manufacturer"><option value="">All manufacturers</option>${S.refs.brands.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select>` : ''}</div>
    <div class="tw"><table><thead><tr><th></th>${C.cols.map(c => `<th>${esc(label(c))}</th>`).join('')}<th></th></tr></thead><tbody id="rows"></tbody></table></div>`;
  const draw = () => {
    const w = $('#fq').value.toLowerCase(), b = $('#fb')?.value;
    const list = data.filter(r => (!b || r.brand_id === b) && C.cols.map(c => cell(r, c)).join(' ').toLowerCase().includes(w));
    $('#rows').innerHTML = list.map(r => `<tr><td>${r[C.thumb] ? `<img class="th" src="${esc(r[C.thumb])}" alt="" loading="lazy">` : '<span class="th"></span>'}</td>${C.cols.map(c => `<td>${esc(cell(r, c))}</td>`).join('')}<td class="r"><button class="btn line sm" data-e="${r.id}">Edit</button> <button class="btn line sm danger" data-d="${r.id}">Delete</button></td></tr>`).join('')
      || `<tr><td colspan="${C.cols.length + 2}" class="muted">Nothing here yet.</td></tr>`;
  };
  $('#fq').oninput = draw; if (byBrand) $('#fb').onchange = draw;
  $('#add').onclick = () => form(t);
  $('#rows').onclick = async e => {
    const id = e.target.dataset.e || e.target.dataset.d, r = data.find(x => x.id === id);
    if (!r) return;
    if (e.target.dataset.e) return form(t, r);
    if (!confirm(`Delete "${r.name}"?${t === 'brands' ? ' Its models will be deleted too.' : ''}`)) return;
    const { error } = await sb.from(t).delete().eq('id', id);
    if (error) return fail(error);
    S.refs = {}; toast('Deleted'); route();
  };
  draw();
}

async function showRequests() {
  const { data, error } = await sb.from('requests').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) throw error;
  const v = $('#view');
  v.innerHTML = `<div class="bar"><select id="fs" aria-label="Status"><option value="">All statuses</option>${STATUS.map(s => `<option>${s}</option>`).join('')}</select>
    <select id="fk" aria-label="Type"><option value="">Orders and quotes</option><option value="order">Orders</option><option value="quote">Quotes</option></select>
    <input id="fq" type="search" placeholder="Search name, email, car or part" aria-label="Search"></div><div id="rl"></div>`;
  const draw = () => {
    const s = $('#fs').value, k = $('#fk').value, w = $('#fq').value.toLowerCase();
    const list = data.filter(r => (!s || r.status === s) && (!k || r.kind === k) && Object.values(r).join(' ').toLowerCase().includes(w));
    $('#rl').innerHTML = list.map(r => {
      const tel = (r.phone || '').replace(/\s/g, ''), wa = (r.phone || '').replace(/\D/g, '');
      return `<article class="req"><header><div><b>${esc(r.name)}</b><span class="pill ${esc(r.kind)}">${esc(r.kind)}</span></div><time>${new Date(r.created_at).toLocaleString()}</time></header>
        <dl><dt>Car</dt><dd>${esc([r.make, r.model, r.variant].filter(Boolean).join(' ')) || 'Not given'}</dd><dt>Part number</dt><dd>${esc(r.part_no || 'Not given')}</dd></dl>
        ${r.items?.length ? `<table class="oi">${r.items.map(i => `<tr><td>${i.qty} &times; ${esc(i.name)}${i.part_no ? ` (${esc(i.part_no)})` : ''}</td><td class="r">${money(i.price * i.qty)}</td></tr>`).join('')}<tr><th>Total</th><th class="r">${money(r.total)}</th></tr></table><dl><dt>Payment</dt><dd>${esc(r.payment_method || 'Not given')}</dd></dl>` : ''}
        ${r.details ? `<p class="det">${esc(r.details)}</p>` : ''}
        <footer><span class="links"><a href="mailto:${esc(r.email)}">${esc(r.email)}</a>${wa ? `<a href="tel:${esc(tel)}">${esc(r.phone)}</a><a href="https://wa.me/${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</span>
          <select data-s="${r.id}" aria-label="Status">${STATUS.map(s => `<option${s === r.status ? ' selected' : ''}>${s}</option>`).join('')}</select>
          <button class="btn line sm danger" data-d="${r.id}">Delete</button></footer></article>`;
    }).join('') || '<p class="muted">No requests match.</p>';
  };
  ['#fs', '#fk'].forEach(i => $(i).onchange = draw); $('#fq').oninput = draw;
  v.onchange = async e => {
    const id = e.target.dataset.s; if (!id) return;
    const { error } = await sb.from('requests').update({ status: e.target.value }).eq('id', id);
    if (error) return fail(error);
    data.find(r => r.id === id).status = e.target.value; toast('Status updated'); badge();
  };
  v.onclick = async e => {
    const id = e.target.dataset.d; if (!id || !confirm('Delete this request?')) return;
    const { error } = await sb.from('requests').delete().eq('id', id);
    if (error) return fail(error);
    data.splice(data.findIndex(r => r.id === id), 1); draw(); badge();
  };
  draw();
}

// settings.hero_images: four URLs for the home carousel. Empty slots keep their default file in assets/hero/.
async function showHero() {
  const { data, error } = await sb.from('settings').select('value').eq('key', 'hero_images').maybeSingle();
  if (error) throw error;
  const cur = Array.isArray(data?.value) ? data.value : [], urls = [0, 1, 2, 3].map(i => cur[i] || ''), files = {}, def = i => `assets/hero/hero-${i + 1}.jpg`;
  const v = $('#view');
  v.innerHTML = `<p class="muted">Four slides for the home page carousel, recommended 1920 x 1000 or larger. A slide left on its default uses the file in assets/hero/.</p>
    <div class="slots">${urls.map((u, i) => `<div class="slot"><b>Slide ${i + 1}</b><img src="${esc(u || def(i))}" alt=""><input type="file" accept="image/*" data-i="${i}"><button class="btn line sm" data-c="${i}">Use default</button></div>`).join('')}</div>
    <button class="btn" id="sv">Save hero images</button>`;
  v.onchange = e => {
    const i = e.target.dataset.i, file = e.target.files?.[0];
    if (i == null || !file) return;
    files[i] = file; $('img', e.target.parentNode).src = URL.createObjectURL(file);
  };
  v.onclick = async e => {
    const c = e.target.dataset.c;
    if (c != null) { urls[c] = ''; delete files[c]; $('img', e.target.parentNode).src = def(+c); return; }
    if (e.target.id !== 'sv') return;
    e.target.disabled = true;
    try {
      for (const i in files) urls[i] = await upload(files[i], 'hero');
      const { error } = await sb.from('settings').upsert({ key: 'hero_images', value: urls.map((u, i) => u || def(i)) });
      if (error) throw error;
      toast('Hero images saved');
    } catch (err) { fail(err); }
    e.target.disabled = false;
  };
}

async function badge() {
  const { count } = await sb.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'new');
  $('#nb').textContent = count || '';
}

const VIEWS = { requests: showRequests, hero: showHero, ...Object.fromEntries(Object.keys(TABLES).map(k => [k, tableView])) };

async function route() {
  const h = location.hash.slice(1), k = Object.hasOwn(VIEWS, h) ? h : 'requests', v = $('#view');
  $$('#nav a').forEach(a => a.classList.toggle('on', a.dataset.k === k));
  $('#title').textContent = ({ requests: 'Orders and quotes', hero: 'Home hero images' })[k] || TABLES[k].title;
  $('#act').innerHTML = ''; v.onclick = v.onchange = null; v.innerHTML = '<p class="muted">Loading...</p>';
  try { await VIEWS[k](k); } catch (e) { console.error(e); v.innerHTML = `<div class="err">${esc(e.message || e)}</div>`; }
}

function gate(u) {
  if ((u?.id ?? null) === (user?.id ?? null)) return;
  user = u || null;
  $('#login').hidden = !!user; $('#app').hidden = !user;
  if (user) { $('#who').textContent = user.email; route(); badge(); } else $('#view').innerHTML = '';
}

if (!sb) {
  $('#le').textContent = 'Add your Supabase URL and anon key to js/config.js.';
  $('#lf button').disabled = true;
} else {
  $('#lf').onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target), b = $('button', e.target);
    b.disabled = true; $('#le').textContent = '';
    const { error } = await sb.auth.signInWithPassword({ email: fd.get('email'), password: fd.get('password') });
    if (error) $('#le').textContent = error.message;
    b.disabled = false;
  };
  $('#out').onclick = () => sb.auth.signOut();
  addEventListener('hashchange', () => user && route());
  sb.auth.onAuthStateChange((_e, s) => setTimeout(() => gate(s?.user), 0));
  sb.auth.getSession().then(({ data }) => gate(data.session?.user));
}
