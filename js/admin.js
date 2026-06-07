/**
 * Admin dashboard (HSI-style): orders, menu, categories, promotions, coupons,
 * announcements, customers, analytics and shop settings.
 */
(function () {
  const cfg = window.TRR_CONFIG;
  let CATEGORIES = [];
  let PRODUCTS = [];
  const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'completed'];
  const loaded = {};

  document.querySelectorAll('[data-shop-name]').forEach((el) => (el.textContent = cfg.SHOP_NAME));

  // ---- auth gate ----------------------------------------------------------
  async function init() {
    if (!window.TRR_CONFIGURED) { document.getElementById('config-warning').classList.remove('hidden'); return; }
    const profile = await getProfile();
    if (profile && profile.role === 'admin') showDashboard();
    else showLogin();
  }
  function showLogin() {
    document.getElementById('login-gate').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('admin-logout').classList.add('hidden');
  }
  async function showDashboard() {
    document.getElementById('login-gate').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('admin-logout').classList.remove('hidden');
    await loadCategories();
    PRODUCTS = (await sb.from('products').select('*').order('sort_order')).data || [];
    loadShopStatus();
    loadOrders();
    loaded.orders = true;
    subscribeRealtime();
  }

  // Live updates: refresh the orders/payments views when any order changes.
  function subscribeRealtime() {
    if (window._trrRealtime) return;
    window._trrRealtime = sb.channel('orders-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        const active = document.querySelector('[data-tab].active')?.dataset.tab;
        if (!active || active === 'orders') loadOrders();
        if (loaded.payments) loadPayments();
      })
      .subscribe();
  }

  // ---- shop open / closed -------------------------------------------------
  let shopOpen = true;
  async function loadShopStatus() {
    const { data } = await sb.from('settings').select('value').eq('key', 'shop_open').maybeSingle();
    shopOpen = !data || data.value !== 'false';
    renderShopStatus();
  }
  function renderShopStatus() {
    document.getElementById('shop-status-dot').className = 'w-3 h-3 rounded-full ' + (shopOpen ? 'bg-emerald-500' : 'bg-red-500');
    document.getElementById('shop-status-text').textContent = shopOpen
      ? I18N.t('a.open_full') : I18N.t('a.closed_full');
    const btn = document.getElementById('shop-toggle');
    btn.textContent = shopOpen ? I18N.t('a.close_shop') : I18N.t('a.open_shop');
    btn.className = 'btn text-sm ' + (shopOpen ? 'btn-ghost !text-red-600 !bg-red-50' : 'btn-primary');
  }
  async function toggleShop() {
    if (!(await ensureSession())) return;
    const next = !shopOpen;
    const { error } = await sb.from('settings').upsert(
      { key: 'shop_open', value: String(next), updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) return showToast(error.message, 'error');
    shopOpen = next; renderShopStatus();
    showToast(next ? I18N.t('a.shop_open_now') : I18N.t('a.shop_closed_now'), next ? 'success' : 'info');
  }

  async function login(e) {
    e.preventDefault();
    const f = e.target;
    const { error } = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
    if (error) return showToast(error.message, 'error');
    const profile = await getProfile();
    if (!profile || profile.role !== 'admin') { await sb.auth.signOut(); return showToast(I18N.t('a.not_admin'), 'error'); }
    showDashboard();
  }

  // ---- shared -------------------------------------------------------------
  async function loadCategories() {
    CATEGORIES = (await sb.from('categories').select('*').order('sort_order')).data || [];
    const opts = CATEGORIES.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
    const ps = document.querySelector('#product-form select[name="category_id"]'); if (ps) ps.innerHTML = opts;
    const pc = document.querySelector('#promo-form select[name="category_id"]'); if (pc) pc.innerHTML = opts;
  }
  const catName = (id) => (CATEGORIES.find((c) => c.id === id) || {}).name || '—';
  const openModal = (id) => document.getElementById(id).classList.add('open');
  const closeModal = (id) => document.getElementById(id).classList.remove('open');
  const esc = (s) => String(s ?? '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const statusLabel = (s) => I18N.t('status.' + s);

  // Ensure a valid (refreshed) session before any write, so a stale access
  // token doesn't make the request anonymous and trip RLS.
  async function ensureSession() {
    let { data: { session } } = await sb.auth.getSession();
    if (session && session.expires_at && session.expires_at * 1000 < Date.now() + 60000) {
      session = (await sb.auth.refreshSession()).data.session;
    }
    if (!session) { showToast('Your session expired — please sign in again.', 'error'); showLogin(); return false; }
    return true;
  }

  // ===================== ORDERS ==========================================
  async function loadOrders() {
    if (!(await ensureSession())) return;
    const status = document.getElementById('filter-status').value;
    let q = sb.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(150);
    if (status) q = q.eq('status', status);
    const { data: orders, error } = await q;
    if (error) return showToast(error.message, 'error');
    renderStats(orders || []);
    renderOrders(orders || []);
  }
  function renderStats(orders) {
    const today = new Date().toISOString().slice(0, 10);
    const todays = orders.filter((o) => o.created_at.slice(0, 10) === today);
    const cnt = (s) => orders.filter((o) => o.status === s).length;
    const sales = todays.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
    document.getElementById('stat-today').textContent = todays.length;
    document.getElementById('stat-pending').textContent = cnt('pending');
    document.getElementById('stat-preparing').textContent = cnt('preparing');
    document.getElementById('stat-sales').textContent = money(sales);
  }
  function renderOrders(orders) {
    const host = document.getElementById('orders-list');
    if (!orders.length) { host.innerHTML = `<p class="text-center text-gray-400 py-10">${I18N.t('a.noorders')}</p>`; return; }

    const orderCard = (o) => {
      const items = (o.order_items || []).map((i) => `<li>${i.quantity}× ${i.product_name} <span class="text-gray-400">${money(i.line_total)}</span></li>`).join('');
      const time = new Date(o.created_at).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' });
      const ni = STATUS_FLOW.indexOf(o.status);
      const next = ni >= 0 && ni < STATUS_FLOW.length - 1 ? STATUS_FLOW[ni + 1] : null;
      return `
      <div class="card p-4 ord-${o.status}">
        <div class="flex items-start justify-between gap-3">
          <div><p class="font-extrabold text-gray-800">${o.order_number}</p><p class="text-xs text-gray-400">${time}</p></div>
          <span class="badge badge-${o.status}">${statusLabel(o.status)}</span>
        </div>
        <ul class="text-sm text-gray-600 mt-3 space-y-0.5">${items}</ul>
        <div class="text-sm mt-3 pt-3 border-t border-purple-50 grid grid-cols-2 gap-x-3 gap-y-1">
          <span class="text-gray-400">${I18N.t('a.recipient')}</span><span class="text-right font-medium">${esc(o.customer_name)}</span>
          <span class="text-gray-400">${I18N.t('a.phone')}</span><span class="text-right">${esc(o.customer_phone)}</span>
          <span class="text-gray-400">${I18N.t('a.type')}</span><span class="text-right capitalize">${o.fulfillment_type}</span>
          ${o.address ? `<span class="text-gray-400">${I18N.t('a.address')}</span><span class="text-right">${esc(o.address)}</span>` : ''}
          ${o.notes ? `<span class="text-gray-400">${I18N.t('a.notes')}</span><span class="text-right">${esc(o.notes)}</span>` : ''}
          ${o.coupon_code ? `<span class="text-gray-400">${I18N.t('a.coupon')}</span><span class="text-right">${esc(o.coupon_code)} (-${money(o.discount)})</span>` : ''}
          <span class="text-gray-400">${I18N.t('a.payment')}</span><span class="text-right capitalize">${o.payment_method} · <span class="${o.payment_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'} font-semibold">${o.payment_status==='paid'?I18N.t('a.paid'):I18N.t('a.unpaid')}</span></span>
          ${o.rating ? `<span class="text-gray-400">${I18N.t('a.rating')}</span><span class="text-right text-amber-500 font-semibold">${o.rating}/5</span>` : ''}
          <span class="text-gray-400 font-bold">${I18N.t('a.total')}</span><span class="text-right font-extrabold brand-gradient-text">${money(o.total)}</span>
        </div>
        <div class="flex gap-2 mt-3 flex-wrap">
          ${next
            ? (next === 'completed' && o.payment_status !== 'paid'
                ? `<button class="btn btn-ghost !text-gray-400 !bg-gray-100 text-sm flex-1" disabled>${I18N.t('a.mark')} ${statusLabel(next)}</button>`
                : `<button class="btn btn-primary text-sm flex-1" data-advance="${o.id}" data-next="${next}">${I18N.t('a.mark')} ${statusLabel(next)}</button>`)
            : ''}
          ${o.payment_status !== 'paid' ? `<button class="btn btn-ghost !text-emerald-700 !bg-emerald-50 text-sm" data-paid="${o.id}">${I18N.t('a.markpaid')}</button>` : ''}
          ${o.status !== 'cancelled' && o.status !== 'completed' ? `<button class="btn btn-ghost !text-red-600 !bg-red-50 text-sm" data-cancel="${o.id}">${I18N.t('a.cancel')}</button>` : ''}
        </div>
        ${next === 'completed' && o.payment_status !== 'paid' ? `<p class="text-xs text-amber-600 mt-2">${I18N.t('a.pay_to_complete')}</p>` : ''}
      </div>`;
    };

    // Group by status; within each group, oldest first (first-come-first-served).
    const groups = {};
    orders.forEach((o) => { (groups[o.status] = groups[o.status] || []).push(o); });
    Object.values(groups).forEach((arr) => arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));

    const DISPLAY = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
    const COLOR = {
      pending:   { dot: 'bg-red-500',     text: 'text-red-600',     pulse: true },
      confirmed: { dot: 'bg-blue-500',    text: 'text-blue-600' },
      preparing: { dot: 'bg-purple-500',  text: 'text-purple-600' },
      ready:     { dot: 'bg-emerald-500', text: 'text-emerald-600' },
      completed: { dot: 'bg-gray-400',    text: 'text-gray-500' },
      cancelled: { dot: 'bg-gray-300',    text: 'text-gray-400' },
    };
    host.innerHTML = DISPLAY.filter((st) => groups[st] && groups[st].length).map((st) => {
      const c = COLOR[st];
      return `<section class="mb-6">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full ${c.dot} ${c.pulse ? 'dot-pulse' : ''}"></span>
          <h3 class="font-extrabold ${c.text}">${statusLabel(st)} <span class="text-gray-400 font-semibold">(${groups[st].length})</span></h3>
        </div>
        <div class="space-y-3 mt-2">${groups[st].map(orderCard).join('')}</div>
      </section>`;
    }).join('');

    host.querySelectorAll('[data-advance]').forEach((b) => b.addEventListener('click', () => updateStatus(+b.dataset.advance, b.dataset.next)));
    host.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', () => { if (confirm('Cancel this order?')) updateStatus(+b.dataset.cancel, 'cancelled'); }));
    host.querySelectorAll('[data-paid]').forEach((b) => b.addEventListener('click', () => markPaid(+b.dataset.paid)));
    injectIcons(host);
  }
  async function updateStatus(id, status) {
    if (!(await ensureSession())) return;
    if (status === 'completed') {
      const { data } = await sb.from('orders').select('payment_status').eq('id', id).single();
      if (data && data.payment_status !== 'paid') return showToast(I18N.t('a.pay_to_complete'), 'error');
    }
    const { data, error } = await sb.from('orders').update({ status }).eq('id', id).select();
    if (error) return showToast(error.message, 'error');
    if (!data || !data.length) return showToast('Your session expired — please sign in again.', 'error');
    showToast(`${I18N.t('a.mark')} ${statusLabel(status)}`, 'success'); loadOrders();
  }
  async function markPaid(id) {
    if (!(await ensureSession())) return;
    const { data, error } = await sb.from('orders').update({ payment_status: 'paid' }).eq('id', id).select();
    if (error) return showToast(error.message, 'error');
    if (!data || !data.length) return showToast('Your session expired — please sign in again.', 'error');
    showToast(I18N.t('a.markpaid'), 'success');
    loadOrders(); if (loaded.payments) loadPayments();
  }

  // ===================== PAYMENTS ========================================
  async function loadPayments() {
    const { data: orders } = await sb.from('orders').select('*, order_items(product_name,quantity)').order('created_at', { ascending: false });
    const all = orders || [];
    const paid = all.filter((o) => o.payment_status === 'paid' && o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
    const unpaidOrders = all.filter((o) => o.payment_status !== 'paid' && o.status !== 'cancelled');
    const unpaid = unpaidOrders.reduce((s, o) => s + Number(o.total), 0);
    document.getElementById('pay-paid').textContent = money(paid);
    document.getElementById('pay-unpaid').textContent = money(unpaid);
    document.getElementById('pay-unpaid-count').textContent = unpaidOrders.length;
    const host = document.getElementById('payments-list');
    host.innerHTML = unpaidOrders.length ? unpaidOrders.map((o) => {
      const items = (o.order_items || []).map((i) => `${i.quantity}× ${i.product_name}`).join(', ');
      return `
      <div class="card p-4 flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="font-bold text-gray-800">${o.order_number} · <span class="capitalize">${o.payment_method}</span></p>
          <p class="text-xs text-gray-500 truncate">${esc(o.customer_name)} · ${esc(items)}</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="font-extrabold brand-gradient-text">${money(o.total)}</span>
          <button class="btn btn-ghost !text-emerald-700 !bg-emerald-50 text-sm" data-paid="${o.id}">${I18N.t('a.markpaid')}</button>
        </div>
      </div>`;
    }).join('') : `<p class="text-gray-400">${I18N.t('a.all_settled')}</p>`;
    host.querySelectorAll('[data-paid]').forEach((b) => b.addEventListener('click', () => markPaid(+b.dataset.paid)));
  }

  // ===================== MENU ============================================
  async function loadMenu() {
    PRODUCTS = (await sb.from('products').select('*').order('sort_order')).data || [];
    const host = document.getElementById('menu-list');
    host.innerHTML = PRODUCTS.map((p) => {
      const sale = p.sale_price && Number(p.sale_price) > 0 && Number(p.sale_price) < Number(p.price);
      const thumb = p.image_url
        ? `<img src="${esc(p.image_url)}" alt="" class="w-14 h-14 rounded-lg object-cover shrink-0">`
        : `<div class="thumb-fallback w-14 h-14 rounded-lg text-white shrink-0">${ICON('roll')}</div>`;
      return `
      <div class="card p-4 flex items-center justify-between gap-3 ${p.available ? '' : 'opacity-60'}">
        <div class="flex items-center gap-3 min-w-0">
          ${thumb}
          <div class="min-w-0">
            <p class="font-bold text-gray-800 truncate">${esc(p.name)}</p>
            <p class="text-xs text-gray-400">${catName(p.category_id)} · ${sale ? `<span class="text-emerald-600">${money(p.sale_price)}</span> <span class="line-through">${money(p.price)}</span>` : money(p.price)} ${p.available ? '' : '· ' + I18N.t('menu.soldout')}</p>
          </div>
        </div>
        <button class="btn btn-ghost text-sm shrink-0" data-edit="${p.id}"><span class="icon" data-icon="edit"></span></button>
      </div>`;
    }).join('');
    host.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openProduct(PRODUCTS.find((x) => x.id === +b.dataset.edit))));
    injectIcons(host);
  }
  function openProduct(p) {
    const f = document.getElementById('product-form'); f.reset();
    document.getElementById('product-modal-title').textContent = p ? I18N.t('a.edit_item') : I18N.t('a.add_item');
    document.getElementById('product-delete').classList.toggle('hidden', !p);
    f.id.value = p?.id || ''; f.name.value = p?.name || '';
    f.category_id.value = p?.category_id || (CATEGORIES[0]?.id ?? '');
    f.description.value = p?.description || ''; f.price.value = p?.price ?? '';
    f.sale_price.value = p?.sale_price ?? ''; f.available.value = String(p?.available ?? true);
    f.image_url.value = p?.image_url || '';
    document.getElementById('product-photo-file').value = '';
    renderPhotoPreview(p?.image_url || '');
    openModal('product-modal');
  }
  function renderPhotoPreview(url) {
    const box = document.getElementById('product-photo-preview');
    box.innerHTML = url ? `<img src="${esc(url)}" alt="" class="w-full h-full object-cover">` : ICON('image');
    injectIcons(box);
  }
  async function uploadProductPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!(await ensureSession())) return;
    const status = document.getElementById('product-photo-status');
    status.textContent = 'Uploading…'; status.className = 'text-xs text-purple-600 mt-1';
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await sb.storage.from('menu').upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = sb.storage.from('menu').getPublicUrl(path);
      document.getElementById('product-form').image_url.value = data.publicUrl;
      renderPhotoPreview(data.publicUrl);
      status.textContent = 'Photo uploaded.'; status.className = 'text-xs text-emerald-600 mt-1';
    } catch (err) {
      status.textContent = err.message || 'Upload failed'; status.className = 'text-xs text-red-600 mt-1';
    }
  }
  async function saveProduct(e) {
    e.preventDefault(); if (!(await ensureSession())) return; const f = e.target;
    const row = {
      name: f.name.value.trim(), category_id: +f.category_id.value, description: f.description.value.trim(),
      price: +f.price.value, sale_price: f.sale_price.value ? +f.sale_price.value : null,
      available: f.available.value === 'true', image_url: f.image_url.value.trim() || null,
    };
    const id = f.id.value;
    const res = id ? await sb.from('products').update(row).eq('id', +id) : await sb.from('products').insert(row);
    if (res.error) return showToast(res.error.message, 'error');
    showToast(I18N.t('a.saved'), 'success'); closeModal('product-modal'); loadMenu();
  }
  async function deleteProduct() {
    if (!(await ensureSession())) return;
    const id = document.getElementById('product-form').id.value;
    if (!id || !confirm('Delete this item?')) return;
    const { error } = await sb.from('products').delete().eq('id', +id);
    if (error) return showToast(error.message, 'error');
    showToast(I18N.t('a.deleted'), 'info'); closeModal('product-modal'); loadMenu();
  }

  // ===================== CATEGORIES ======================================
  async function loadCategoriesTab() {
    await loadCategories();
    const host = document.getElementById('category-list');
    host.innerHTML = CATEGORIES.map((c) => `
      <div class="card p-4 flex items-center justify-between gap-3 ${c.active ? '' : 'opacity-60'}">
        <div><p class="font-bold text-gray-800">${esc(c.name)}</p><p class="text-xs text-gray-400">Order ${c.sort_order} ${c.active ? '' : '· Hidden'}</p></div>
        <button class="btn btn-ghost text-sm" data-edit="${c.id}"><span class="icon" data-icon="edit"></span></button>
      </div>`).join('');
    host.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openCategory(CATEGORIES.find((x) => x.id === +b.dataset.edit))));
    injectIcons(host);
  }
  function openCategory(c) {
    const f = document.getElementById('category-form'); f.reset();
    document.getElementById('category-modal-title').textContent = c ? I18N.t('a.edit_category') : I18N.t('a.add_category');
    document.getElementById('category-delete').classList.toggle('hidden', !c);
    f.id.value = c?.id || ''; f.name.value = c?.name || '';
    f.sort_order.value = c?.sort_order ?? 0; f.active.value = String(c?.active ?? true);
    openModal('category-modal');
  }
  async function saveCategory(e) {
    e.preventDefault(); if (!(await ensureSession())) return; const f = e.target;
    const row = { name: f.name.value.trim(), sort_order: +f.sort_order.value, active: f.active.value === 'true' };
    const id = f.id.value;
    const res = id ? await sb.from('categories').update(row).eq('id', +id) : await sb.from('categories').insert(row);
    if (res.error) return showToast(res.error.message, 'error');
    showToast(I18N.t('a.saved'), 'success'); closeModal('category-modal'); loadCategoriesTab();
  }
  async function deleteCategory() {
    if (!(await ensureSession())) return;
    const id = document.getElementById('category-form').id.value;
    if (!id || !confirm('Delete this category? Items keep existing but become uncategorised.')) return;
    const { error } = await sb.from('categories').delete().eq('id', +id);
    if (error) return showToast(error.message, 'error');
    showToast(I18N.t('a.deleted'), 'info'); closeModal('category-modal'); loadCategoriesTab();
  }

  // ===================== PROMOTIONS ======================================
  async function loadPromos() {
    if (!PRODUCTS.length) PRODUCTS = (await sb.from('products').select('*').order('sort_order')).data || [];
    const prodSel = document.querySelector('#promo-form select[name="product_id"]');
    if (prodSel) prodSel.innerHTML = PRODUCTS.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
    const { data } = await sb.from('promotions').select('*').order('created_at', { ascending: false });
    const host = document.getElementById('promo-list');
    host.innerHTML = (data || []).length ? data.map((p) => {
      const target = p.scope === 'all' ? 'All items' : p.scope === 'category' ? catName(p.category_id) : (PRODUCTS.find((x) => x.id === p.product_id)?.name || 'Item');
      return `
      <div class="card p-4 flex items-center justify-between gap-3 ${p.active ? '' : 'opacity-60'}">
        <div><p class="font-bold text-gray-800">${esc(p.name)} — ${p.percent_off}% off</p>
          <p class="text-xs text-gray-400">${esc(target)}${p.ends_at ? ' · ends ' + p.ends_at : ''}${p.active ? '' : ' · Inactive'}</p></div>
        <button class="btn btn-ghost text-sm" data-edit="${p.id}"><span class="icon" data-icon="edit"></span></button>
      </div>`;
    }).join('') : `<p class="text-gray-400">${I18N.t('a.no_promos')}</p>`;
    host.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', async () => {
      const { data: one } = await sb.from('promotions').select('*').eq('id', +b.dataset.edit).single(); openPromo(one);
    }));
    injectIcons(host);
  }
  function promoScopeUI() {
    const v = document.getElementById('promo-scope').value;
    document.getElementById('promo-cat-wrap').classList.toggle('hidden', v !== 'category');
    document.getElementById('promo-prod-wrap').classList.toggle('hidden', v !== 'product');
  }
  function openPromo(p) {
    const f = document.getElementById('promo-form'); f.reset();
    document.getElementById('promo-modal-title').textContent = p ? I18N.t('a.edit_promotion') : I18N.t('a.add_promotion');
    document.getElementById('promo-delete').classList.toggle('hidden', !p);
    f.id.value = p?.id || ''; f.name.value = p?.name || ''; f.percent_off.value = p?.percent_off ?? '';
    f.ends_at.value = p?.ends_at || ''; f.scope.value = p?.scope || 'all';
    if (p?.category_id) f.category_id.value = p.category_id;
    if (p?.product_id) f.product_id.value = p.product_id;
    f.active.value = String(p?.active ?? true);
    promoScopeUI(); openModal('promo-modal');
  }
  async function savePromo(e) {
    e.preventDefault(); if (!(await ensureSession())) return; const f = e.target; const scope = f.scope.value;
    const row = {
      name: f.name.value.trim(), percent_off: +f.percent_off.value, scope,
      category_id: scope === 'category' ? +f.category_id.value : null,
      product_id: scope === 'product' ? +f.product_id.value : null,
      ends_at: f.ends_at.value || null, active: f.active.value === 'true',
    };
    const id = f.id.value;
    const res = id ? await sb.from('promotions').update(row).eq('id', +id) : await sb.from('promotions').insert(row);
    if (res.error) return showToast(res.error.message, 'error');
    showToast(I18N.t('a.saved'), 'success'); closeModal('promo-modal'); loadPromos();
  }
  async function deletePromo() {
    if (!(await ensureSession())) return;
    const id = document.getElementById('promo-form').id.value;
    if (!id || !confirm('Delete this promotion?')) return;
    await sb.from('promotions').delete().eq('id', +id);
    showToast(I18N.t('a.deleted'), 'info'); closeModal('promo-modal'); loadPromos();
  }

  // ===================== COUPONS =========================================
  async function loadCoupons() {
    const { data } = await sb.from('coupons').select('*').order('created_at', { ascending: false });
    const host = document.getElementById('coupon-list');
    host.innerHTML = (data || []).length ? data.map((c) => {
      const val = c.discount_type === 'percent' ? `${c.discount_value}%` : money(c.discount_value);
      return `
      <div class="card p-4 flex items-center justify-between gap-3 ${c.active ? '' : 'opacity-60'}">
        <div><p class="font-bold text-gray-800">${esc(c.code)} — ${val} off</p>
          <p class="text-xs text-gray-400">Min ${money(c.min_subtotal)}${c.expires_at ? ' · exp ' + c.expires_at : ''}${c.active ? '' : ' · Inactive'}</p></div>
        <button class="btn btn-ghost text-sm" data-edit="${c.id}"><span class="icon" data-icon="edit"></span></button>
      </div>`;
    }).join('') : `<p class="text-gray-400">${I18N.t('a.no_coupons')}</p>`;
    host.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', async () => {
      const { data: one } = await sb.from('coupons').select('*').eq('id', +b.dataset.edit).single(); openCoupon(one);
    }));
    injectIcons(host);
  }
  function openCoupon(c) {
    const f = document.getElementById('coupon-form'); f.reset();
    document.getElementById('coupon-modal-title').textContent = c ? I18N.t('a.edit_coupon') : I18N.t('a.add_coupon');
    document.getElementById('coupon-delete').classList.toggle('hidden', !c);
    f.id.value = c?.id || ''; f.code.value = c?.code || ''; f.discount_type.value = c?.discount_type || 'percent';
    f.discount_value.value = c?.discount_value ?? ''; f.min_subtotal.value = c?.min_subtotal ?? 0;
    f.expires_at.value = c?.expires_at || ''; f.active.value = String(c?.active ?? true);
    openModal('coupon-modal');
  }
  async function saveCoupon(e) {
    e.preventDefault(); if (!(await ensureSession())) return; const f = e.target;
    const row = {
      code: f.code.value.trim().toUpperCase(), discount_type: f.discount_type.value,
      discount_value: +f.discount_value.value, min_subtotal: +f.min_subtotal.value || 0,
      expires_at: f.expires_at.value || null, active: f.active.value === 'true',
    };
    const id = f.id.value;
    const res = id ? await sb.from('coupons').update(row).eq('id', +id) : await sb.from('coupons').insert(row);
    if (res.error) return showToast(res.error.message, 'error');
    showToast(I18N.t('a.saved'), 'success'); closeModal('coupon-modal'); loadCoupons();
  }
  async function deleteCoupon() {
    if (!(await ensureSession())) return;
    const id = document.getElementById('coupon-form').id.value;
    if (!id || !confirm('Delete this coupon?')) return;
    await sb.from('coupons').delete().eq('id', +id);
    showToast(I18N.t('a.deleted'), 'info'); closeModal('coupon-modal'); loadCoupons();
  }

  // ===================== ANNOUNCEMENTS ===================================
  async function loadAnnounce() {
    const { data } = await sb.from('announcements').select('*').order('created_at', { ascending: false });
    const host = document.getElementById('announce-list');
    host.innerHTML = (data || []).length ? data.map((a) => `
      <div class="card p-4 flex items-center justify-between gap-3 ${a.active ? '' : 'opacity-60'}">
        <div><p class="font-bold text-gray-800">${esc(a.title)}</p><p class="text-xs text-gray-400">${esc(a.body || '')}${a.active ? '' : ' · Inactive'}</p></div>
        <button class="btn btn-ghost text-sm" data-edit="${a.id}"><span class="icon" data-icon="edit"></span></button>
      </div>`).join('') : `<p class="text-gray-400">${I18N.t('a.no_ann')}</p>`;
    host.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', async () => {
      const { data: one } = await sb.from('announcements').select('*').eq('id', +b.dataset.edit).single(); openAnnounce(one);
    }));
    injectIcons(host);
  }
  function openAnnounce(a) {
    const f = document.getElementById('announce-form'); f.reset();
    document.getElementById('announce-modal-title').textContent = a ? I18N.t('a.edit_announcement') : I18N.t('a.add_announcement');
    document.getElementById('announce-delete').classList.toggle('hidden', !a);
    f.id.value = a?.id || ''; f.title.value = a?.title || ''; f.body.value = a?.body || '';
    f.active.value = String(a?.active ?? true); openModal('announce-modal');
  }
  async function saveAnnounce(e) {
    e.preventDefault(); if (!(await ensureSession())) return; const f = e.target;
    const row = { title: f.title.value.trim(), body: f.body.value.trim() || null, active: f.active.value === 'true' };
    const id = f.id.value;
    const res = id ? await sb.from('announcements').update(row).eq('id', +id) : await sb.from('announcements').insert(row);
    if (res.error) return showToast(res.error.message, 'error');
    showToast(I18N.t('a.saved'), 'success'); closeModal('announce-modal'); loadAnnounce();
  }
  async function deleteAnnounce() {
    if (!(await ensureSession())) return;
    const id = document.getElementById('announce-form').id.value;
    if (!id || !confirm('Delete this announcement?')) return;
    await sb.from('announcements').delete().eq('id', +id);
    showToast(I18N.t('a.deleted'), 'info'); closeModal('announce-modal'); loadAnnounce();
  }

  // ===================== CUSTOMERS =======================================
  async function loadCustomers() {
    const [{ data: profiles }, { data: orders }] = await Promise.all([
      sb.from('profiles').select('*').eq('role', 'customer').order('created_at', { ascending: false }),
      sb.from('orders').select('customer_id,total,status'),
    ]);
    const stats = {};
    (orders || []).forEach((o) => {
      if (!o.customer_id) return;
      stats[o.customer_id] = stats[o.customer_id] || { n: 0, spent: 0 };
      stats[o.customer_id].n++;
      if (o.status !== 'cancelled') stats[o.customer_id].spent += Number(o.total);
    });
    const rows = (profiles || []).map((p) => {
      const s = stats[p.id] || { n: 0, spent: 0 };
      return `<tr class="border-b border-purple-50">
        <td class="py-2.5 px-3 font-medium text-gray-800">${esc(p.full_name || '—')}</td>
        <td class="py-2.5 px-3 text-gray-500">${esc(p.phone || '—')}</td>
        <td class="py-2.5 px-3 text-right">${s.n}</td>
        <td class="py-2.5 px-3 text-right font-semibold">${money(s.spent)}</td>
        <td class="py-2.5 px-3 text-right text-purple-700 font-semibold">${p.loyalty_points || 0}</td>
        <td class="py-2.5 px-3 text-right"><button class="btn btn-ghost text-xs" data-points="${p.id}" data-cur="${p.loyalty_points || 0}">${I18N.t('a.adjust')}</button></td>
      </tr>`;
    }).join('');
    const host = document.getElementById('customer-list');
    host.innerHTML = `
      <div class="overflow-x-auto"><table class="w-full text-sm min-w-[520px]">
        <thead class="bg-purple-50 text-gray-500 text-xs uppercase">
          <tr><th class="py-2 px-3 text-left">${I18N.t('a.c_name')}</th><th class="py-2 px-3 text-left">${I18N.t('a.c_phone')}</th>
          <th class="py-2 px-3 text-right">${I18N.t('a.c_orders')}</th><th class="py-2 px-3 text-right">${I18N.t('a.c_spent')}</th>
          <th class="py-2 px-3 text-right">${I18N.t('a.c_points')}</th><th class="py-2 px-3 text-right">${I18N.t('a.c_action')}</th></tr>
        </thead>
        <tbody>${rows || ('<tr><td class="py-6 px-3 text-gray-400" colspan="6">' + I18N.t('a.no_customers') + '</td></tr>')}</tbody>
      </table></div>`;
    host.querySelectorAll('[data-points]').forEach((b) => b.addEventListener('click', async () => {
      const v = prompt(I18N.t('a.set_points'), b.dataset.cur);
      if (v === null) return;
      const n = parseInt(v, 10); if (isNaN(n) || n < 0) return showToast('Enter a valid number', 'error');
      if (!(await ensureSession())) return;
      const { error } = await sb.from('profiles').update({ loyalty_points: n }).eq('id', b.dataset.points);
      if (error) return showToast(error.message, 'error');
      showToast(I18N.t('a.points_updated'), 'success'); loadCustomers();
    }));
  }

  // ===================== ANALYTICS =======================================
  async function loadAnalytics() {
    const [{ data: orders }, { data: items }, { count: custCount }] = await Promise.all([
      sb.from('orders').select('total,status,created_at,rating'),
      sb.from('order_items').select('product_name,quantity,line_total'),
      sb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    ]);
    const rated = (orders || []).filter((o) => o.rating);
    document.getElementById('an-rating').textContent = rated.length
      ? (rated.reduce((s, o) => s + o.rating, 0) / rated.length).toFixed(1) + '/5' : '—';
    const valid = (orders || []).filter((o) => o.status !== 'cancelled');
    const revenue = valid.reduce((s, o) => s + Number(o.total), 0);
    document.getElementById('an-orders').textContent = (orders || []).length;
    document.getElementById('an-revenue').textContent = money(revenue);
    document.getElementById('an-avg').textContent = money(valid.length ? revenue / valid.length : 0);
    document.getElementById('an-customers').textContent = custCount || 0;

    // revenue last 14 days
    const days = [];
    for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d.toISOString().slice(0, 10)); }
    const byDay = {}; valid.forEach((o) => { const d = o.created_at.slice(0, 10); byDay[d] = (byDay[d] || 0) + Number(o.total); });
    const max = Math.max(1, ...days.map((d) => byDay[d] || 0));
    document.getElementById('an-revchart').innerHTML = days.map((d) => {
      const v = byDay[d] || 0; const w = Math.round((v / max) * 100);
      return `<div class="flex items-center gap-2 text-xs">
        <span class="w-12 text-gray-400">${d.slice(5)}</span>
        <div class="flex-1 bg-purple-50 rounded h-3"><div class="brand-gradient h-3 rounded" style="width:${w}%"></div></div>
        <span class="w-16 text-right text-gray-600">${money(v)}</span></div>`;
    }).join('');

    // top sellers
    const top = {}; (items || []).forEach((i) => { top[i.product_name] = (top[i.product_name] || 0) + i.quantity; });
    const sorted = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 8);
    document.getElementById('an-top').innerHTML = sorted.length ? sorted.map(([n, q], idx) =>
      `<div class="flex items-center gap-2 text-sm"><span class="w-5 text-gray-400">${idx + 1}.</span>
       <span class="flex-1 truncate">${esc(n)}</span><span class="font-bold text-purple-700">${q}</span></div>`).join('')
      : `<p class="text-gray-400 text-sm">${I18N.t('a.nosales')}</p>`;
  }

  // ===================== SETTINGS ========================================
  async function loadSettings() {
    const { data } = await sb.from('settings').select('*');
    const map = {}; (data || []).forEach((r) => (map[r.key] = r.value));
    const f = document.getElementById('settings-form');
    ['shop_name', 'shop_tagline', 'address', 'hours', 'whatsapp', 'delivery_fee', 'free_delivery_over', 'bank_details']
      .forEach((k) => { if (f[k]) f[k].value = map[k] ?? ''; });
  }
  async function saveSettings(e) {
    e.preventDefault(); if (!(await ensureSession())) return; const f = e.target;
    const keys = ['shop_name', 'shop_tagline', 'address', 'hours', 'whatsapp', 'delivery_fee', 'free_delivery_over', 'bank_details'];
    const rows = keys.map((k) => ({ key: k, value: f[k].value.trim(), updated_at: new Date().toISOString() }));
    const { error } = await sb.from('settings').upsert(rows, { onConflict: 'key' });
    if (error) return showToast(error.message, 'error');
    showToast(I18N.t('a.settings_saved'), 'success');
  }

  // ===================== TABS ============================================
  const LOADERS = {
    orders: loadOrders, menu: loadMenu, categories: loadCategoriesTab, promotions: loadPromos,
    coupons: loadCoupons, payments: loadPayments, announcements: loadAnnounce, customers: loadCustomers,
    analytics: loadAnalytics, settings: loadSettings,
  };
  function switchTab(tab) {
    document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('#dashboard > section').forEach((s) => s.classList.add('hidden'));
    document.getElementById('tab-' + tab).classList.remove('hidden');
    if (!loaded[tab]) { LOADERS[tab](); loaded[tab] = true; } else if (tab === 'orders') loadOrders();
  }

  // ---- wiring -------------------------------------------------------------
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('admin-login-form').addEventListener('submit', login);
    document.getElementById('admin-logout').addEventListener('click', async () => { await sb.auth.signOut(); showLogin(); });
    document.getElementById('shop-toggle').addEventListener('click', toggleShop);
    document.getElementById('lang-toggle')?.addEventListener('click', () => I18N.toggle());
    document.addEventListener('lang:changed', () => {
      if (document.getElementById('dashboard').classList.contains('hidden')) return;
      renderShopStatus();
      const active = document.querySelector('[data-tab].active')?.dataset.tab;
      if (active && LOADERS[active]) LOADERS[active]();
    });
    document.getElementById('refresh-orders').addEventListener('click', loadOrders);
    document.getElementById('filter-status').addEventListener('change', loadOrders);
    document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

    // menu
    document.getElementById('add-product').addEventListener('click', () => openProduct(null));
    document.getElementById('product-close').addEventListener('click', () => closeModal('product-modal'));
    document.getElementById('product-form').addEventListener('submit', saveProduct);
    document.getElementById('product-delete').addEventListener('click', deleteProduct);
    document.getElementById('product-photo-file').addEventListener('change', uploadProductPhoto);
    // categories
    document.getElementById('add-category').addEventListener('click', () => openCategory(null));
    document.getElementById('category-close').addEventListener('click', () => closeModal('category-modal'));
    document.getElementById('category-form').addEventListener('submit', saveCategory);
    document.getElementById('category-delete').addEventListener('click', deleteCategory);
    // promotions
    document.getElementById('add-promo').addEventListener('click', () => openPromo(null));
    document.getElementById('promo-close').addEventListener('click', () => closeModal('promo-modal'));
    document.getElementById('promo-form').addEventListener('submit', savePromo);
    document.getElementById('promo-delete').addEventListener('click', deletePromo);
    document.getElementById('promo-scope').addEventListener('change', promoScopeUI);
    // coupons
    document.getElementById('add-coupon').addEventListener('click', () => openCoupon(null));
    document.getElementById('coupon-close').addEventListener('click', () => closeModal('coupon-modal'));
    document.getElementById('coupon-form').addEventListener('submit', saveCoupon);
    document.getElementById('coupon-delete').addEventListener('click', deleteCoupon);
    // announcements
    document.getElementById('add-announce').addEventListener('click', () => openAnnounce(null));
    document.getElementById('announce-close').addEventListener('click', () => closeModal('announce-modal'));
    document.getElementById('announce-form').addEventListener('submit', saveAnnounce);
    document.getElementById('announce-delete').addEventListener('click', deleteAnnounce);
    // settings
    document.getElementById('settings-form').addEventListener('submit', saveSettings);

    init();
  });
})();
