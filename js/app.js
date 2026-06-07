/**
 * Storefront logic: menu, promotions, announcements, cart, coupons, and
 * sign-in-required checkout with self/recipient handling.
 */
(function () {
  const cfg = window.TRR_CONFIG;
  let CATEGORIES = [];
  let PRODUCTS = [];
  let PROMOS = [];
  let activeCat = 'all';
  let appliedCoupon = null; // { code, discount }

  // Demo menu shown only when Supabase isn't configured (previewable).
  const DEMO = {
    categories: [
      { id: 1, name: "Today's Special 今日菜单" },
      { id: 2, name: 'Rice Rolls 台湾紫米饭团' },
      { id: 3, name: 'Vegetarian 素台湾紫米饭团' },
      { id: 4, name: 'Burrito Wrap 墨西哥卷' },
      { id: 5, name: 'Kefir Yogurt 开菲尔酸奶' },
      { id: 6, name: 'Drinks 饮料' },
      { id: 7, name: 'Snacks 小吃' },
    ],
    products: [
      { id: 1, category_id: 1, name: 'Sour Vege Duck Rice Roll 酸菜鸭肉紫米饭团', price: 22.0, available: true },
      { id: 2, category_id: 1, name: 'Orleans Chicken Rice Roll 奥尔良鸡排紫米饭团', price: 19.9, available: true },
      { id: 3, category_id: 2, name: 'Dinosaur Rice Roll 恐龙紫米饭团', price: 43.9, available: true },
      { id: 4, category_id: 2, name: 'Big Beef Rice Roll 大牛紫米饭团', price: 22.9, available: true },
      { id: 5, category_id: 2, name: 'Salted Egg Yolk Chicken 咸蛋黄鸡肉紫米饭团', price: 21.9, available: true },
      { id: 6, category_id: 2, name: 'Smoked Duck Rice Roll 烟熏鸭肉饭团', price: 19.9, available: true },
      { id: 7, category_id: 3, name: 'Vegetarian Meat Rice Roll 素三层肉紫米饭团', price: 19.9, available: true },
      { id: 8, category_id: 3, name: 'Salad Vegetable Rice Roll 沙拉蔬菜饭团', price: 16.9, available: true },
      { id: 9, category_id: 4, name: 'Ham Cheesy Burrito 火腿蛋蛋卷', price: 19.9, available: true },
      { id: 10, category_id: 5, name: 'Mango Kefir 芒果开菲尔', price: 15.9, available: true },
      { id: 11, category_id: 6, name: 'Mango Ice Tea 芒果茉莉冰茶', price: 12.9, available: true },
      { id: 12, category_id: 7, name: 'Jasmine Herbal Egg 茉莉花茶叶蛋', price: 5.0, available: true },
    ],
  };

  // ---- pricing (sale_price + promotions) ----------------------------------
  function effectivePrice(p) {
    let best = Number(p.price);
    if (p.sale_price != null && Number(p.sale_price) > 0 && Number(p.sale_price) < best) best = Number(p.sale_price);
    const now = new Date();
    for (const pr of PROMOS) {
      if (!pr.active) continue;
      if (pr.ends_at && new Date(pr.ends_at + 'T23:59:59') < now) continue;
      const applies =
        pr.scope === 'all' ||
        (pr.scope === 'category' && pr.category_id === p.category_id) ||
        (pr.scope === 'product' && pr.product_id === p.id);
      if (applies) {
        const disc = Number(p.price) * (1 - pr.percent_off / 100);
        if (disc < best) best = disc;
      }
    }
    return Math.round(best * 100) / 100;
  }

  // Pull live shop settings from the DB and let them override config.js defaults.
  async function loadSettings() {
    const { data } = await sb.from('settings').select('*');
    if (!data) return;
    const m = {}; data.forEach((r) => (m[r.key] = r.value));
    if (m.shop_name) cfg.SHOP_NAME = m.shop_name;
    if (m.shop_tagline) cfg.SHOP_TAGLINE = m.shop_tagline;
    if (m.whatsapp) cfg.WHATSAPP = m.whatsapp.replace(/[^0-9]/g, '');
    if (m.delivery_fee) cfg.DELIVERY_FEE = Number(m.delivery_fee);
    if (m.free_delivery_over) cfg.FREE_DELIVERY_OVER = Number(m.free_delivery_over);
    window.SHOP_OPEN = m.shop_open !== 'false';
    document.querySelectorAll('[data-shop-name]').forEach((el) => (el.textContent = cfg.SHOP_NAME));
    document.querySelectorAll('[data-shop-tagline]').forEach((el) => (el.textContent = cfg.SHOP_TAGLINE));
    applyShopStatus();
  }
  function applyShopStatus() {
    const closed = window.SHOP_OPEN === false;
    const bar = document.getElementById('closed-banner');
    if (bar) {
      bar.textContent = closed ? I18N.t('shop.closed_banner') : '';
      bar.classList.toggle('hidden', !closed);
    }
    const pill = document.getElementById('header-shop-status');
    if (pill) {
      pill.className = 'inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ' + (closed ? 'status-closed' : 'status-open');
      pill.innerHTML = `<span class="w-2 h-2 rounded-full ${closed ? 'bg-red-500 dot-pulse' : 'bg-emerald-500'}"></span> ${closed ? I18N.t('hdr.closed') : I18N.t('hdr.open')}`;
    }
  }
  window.openGuide = () => document.getElementById('guide-modal').classList.add('open');
  window.closeGuide = () => document.getElementById('guide-modal').classList.remove('open');

  async function loadMenu() {
    if (window.TRR_CONFIGURED && window.sb) {
      const [{ data: cats }, { data: prods }, { data: promos }] = await Promise.all([
        sb.from('categories').select('*').eq('active', true).order('sort_order'),
        sb.from('products').select('*').order('sort_order'),
        sb.from('promotions').select('*').eq('active', true),
      ]);
      CATEGORIES = cats || [];
      PRODUCTS = prods || [];
      PROMOS = promos || [];
      loadSettings();
      loadAnnouncements();
    } else {
      CATEGORIES = DEMO.categories;
      PRODUCTS = DEMO.products;
      document.getElementById('demo-banner')?.classList.remove('hidden');
    }
    renderCategories();
    renderProducts();
  }

  async function loadAnnouncements() {
    const { data } = await sb.from('announcements').select('*').eq('active', true).order('created_at', { ascending: false });
    const bar = document.getElementById('announce-bar');
    if (!bar || !data || !data.length) return;
    const a = data[0];
    bar.className = 'brand-gradient text-white text-sm text-center py-2 px-4';
    bar.innerHTML = `<span class="font-semibold">${a.title}</span>${a.body ? ' — ' + a.body : ''}`;
  }

  function renderCategories() {
    const host = document.getElementById('category-chips');
    if (!host) return;
    const chips = [{ id: 'all', name: I18N.t('menu.all') }, ...CATEGORIES];
    host.innerHTML = chips
      .map((c) => `<button class="chip ${activeCat === c.id ? 'active' : ''}" data-cat="${c.id}">${c.name}</button>`)
      .join('');
    host.querySelectorAll('.chip').forEach((el) =>
      el.addEventListener('click', () => {
        activeCat = el.dataset.cat === 'all' ? 'all' : Number(el.dataset.cat);
        renderCategories();
        renderProducts();
      })
    );
  }

  function renderProducts() {
    const host = document.getElementById('product-grid');
    if (!host) return;
    const list = PRODUCTS.filter((p) => activeCat === 'all' || p.category_id === activeCat);
    if (!list.length) {
      host.innerHTML = `<p class="text-center text-gray-400 col-span-full py-10">${I18N.t('menu.empty')}</p>`;
      return;
    }
    host.innerHTML = list
      .map((p) => {
        const sold = !p.available;
        const eff = effectivePrice(p);
        const onSale = eff < Number(p.price);
        const img = p.image_url
          ? `<img src="${p.image_url}" alt="${p.name}" class="w-full h-40 object-cover rounded-t-2xl" loading="lazy">`
          : `<div class="thumb-fallback w-full h-40 rounded-t-2xl text-white">${ICON('roll')}</div>`;
        const priceHtml = onSale
          ? `<span class="font-extrabold brand-gradient-text text-lg">${money(eff)}</span>
             <span class="text-xs text-gray-400 line-through ml-1">${money(p.price)}</span>`
          : `<span class="font-extrabold brand-gradient-text text-lg">${money(eff)}</span>`;
        return `
          <div class="card overflow-hidden flex flex-col ${sold ? 'opacity-60' : ''}">
            <div class="relative">${img}${onSale ? `<span class="badge badge-ready absolute top-2 left-2">${I18N.t('menu.sale')}</span>` : ''}</div>
            <div class="p-4 flex flex-col flex-1">
              <h3 class="font-bold text-gray-800 leading-snug">${p.name}</h3>
              <p class="text-sm text-gray-500 mt-1 flex-1">${p.description || ''}</p>
              <div class="flex items-center justify-between mt-3 gap-2">
                <div>${priceHtml}</div>
                ${sold
                  ? `<span class="badge badge-cancelled">${I18N.t('menu.soldout')}</span>`
                  : `<button class="btn btn-primary text-sm shrink-0" data-add="${p.id}"><span class="icon" data-icon="plus"></span> ${I18N.t('menu.add')}</button>`}
              </div>
            </div>
          </div>`;
      })
      .join('');
    host.querySelectorAll('[data-add]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const p = PRODUCTS.find((x) => x.id === Number(btn.dataset.add));
        Cart.add({ id: p.id, name: p.name, price: effectivePrice(p) });
        showToast(I18N.t('toast.added'), 'success');
      })
    );
    injectIcons(host);
  }

  // ---- cart drawer --------------------------------------------------------
  function renderCart() {
    const items = Cart.items();
    const body = document.getElementById('cart-body');
    const footer = document.getElementById('cart-footer');
    const badge = document.getElementById('cart-count');
    const fabCount = document.getElementById('fab-count');
    if (badge) badge.textContent = Cart.count();
    if (fabCount) {
      fabCount.textContent = Cart.count();
      fabCount.style.display = Cart.count() ? 'flex' : 'none';
    }
    if (!body) return;

    if (!items.length) {
      body.innerHTML = `<div class="text-center text-gray-300 py-16">
        <div class="text-5xl mb-3 flex justify-center">${ICON('cart')}</div>
        <p class="text-gray-400">${I18N.t('cart.empty')}</p></div>`;
      footer?.classList.add('hidden');
      injectIcons(body);
      return;
    }
    body.innerHTML = items
      .map(
        (i) => `
        <div class="flex items-center gap-3 py-3 border-b border-purple-50">
          <div class="thumb-fallback w-12 h-12 rounded-lg text-white text-xl shrink-0">${ICON('roll')}</div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-sm text-gray-800 truncate">${i.name}</p>
            <p class="text-xs text-gray-500">${money(i.price)}</p>
          </div>
          <div class="flex items-center gap-1.5">
            <button class="btn btn-ghost px-2 py-1" data-dec="${i.id}"><span class="icon" data-icon="minus"></span></button>
            <span class="w-6 text-center font-semibold">${i.qty}</span>
            <button class="btn btn-ghost px-2 py-1" data-inc="${i.id}"><span class="icon" data-icon="plus"></span></button>
          </div>
        </div>`
      )
      .join('');
    body.querySelectorAll('[data-inc]').forEach((b) =>
      b.addEventListener('click', () => Cart.setQty(Number(b.dataset.inc), qtyOf(b.dataset.inc) + 1)));
    body.querySelectorAll('[data-dec]').forEach((b) =>
      b.addEventListener('click', () => Cart.setQty(Number(b.dataset.dec), qtyOf(b.dataset.dec) - 1)));

    if (footer) {
      footer.classList.remove('hidden');
      document.getElementById('cart-subtotal').textContent = money(Cart.subtotal());
    }
    injectIcons(body);
  }
  const qtyOf = (id) => (Cart.items().find((i) => i.id === Number(id)) || { qty: 0 }).qty;

  function openCart() {
    document.getElementById('cart-drawer').classList.add('open');
    document.getElementById('drawer-backdrop').classList.add('open');
    document.body.classList.add('no-scroll');
  }
  function closeCart() {
    document.getElementById('cart-drawer').classList.remove('open');
    document.getElementById('drawer-backdrop').classList.remove('open');
    document.body.classList.remove('no-scroll');
    closeCheckout();
  }
  window.openCart = openCart;
  window.closeCart = closeCart;

  // ---- checkout (sign-in required) ----------------------------------------
  async function openCheckout() {
    if (window.SHOP_OPEN === false) return showToast(I18N.t('toast.closed'), 'error');
    if (!Cart.count()) return showToast(I18N.t('toast.empty'), 'error');

    // Strictly require a signed-up, signed-in user before ordering.
    if (window.TRR_CONFIGURED) {
      const profile = await getProfile();
      if (!profile) {
        showToast(I18N.t('toast.signin'), 'info');
        openAuth(true); // open auth with the "required to order" hint
        return;
      }
      // Prefill self contact from the account.
      const form = document.getElementById('checkout-form');
      if (!form.name.value) form.name.value = profile.full_name || '';
      if (!form.phone.value) form.phone.value = profile.phone || '';
    }
    applyForSelfToggle();
    refreshCheckoutTotals();
    document.getElementById('checkout-modal').classList.add('open');
  }
  function closeCheckout() {
    document.getElementById('checkout-modal')?.classList.remove('open');
  }
  window.openCheckout = openCheckout;
  window.closeCheckout = closeCheckout;

  function applyForSelfToggle() {
    const forSelf = document.getElementById('for-self').checked;
    document.getElementById('recipient-wrap').classList.toggle('hidden', forSelf);
  }

  function deliveryFee(type) {
    if (type !== 'delivery') return 0;
    return Cart.subtotal() - couponDiscount() >= (cfg.FREE_DELIVERY_OVER || Infinity)
      ? 0 : Number(cfg.DELIVERY_FEE || 0);
  }
  const couponDiscount = () => (appliedCoupon ? appliedCoupon.discount : 0);

  function refreshCheckoutTotals() {
    const type = document.querySelector('input[name="fulfillment"]:checked')?.value || 'pickup';
    document.getElementById('address-wrap')?.classList.toggle('hidden', type !== 'delivery');
    const subtotal = Cart.subtotal();
    const disc = Math.min(couponDiscount(), subtotal);
    const fee = deliveryFee(type);
    document.getElementById('co-subtotal').textContent = money(subtotal);
    const dRow = document.getElementById('co-discount-row');
    if (disc > 0) { dRow.classList.remove('hidden'); document.getElementById('co-discount').textContent = '- ' + money(disc); }
    else dRow.classList.add('hidden');
    document.getElementById('co-delivery').textContent = fee ? money(fee) : 'Free';
    document.getElementById('co-total').textContent = money(subtotal - disc + fee);
  }

  async function applyCoupon() {
    const input = document.getElementById('coupon-input');
    const msg = document.getElementById('coupon-msg');
    const code = input.value.trim().toUpperCase();
    if (!code) return;
    if (!window.TRR_CONFIGURED) { msg.textContent = 'Coupons need Supabase configured.'; msg.className = 'text-xs mt-1 text-amber-600'; return; }
    const { data } = await sb.from('coupons').select('*').ilike('code', code).eq('active', true).maybeSingle();
    if (!data) { appliedCoupon = null; msg.textContent = 'Invalid or inactive code.'; msg.className = 'text-xs mt-1 text-red-600'; refreshCheckoutTotals(); return; }
    if (data.expires_at && new Date(data.expires_at + 'T23:59:59') < new Date()) {
      appliedCoupon = null; msg.textContent = 'This code has expired.'; msg.className = 'text-xs mt-1 text-red-600'; refreshCheckoutTotals(); return;
    }
    const subtotal = Cart.subtotal();
    if (subtotal < Number(data.min_subtotal)) {
      appliedCoupon = null;
      msg.textContent = `Spend ${money(data.min_subtotal)} to use this code.`; msg.className = 'text-xs mt-1 text-amber-600';
      refreshCheckoutTotals(); return;
    }
    const discount = data.discount_type === 'percent'
      ? Math.round(subtotal * Number(data.discount_value)) / 100
      : Number(data.discount_value);
    appliedCoupon = { code: data.code, discount: Math.min(discount, subtotal) };
    msg.textContent = `Code "${data.code}" applied — you save ${money(appliedCoupon.discount)}.`;
    msg.className = 'text-xs mt-1 text-emerald-600';
    refreshCheckoutTotals();
  }
  window.applyCoupon = applyCoupon;

  async function placeOrder(e) {
    e.preventDefault();
    const form = e.target;
    if (window.SHOP_OPEN === false) return showToast(I18N.t('toast.closed'), 'error');

    if (window.TRR_CONFIGURED) {
      const session = await getSession();
      if (!session) { showToast(I18N.t('toast.signin'), 'error'); openAuth(true); return; }
    }

    const forSelf = form.for_self.checked;
    const type = form.fulfillment.value;
    const recipientName = forSelf ? form.name.value.trim() : form.recipient_name.value.trim();
    const recipientPhone = forSelf ? form.phone.value.trim() : form.recipient_phone.value.trim();

    if (forSelf && (!form.name.value.trim() || !form.phone.value.trim()))
      return showToast('Please enter your name and phone', 'error');
    if (!forSelf && (!recipientName || !recipientPhone))
      return showToast("Please fill the recipient's name and phone", 'error');
    if (type === 'delivery' && !form.address.value.trim())
      return showToast('Please enter the delivery address', 'error');

    const items = Cart.items();
    const subtotal = Cart.subtotal();
    const discount = Math.min(couponDiscount(), subtotal);
    const fee = deliveryFee(type);
    const total = subtotal - discount + fee;
    const notes = [
      form.notes.value.trim(),
      forSelf ? '' : `Ordered by ${form.name.value.trim() || 'account holder'}`,
    ].filter(Boolean).join(' · ');

    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true; submitBtn.textContent = 'Placing…';

    try {
      let orderNumber = `TRR-${Date.now().toString().slice(-6)}`;
      if (window.TRR_CONFIGURED && window.sb) {
        const session = await getSession();
        const { data: order, error } = await sb.from('orders').insert({
          customer_id: session?.user?.id || null,
          customer_name: recipientName,
          customer_phone: recipientPhone,
          fulfillment_type: type,
          address: type === 'delivery' ? form.address.value.trim() : null,
          notes,
          payment_method: form.payment.value,
          coupon_code: appliedCoupon?.code || null,
          discount,
          subtotal, delivery_fee: fee, total,
        }).select().single();
        if (error) throw error;
        orderNumber = order.order_number;

        const rows = items.map((i) => ({
          order_id: order.id, product_id: i.id, product_name: i.name,
          unit_price: i.price, quantity: i.qty, line_total: i.price * i.qty,
        }));
        const { error: itemsErr } = await sb.from('order_items').insert(rows);
        if (itemsErr) throw itemsErr;
      }

      const lines = items.map((i) => `• ${i.qty}× ${i.name} — ${money(i.price * i.qty)}`).join('%0A');
      const msg =
        `*New Order ${orderNumber}*%0A%0A${lines}%0A%0A` +
        `Subtotal: ${money(subtotal)}%0A` + (discount ? `Discount: -${money(discount)}%0A` : '') +
        `Delivery: ${fee ? money(fee) : 'Free'}%0A*Total: ${money(total)}*%0A%0A` +
        `Recipient: ${recipientName}%0APhone: ${recipientPhone}%0AType: ${type}` +
        (type === 'delivery' ? `%0AAddress: ${form.address.value.trim()}` : '') +
        (notes ? `%0ANotes: ${notes}` : '') + `%0APayment: ${form.payment.value}`;

      Cart.clear();
      appliedCoupon = null;
      closeCheckout(); closeCart();
      showOrderSuccess(orderNumber, cfg.WHATSAPP ? `https://wa.me/${cfg.WHATSAPP}?text=${msg}` : null);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not place order', 'error');
    } finally {
      submitBtn.disabled = false; submitBtn.textContent = 'Place order';
    }
  }
  window.placeOrder = placeOrder;

  function showOrderSuccess(orderNumber, waLink) {
    document.getElementById('success-order-no').textContent = orderNumber;
    const wa = document.getElementById('success-wa');
    if (waLink && wa) { wa.href = waLink; wa.classList.remove('hidden'); }
    else wa?.classList.add('hidden');
    document.getElementById('success-modal').classList.add('open');
  }
  window.closeSuccess = () => document.getElementById('success-modal').classList.remove('open');

  // ---- customer portal (My Orders + loyalty) ------------------------------
  const TIERS = [
    { name: 'Bronze', min: 0 },
    { name: 'Silver', min: 200 },
    { name: 'Gold', min: 500 },
    { name: 'Platinum', min: 1000 },
  ];
  function tierFor(points) {
    let t = TIERS[0];
    for (const x of TIERS) if (points >= x.min) t = x;
    const next = TIERS.find((x) => x.min > points);
    return { tier: t, next };
  }

  window.openAccount = async function () {
    if (!window.TRR_CONFIGURED) return;
    const profile = await getProfile();
    if (!profile) { openAuth(false); return; }
    document.getElementById('account-modal').classList.add('open');
    const body = document.getElementById('account-body');
    body.innerHTML = `<p class="text-center text-gray-400 py-8">${I18N.t('acct.loading')}</p>`;

    const pts = profile.loyalty_points || 0;
    const { tier, next } = tierFor(pts);
    const toNext = next ? next.min - pts : 0;
    const { data: orders } = await sb
      .from('orders').select('*, order_items(product_name,quantity)')
      .eq('customer_id', profile.id).order('created_at', { ascending: false }).limit(30);

    const loyalty = `
      <div class="brand-gradient text-white rounded-2xl p-5 mb-4">
        <div class="flex items-center justify-between">
          <div><p class="text-white/80 text-xs">${I18N.t('acct.points')}</p><p class="text-3xl font-extrabold">${pts}</p></div>
          <div class="text-right"><p class="text-white/80 text-xs">${I18N.t('acct.tier')}</p><p class="text-xl font-extrabold">${tier.name}</p></div>
        </div>
        ${next ? `<p class="text-white/80 text-xs mt-3">${toNext} ${I18N.t('acct.tonext')} ${next.name}</p>` : `<p class="text-white/80 text-xs mt-3">${I18N.t('acct.top')}</p>`}
      </div>
      <p class="text-xs text-gray-400 mb-2">${I18N.t('acct.earn')}</p>`;

    const list = (orders || []).length ? orders.map((o) => {
      const items = (o.order_items || []).map((i) => `${i.quantity}× ${i.product_name}`).join(', ');
      const canRate = o.status === 'completed' && !o.rating;
      const stars = o.rating ? renderStars(o.rating) : (canRate ? rateButtons(o.id) : '');
      const paid = o.payment_status === 'paid';
      return `
        <div class="border border-purple-50 rounded-xl p-3 mb-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-gray-800 text-sm">${o.order_number}</span>
            <span class="badge badge-${o.status}">${I18N.t('status.' + o.status)}</span>
          </div>
          <p class="text-xs text-purple-600 mt-0.5">${I18N.t('sdesc.' + o.status)}</p>
          <p class="text-xs text-gray-500 mt-1">${items}</p>
          <div class="flex items-center justify-between mt-2">
            <span class="text-sm font-extrabold brand-gradient-text">${money(o.total)}</span>
            <span class="text-xs">${stars}</span>
          </div>
          <p class="text-xs mt-1 ${paid ? 'text-emerald-600' : 'text-amber-600'}">${paid ? I18N.t('a.paid') : I18N.t('a.unpaid')}</p>
        </div>`;
    }).join('') : `<p class="text-center text-gray-400 py-6">${I18N.t('acct.noorders')}</p>`;

    body.innerHTML = loyalty + `<h4 class="font-bold text-gray-800 mb-2">${I18N.t('acct.history')}</h4>` + list;
    body.querySelectorAll('[data-rate]').forEach((b) =>
      b.addEventListener('click', () => submitRating(+b.dataset.order, +b.dataset.rate)));
    injectIcons(body);
  };
  window.closeAccount = () => document.getElementById('account-modal').classList.remove('open');

  const renderStars = (n) =>
    Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? 'text-amber-400' : 'text-gray-300'}">${ICON('sparkle')}</span>`).join('');
  const rateButtons = (orderId) =>
    `<span class="text-gray-400 mr-1">${I18N.t('acct.rate')}</span>` +
    Array.from({ length: 5 }, (_, i) =>
      `<button class="text-gray-300 hover:text-amber-400" data-rate="${i + 1}" data-order="${orderId}">${ICON('sparkle')}</button>`).join('');

  async function submitRating(orderId, rating) {
    const { error } = await sb.rpc('rate_order', { p_order_id: orderId, p_rating: rating });
    if (error) return showToast(error.message, 'error');
    showToast('Thanks for rating!', 'success');
    openAccount();
  }

  // ---- init ---------------------------------------------------------------
  document.addEventListener('cart:changed', () => { renderCart(); refreshCheckoutTotals(); });
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-shop-name]').forEach((el) => (el.textContent = cfg.SHOP_NAME));
    document.querySelectorAll('[data-shop-tagline]').forEach((el) => (el.textContent = cfg.SHOP_TAGLINE));

    loadMenu();
    renderCart();

    document.getElementById('open-cart')?.addEventListener('click', openCart);
    document.getElementById('cart-fab')?.addEventListener('click', openCart);
    document.getElementById('close-cart')?.addEventListener('click', closeCart);
    document.getElementById('drawer-backdrop')?.addEventListener('click', closeCart);
    document.getElementById('checkout-btn')?.addEventListener('click', openCheckout);
    document.getElementById('checkout-close')?.addEventListener('click', closeCheckout);
    document.getElementById('checkout-form')?.addEventListener('submit', placeOrder);
    document.getElementById('for-self')?.addEventListener('change', applyForSelfToggle);
    document.getElementById('coupon-apply')?.addEventListener('click', applyCoupon);
    document.getElementById('account-btn')?.addEventListener('click', openAccount);
    document.getElementById('account-close')?.addEventListener('click', closeAccount);
    document.getElementById('lang-toggle')?.addEventListener('click', () => I18N.toggle());
    document.getElementById('guide-close')?.addEventListener('click', closeGuide);

    // profile dropdown
    const pMenu = document.getElementById('profile-menu');
    const closeProfile = () => pMenu?.classList.add('hidden');
    document.getElementById('profile-btn')?.addEventListener('click', (e) => { e.stopPropagation(); pMenu?.classList.toggle('hidden'); });
    document.addEventListener('click', (e) => {
      if (pMenu && !pMenu.classList.contains('hidden') && !e.target.closest('#profile-btn') && !e.target.closest('#profile-menu')) closeProfile();
    });
    document.getElementById('menu-profile')?.addEventListener('click', () => { closeProfile(); openAccount(); });
    document.getElementById('menu-guide')?.addEventListener('click', () => { window.location.href = 'guide.html'; });
    document.getElementById('menu-lang')?.addEventListener('click', () => { closeProfile(); I18N.toggle(); });
    document.getElementById('menu-logout')?.addEventListener('click', () => { closeProfile(); doLogout(); });
    document.addEventListener('lang:changed', () => {
      renderCategories(); renderProducts(); renderCart(); refreshCheckoutTotals(); applyShopStatus();
      if (document.getElementById('account-modal').classList.contains('open')) openAccount();
    });
    document.getElementById('checkout-form')?.addEventListener('change', (e) => {
      if (e.target.name === 'fulfillment') refreshCheckoutTotals();
    });
  });
})();
