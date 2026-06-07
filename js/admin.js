/**
 * Admin dashboard: gated by an admin profile. Manage orders & menu items.
 */
(function () {
  const cfg = window.TRR_CONFIG;
  let CATEGORIES = [];
  const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'completed'];

  document.querySelectorAll('[data-shop-name]').forEach((el) => (el.textContent = cfg.SHOP_NAME));

  // ---- auth gate ----------------------------------------------------------
  async function init() {
    if (!window.TRR_CONFIGURED) {
      document.getElementById('config-warning').classList.remove('hidden');
      return;
    }
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
    await Promise.all([loadOrders(), loadMenu()]);
  }

  async function login(e) {
    e.preventDefault();
    const f = e.target;
    const { error } = await sb.auth.signInWithPassword({
      email: f.email.value.trim(),
      password: f.password.value,
    });
    if (error) return showToast(error.message, 'error');
    const profile = await getProfile();
    if (!profile || profile.role !== 'admin') {
      await sb.auth.signOut();
      return showToast('This account is not an admin.', 'error');
    }
    showDashboard();
  }

  // ---- categories ---------------------------------------------------------
  async function loadCategories() {
    const { data } = await sb.from('categories').select('*').order('sort_order');
    CATEGORIES = data || [];
    const sel = document.querySelector('#product-form select[name="category_id"]');
    if (sel) sel.innerHTML = CATEGORIES.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
  }
  const catName = (id) => (CATEGORIES.find((c) => c.id === id) || {}).name || '—';

  // ---- orders -------------------------------------------------------------
  async function loadOrders() {
    const status = document.getElementById('filter-status').value;
    let q = sb.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(100);
    if (status) q = q.eq('status', status);
    const { data: orders, error } = await q;
    if (error) return showToast(error.message, 'error');
    renderStats(orders || []);
    renderOrders(orders || []);
  }

  function renderStats(orders) {
    const today = new Date().toISOString().slice(0, 10);
    const todays = orders.filter((o) => o.created_at.slice(0, 10) === today);
    const active = (s) => orders.filter((o) => o.status === s).length;
    const sales = todays
      .filter((o) => o.status !== 'cancelled')
      .reduce((s, o) => s + Number(o.total), 0);
    document.getElementById('stat-today').textContent = todays.length;
    document.getElementById('stat-pending').textContent = active('pending');
    document.getElementById('stat-preparing').textContent = active('preparing');
    document.getElementById('stat-sales').textContent = money(sales);
  }

  function renderOrders(orders) {
    const host = document.getElementById('orders-list');
    if (!orders.length) {
      host.innerHTML = `<p class="text-center text-gray-400 py-10">No orders yet.</p>`;
      return;
    }
    host.innerHTML = orders
      .map((o) => {
        const items = (o.order_items || [])
          .map((i) => `<li>${i.quantity}× ${i.product_name} <span class="text-gray-400">${money(i.line_total)}</span></li>`)
          .join('');
        const time = new Date(o.created_at).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' });
        const nextIdx = STATUS_FLOW.indexOf(o.status);
        const next = nextIdx >= 0 && nextIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[nextIdx + 1] : null;
        return `
        <div class="card p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-extrabold text-gray-800">${o.order_number}</p>
              <p class="text-xs text-gray-400">${time}</p>
            </div>
            <span class="badge badge-${o.status}">${o.status}</span>
          </div>
          <ul class="text-sm text-gray-600 mt-3 space-y-0.5">${items}</ul>
          <div class="text-sm mt-3 pt-3 border-t border-purple-50 grid grid-cols-2 gap-x-3 gap-y-1">
            <span class="text-gray-400">Customer</span><span class="text-right font-medium">${o.customer_name}</span>
            <span class="text-gray-400">Phone</span><span class="text-right">${o.customer_phone}</span>
            <span class="text-gray-400">Type</span><span class="text-right capitalize">${o.fulfillment_type}</span>
            ${o.address ? `<span class="text-gray-400">Address</span><span class="text-right">${o.address}</span>` : ''}
            ${o.notes ? `<span class="text-gray-400">Notes</span><span class="text-right">${o.notes}</span>` : ''}
            <span class="text-gray-400">Payment</span><span class="text-right capitalize">${o.payment_method}</span>
            <span class="text-gray-400 font-bold">Total</span><span class="text-right font-extrabold brand-gradient-text">${money(o.total)}</span>
          </div>
          <div class="flex gap-2 mt-3">
            ${next ? `<button class="btn btn-primary text-sm flex-1" data-advance="${o.id}" data-next="${next}">Mark ${next}</button>` : ''}
            ${o.status !== 'cancelled' && o.status !== 'completed'
              ? `<button class="btn btn-ghost !text-red-600 !bg-red-50 text-sm" data-cancel="${o.id}">Cancel</button>` : ''}
          </div>
        </div>`;
      })
      .join('');

    host.querySelectorAll('[data-advance]').forEach((b) =>
      b.addEventListener('click', () => updateStatus(Number(b.dataset.advance), b.dataset.next)));
    host.querySelectorAll('[data-cancel]').forEach((b) =>
      b.addEventListener('click', () => { if (confirm('Cancel this order?')) updateStatus(Number(b.dataset.cancel), 'cancelled'); }));
  }

  async function updateStatus(id, status) {
    const { error } = await sb.from('orders').update({ status }).eq('id', id);
    if (error) return showToast(error.message, 'error');
    showToast(`Order marked ${status}`, 'success');
    loadOrders();
  }

  // ---- menu management ----------------------------------------------------
  async function loadMenu() {
    const { data } = await sb.from('products').select('*').order('sort_order');
    const host = document.getElementById('menu-list');
    host.innerHTML = (data || [])
      .map((p) => `
        <div class="card p-4 flex items-center justify-between gap-3 ${p.available ? '' : 'opacity-60'}">
          <div class="min-w-0">
            <p class="font-bold text-gray-800 truncate">${p.name}</p>
            <p class="text-xs text-gray-400">${catName(p.category_id)} · ${money(p.price)} ${p.available ? '' : '· Sold out'}</p>
          </div>
          <button class="btn btn-ghost text-sm" data-edit='${JSON.stringify(p).replace(/'/g, "&#39;")}'>Edit</button>
        </div>`)
      .join('');
    host.querySelectorAll('[data-edit]').forEach((b) =>
      b.addEventListener('click', () => openProduct(JSON.parse(b.dataset.edit.replace(/&#39;/g, "'")))));
  }

  function openProduct(p) {
    const f = document.getElementById('product-form');
    f.reset();
    document.getElementById('product-modal-title').textContent = p ? 'Edit item' : 'Add item';
    document.getElementById('product-delete').classList.toggle('hidden', !p);
    f.id.value = p?.id || '';
    f.name.value = p?.name || '';
    f.category_id.value = p?.category_id || (CATEGORIES[0]?.id ?? '');
    f.description.value = p?.description || '';
    f.price.value = p?.price ?? '';
    f.available.value = String(p?.available ?? true);
    f.image_url.value = p?.image_url || '';
    document.getElementById('product-modal').classList.add('open');
  }
  const closeProduct = () => document.getElementById('product-modal').classList.remove('open');

  async function saveProduct(e) {
    e.preventDefault();
    const f = e.target;
    const row = {
      name: f.name.value.trim(),
      category_id: Number(f.category_id.value),
      description: f.description.value.trim(),
      price: Number(f.price.value),
      available: f.available.value === 'true',
      image_url: f.image_url.value.trim() || null,
    };
    const id = f.id.value;
    const res = id
      ? await sb.from('products').update(row).eq('id', Number(id))
      : await sb.from('products').insert(row);
    if (res.error) return showToast(res.error.message, 'error');
    showToast('Saved', 'success');
    closeProduct();
    loadMenu();
  }

  async function deleteProduct() {
    const id = document.getElementById('product-form').id.value;
    if (!id || !confirm('Delete this item?')) return;
    const { error } = await sb.from('products').delete().eq('id', Number(id));
    if (error) return showToast(error.message, 'error');
    showToast('Deleted', 'info');
    closeProduct();
    loadMenu();
  }

  // ---- tabs & wiring ------------------------------------------------------
  function switchTab(tab) {
    document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    document.getElementById('tab-orders').classList.toggle('hidden', tab !== 'orders');
    document.getElementById('tab-menu').classList.toggle('hidden', tab !== 'menu');
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('admin-login-form').addEventListener('submit', login);
    document.getElementById('admin-logout').addEventListener('click', async () => { await sb.auth.signOut(); showLogin(); });
    document.getElementById('refresh-orders').addEventListener('click', loadOrders);
    document.getElementById('filter-status').addEventListener('change', loadOrders);
    document.getElementById('add-product').addEventListener('click', () => openProduct(null));
    document.getElementById('product-close').addEventListener('click', closeProduct);
    document.getElementById('product-form').addEventListener('submit', saveProduct);
    document.getElementById('product-delete').addEventListener('click', deleteProduct);
    document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));
    init();
  });
})();
