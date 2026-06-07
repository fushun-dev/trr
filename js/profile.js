/**
 * My Profile page: user details (editable name/phone), loyalty tier + points,
 * and full order history with rating for completed orders.
 */
(function () {
  const TIERS = [
    { name: 'Bronze', min: 0 }, { name: 'Silver', min: 200 },
    { name: 'Gold', min: 500 }, { name: 'Platinum', min: 1000 },
  ];
  function tierFor(points) {
    let t = TIERS[0];
    for (const x of TIERS) if (points >= x.min) t = x;
    return { tier: t, next: TIERS.find((x) => x.min > points) };
  }
  const STATUS_DOT = {
    pending: 'bg-red-500', confirmed: 'bg-blue-500', preparing: 'bg-purple-500',
    ready: 'bg-emerald-500', completed: 'bg-gray-400', cancelled: 'bg-gray-300',
  };
  const statusChip = (s) =>
    `<span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full ${STATUS_DOT[s] || 'bg-gray-300'}"></span><span class="badge badge-${s}">${I18N.t('status.' + s)}</span></span>`;
  const stars = (n) =>
    Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'text-amber-400' : 'text-gray-300'}">${ICON('sparkle')}</span>`).join('');
  const rateButtons = (id) =>
    `<span class="text-gray-400 mr-1">${I18N.t('acct.rate')}</span>` +
    Array.from({ length: 5 }, (_, i) =>
      `<button class="text-gray-300 hover:text-amber-400" data-rate="${i + 1}" data-order="${id}">${ICON('sparkle')}</button>`).join('');

  let profile = null;

  async function load() {
    if (!window.TRR_CONFIGURED || !window.sb) { window.location.href = 'index.html'; return; }
    const session = await getSession();
    if (!session) { document.getElementById('gate').classList.remove('hidden'); return; }
    profile = await getProfile();
    document.getElementById('content').classList.remove('hidden');
    renderDetails(session);
    renderLoyalty();
    renderHistory();
  }

  function renderDetails(session) {
    const f = document.getElementById('details-form');
    f.full_name.value = profile.full_name || '';
    f.phone.value = profile.phone || '';
    document.getElementById('email').textContent = session.user.email || '—';
    document.getElementById('since').textContent = new Date(profile.created_at).toLocaleDateString('en-MY', { dateStyle: 'medium' });
  }

  async function saveDetails(e) {
    e.preventDefault();
    const f = e.target;
    const { error } = await sb.from('profiles').update({
      full_name: f.full_name.value.trim(), phone: f.phone.value.trim(),
    }).eq('id', profile.id);
    if (error) return showToast(error.message, 'error');
    profile.full_name = f.full_name.value.trim();
    showToast(I18N.t('prof.saved'), 'success');
  }

  function renderLoyalty() {
    const pts = profile.loyalty_points || 0;
    const { tier, next } = tierFor(pts);
    const toNext = next ? next.min - pts : 0;
    document.getElementById('loyalty').innerHTML = `
      <div class="flex items-center justify-between">
        <div><p class="text-white/80 text-xs">${I18N.t('acct.points')}</p><p class="text-3xl font-extrabold">${pts}</p></div>
        <div class="text-right"><p class="text-white/80 text-xs">${I18N.t('acct.tier')}</p><p class="text-xl font-extrabold">${tier.name}</p></div>
      </div>
      ${next ? `<p class="text-white/80 text-xs mt-3">${toNext} ${I18N.t('acct.tonext')} ${next.name}</p>` : `<p class="text-white/80 text-xs mt-3">${I18N.t('acct.top')}</p>`}`;
  }

  async function renderHistory() {
    const host = document.getElementById('history');
    const { data: orders } = await sb
      .from('orders').select('*, order_items(product_name,quantity)')
      .eq('customer_id', profile.id).order('created_at', { ascending: false }).limit(100);
    if (!orders || !orders.length) { host.innerHTML = `<p class="text-center text-gray-400 py-6">${I18N.t('prof.empty')}</p>`; return; }
    host.innerHTML = orders.map((o) => {
      const items = (o.order_items || []).map((i) => `${i.quantity}× ${i.product_name}`).join(', ');
      const paid = o.payment_status === 'paid';
      const canRate = o.status === 'completed' && !o.rating;
      const rate = o.rating ? stars(o.rating) : (canRate ? rateButtons(o.id) : '');
      const time = new Date(o.created_at).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' });
      return `
        <div class="border border-purple-50 rounded-xl p-3 mb-2 ord-${o.status}">
          <div class="flex items-center justify-between">
            <span class="font-bold text-gray-800 text-sm">${o.order_number}</span>
            ${statusChip(o.status)}
          </div>
          <p class="text-xs text-purple-600 mt-0.5">${I18N.t('sdesc.' + o.status)}</p>
          <p class="text-[11px] text-gray-400">${time}</p>
          <p class="text-xs text-gray-500 mt-1">${items}</p>
          <div class="flex items-center justify-between mt-2">
            <span class="text-sm font-extrabold brand-gradient-text">${money(o.total)}</span>
            <span class="text-xs">${rate}</span>
          </div>
          <p class="text-xs mt-1 ${paid ? 'text-emerald-600' : 'text-amber-600'}">${paid ? I18N.t('a.paid') : I18N.t('a.unpaid')}</p>
        </div>`;
    }).join('');
    host.querySelectorAll('[data-rate]').forEach((b) =>
      b.addEventListener('click', async () => {
        const { error } = await sb.rpc('rate_order', { p_order_id: +b.dataset.order, p_rating: +b.dataset.rate });
        if (error) return showToast(error.message, 'error');
        showToast('Thanks for rating!', 'success'); renderHistory();
      }));
    injectIcons(host);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-shop-name]').forEach((el) => (el.textContent = (window.TRR_CONFIG || {}).SHOP_NAME || el.textContent));
    document.getElementById('lang-toggle')?.addEventListener('click', () => I18N.toggle());
    document.getElementById('details-form')?.addEventListener('submit', saveDetails);
    document.getElementById('logout-btn')?.addEventListener('click', async () => { if (sb) await sb.auth.signOut(); window.location.href = 'index.html'; });
    load();
  });
})();
