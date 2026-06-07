/**
 * Storefront logic: load menu, render categories + products, manage cart drawer,
 * place orders into Supabase, and handle customer auth.
 */
(function () {
  const cfg = window.TRR_CONFIG;
  let CATEGORIES = [];
  let PRODUCTS = [];
  let activeCat = 'all';

  // Demo menu used only when Supabase is not yet configured, so the site
  // is previewable. Mirrors the seed data in the SQL migration.
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
      { id: 5, category_id: 2, name: 'Ham Salted Egg Rice Roll 火腿咸蛋黄饭团', price: 22.9, available: true },
      { id: 6, category_id: 2, name: 'Chicken Floss Salted Egg 咸蛋肉松紫米饭团', price: 22.0, available: true },
      { id: 7, category_id: 2, name: 'Salted Egg Yolk Chicken 咸蛋黄鸡肉紫米饭团', price: 21.9, available: true },
      { id: 8, category_id: 2, name: 'Smoked Duck Rice Roll 烟熏鸭肉饭团', price: 19.9, available: true },
      { id: 9, category_id: 2, name: 'Grilled Beef Rice Roll 牛肉紫米饭团', price: 19.9, available: true },
      { id: 10, category_id: 2, name: 'Fried Chicken Rice Roll 鸡肉紫米饭团', price: 19.9, available: true },
      { id: 11, category_id: 2, name: 'Spicy Chicken Floss Rice Roll 香辣鸡丝饭团', price: 18.9, available: true },
      { id: 12, category_id: 2, name: 'Shaca Chicken Rice Roll 沙茶鸡排饭团', price: 18.9, available: true },
      { id: 13, category_id: 2, name: 'Chicken Ham Rice Roll 火腿紫米饭团', price: 18.9, available: true },
      { id: 14, category_id: 2, name: 'Crab Stick Egg Rice Roll 蟹柳蛋紫米饭团', price: 17.0, available: true },
      { id: 15, category_id: 3, name: 'Vegetarian Dinosaur 素恐龙紫米饭团', price: 43.9, available: true },
      { id: 16, category_id: 3, name: 'Vegetarian Meat Rice Roll 素三层肉紫米饭团', price: 19.9, available: true },
      { id: 17, category_id: 3, name: 'Vegetarian Spicy Floss Rice Roll 素香辣肉松饭团', price: 18.9, available: true },
      { id: 18, category_id: 3, name: 'Vegetarian Ham Cheesy Rice Ball 火腿芝士饭团 素', price: 17.9, available: true },
      { id: 19, category_id: 3, name: 'Salad Vegetable Rice Roll 沙拉蔬菜饭团', price: 16.9, available: true },
      { id: 20, category_id: 3, name: 'Vegetarian Cheesy Corn Rice Roll 素芝士玉米饭团', price: 15.9, available: true },
      { id: 21, category_id: 4, name: 'Ham Cheesy Burrito 火腿蛋蛋卷', price: 19.9, available: true },
      { id: 22, category_id: 4, name: 'Chicken Burrito 鸡肉卷', price: 18.9, available: true },
      { id: 23, category_id: 4, name: 'Chicken Floss Burrito 鸡肉松卷', price: 18.9, available: true },
      { id: 24, category_id: 4, name: 'Vege Lover Burrito 蔬菜起司卷', price: 18.9, available: true },
      { id: 25, category_id: 5, name: 'Kefir Yogurt Original 原味开菲尔', price: 15.9, available: true },
      { id: 26, category_id: 5, name: 'Mango Kefir 芒果开菲尔', price: 15.9, available: true },
      { id: 27, category_id: 5, name: 'Strawberry Kefir 草莓开菲尔', price: 15.9, available: true },
      { id: 28, category_id: 5, name: 'Passion Fruit Kefir 百香果开菲尔', price: 15.9, available: true },
      { id: 29, category_id: 6, name: 'Mango Ice Tea 芒果茉莉冰茶', price: 12.9, available: true },
      { id: 30, category_id: 6, name: 'Sakura Pearl Peach Tea 樱花冰茶', price: 12.9, available: true },
      { id: 31, category_id: 6, name: 'Peach Ice Tea 红桃茉莉冰茶', price: 11.9, available: true },
      { id: 32, category_id: 6, name: 'Jasmine Ice Tea 茉莉冰茶', price: 9.9, available: true },
      { id: 33, category_id: 7, name: 'Jasmine Herbal Egg 茉莉花茶叶蛋', price: 5.0, available: true },
    ],
  };

  const emoji = (name) => {
    const n = name.toLowerCase();
    if (n.includes('egg 茶') || n.includes('茶叶蛋')) return '🥚';
    if (n.includes('tea') || n.includes('冰茶')) return '🧋';
    if (n.includes('kefir') || n.includes('开菲尔')) return '🥤';
    if (n.includes('burrito') || n.includes('卷')) return '🌯';
    if (n.includes('duck') || n.includes('鸭')) return '🦆';
    if (n.includes('beef') || n.includes('牛')) return '🥩';
    if (n.includes('dinosaur') || n.includes('恐龙')) return '🦖';
    return '🍙';
  };

  async function loadMenu() {
    if (window.TRR_CONFIGURED && window.sb) {
      const [{ data: cats }, { data: prods }] = await Promise.all([
        sb.from('categories').select('*').eq('active', true).order('sort_order'),
        sb.from('products').select('*').order('sort_order'),
      ]);
      CATEGORIES = cats || [];
      PRODUCTS = prods || [];
    } else {
      CATEGORIES = DEMO.categories;
      PRODUCTS = DEMO.products;
      const banner = document.getElementById('demo-banner');
      if (banner) banner.classList.remove('hidden');
    }
    renderCategories();
    renderProducts();
  }

  function renderCategories() {
    const host = document.getElementById('category-chips');
    if (!host) return;
    const chips = [{ id: 'all', name: 'All 全部' }, ...CATEGORIES];
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
      host.innerHTML = `<p class="text-center text-gray-400 col-span-full py-10">No items in this category yet.</p>`;
      return;
    }
    host.innerHTML = list
      .map((p) => {
        const sold = !p.available;
        const img = p.image_url
          ? `<img src="${p.image_url}" alt="${p.name}" class="w-full h-40 object-cover rounded-t-2xl">`
          : `<div class="thumb-fallback w-full h-40 rounded-t-2xl">${emoji(p.name)}</div>`;
        return `
          <div class="card overflow-hidden flex flex-col ${sold ? 'opacity-60' : ''}">
            ${img}
            <div class="p-4 flex flex-col flex-1">
              <h3 class="font-bold text-gray-800 leading-snug">${p.name}</h3>
              <p class="text-sm text-gray-500 mt-1 flex-1">${p.description || ''}</p>
              <div class="flex items-center justify-between mt-3">
                <span class="font-extrabold brand-gradient-text text-lg">${money(p.price)}</span>
                ${sold
                  ? `<span class="badge badge-cancelled">Sold out</span>`
                  : `<button class="btn btn-primary text-sm" data-add="${p.id}">+ Add</button>`}
              </div>
            </div>
          </div>`;
      })
      .join('');
    host.querySelectorAll('[data-add]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const p = PRODUCTS.find((x) => x.id === Number(btn.dataset.add));
        Cart.add(p);
        showToast(`${p.name.split(' ')[0]} added to cart`, 'success');
      })
    );
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
      body.innerHTML = `<div class="text-center text-gray-400 py-16">
        <div class="text-5xl mb-3">🛒</div>Your cart is empty</div>`;
      if (footer) footer.classList.add('hidden');
      return;
    }
    body.innerHTML = items
      .map(
        (i) => `
        <div class="flex items-center gap-3 py-3 border-b border-purple-50">
          <div class="thumb-fallback w-12 h-12 rounded-lg text-xl shrink-0">🍙</div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-sm text-gray-800 truncate">${i.name}</p>
            <p class="text-xs text-gray-500">${money(i.price)}</p>
          </div>
          <div class="flex items-center gap-2">
            <button class="btn btn-ghost px-2 py-1 text-sm" data-dec="${i.id}">−</button>
            <span class="w-6 text-center font-semibold">${i.qty}</span>
            <button class="btn btn-ghost px-2 py-1 text-sm" data-inc="${i.id}">+</button>
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

  // ---- checkout -----------------------------------------------------------
  function openCheckout() {
    if (!Cart.count()) return showToast('Your cart is empty', 'error');
    refreshCheckoutTotals();
    document.getElementById('checkout-modal').classList.add('open');
  }
  function closeCheckout() {
    const m = document.getElementById('checkout-modal');
    if (m) m.classList.remove('open');
  }
  window.openCheckout = openCheckout;
  window.closeCheckout = closeCheckout;

  function deliveryFee(type) {
    if (type !== 'delivery') return 0;
    return Cart.subtotal() >= (cfg.FREE_DELIVERY_OVER || Infinity) ? 0 : Number(cfg.DELIVERY_FEE || 0);
  }
  function refreshCheckoutTotals() {
    const type = document.querySelector('input[name="fulfillment"]:checked')?.value || 'pickup';
    const addrWrap = document.getElementById('address-wrap');
    if (addrWrap) addrWrap.classList.toggle('hidden', type !== 'delivery');
    const fee = deliveryFee(type);
    const total = Cart.subtotal() + fee;
    document.getElementById('co-subtotal').textContent = money(Cart.subtotal());
    document.getElementById('co-delivery').textContent = fee ? money(fee) : 'Free';
    document.getElementById('co-total').textContent = money(total);
  }

  async function placeOrder(e) {
    e.preventDefault();
    const form = e.target;
    const type = form.fulfillment.value;
    const payload = {
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      type,
      address: type === 'delivery' ? form.address.value.trim() : null,
      notes: form.notes.value.trim(),
      payment: form.payment.value,
    };
    if (!payload.name || !payload.phone) return showToast('Please enter name & phone', 'error');
    if (type === 'delivery' && !payload.address) return showToast('Please enter delivery address', 'error');

    const items = Cart.items();
    const subtotal = Cart.subtotal();
    const fee = deliveryFee(type);
    const total = subtotal + fee;
    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Placing…';

    try {
      let orderNumber = `TRR-${Date.now().toString().slice(-6)}`;

      if (window.TRR_CONFIGURED && window.sb) {
        const session = await getSession();
        const { data: order, error } = await sb
          .from('orders')
          .insert({
            customer_id: session?.user?.id || null,
            customer_name: payload.name,
            customer_phone: payload.phone,
            fulfillment_type: type,
            address: payload.address,
            notes: payload.notes,
            payment_method: payload.payment,
            subtotal, delivery_fee: fee, total,
          })
          .select()
          .single();
        if (error) throw error;
        orderNumber = order.order_number;

        const rows = items.map((i) => ({
          order_id: order.id,
          product_id: i.id,
          product_name: i.name,
          unit_price: i.price,
          quantity: i.qty,
          line_total: i.price * i.qty,
        }));
        const { error: itemsErr } = await sb.from('order_items').insert(rows);
        if (itemsErr) throw itemsErr;
      }

      // Build a WhatsApp confirmation message for the shop.
      const lines = items.map((i) => `• ${i.qty}× ${i.name} — ${money(i.price * i.qty)}`).join('%0A');
      const msg =
        `*New Order ${orderNumber}*%0A%0A${lines}%0A%0A` +
        `Subtotal: ${money(subtotal)}%0ADelivery: ${fee ? money(fee) : 'Free'}%0A*Total: ${money(total)}*%0A%0A` +
        `Name: ${payload.name}%0APhone: ${payload.phone}%0AType: ${type}` +
        (payload.address ? `%0AAddress: ${payload.address}` : '') +
        (payload.notes ? `%0ANotes: ${payload.notes}` : '') +
        `%0APayment: ${payload.payment}`;

      Cart.clear();
      closeCheckout();
      closeCart();
      showOrderSuccess(orderNumber, cfg.WHATSAPP ? `https://wa.me/${cfg.WHATSAPP}?text=${msg}` : null);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Could not place order', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Place order';
    }
  }
  window.placeOrder = placeOrder;

  function showOrderSuccess(orderNumber, waLink) {
    const m = document.getElementById('success-modal');
    document.getElementById('success-order-no').textContent = orderNumber;
    const wa = document.getElementById('success-wa');
    if (waLink && wa) { wa.href = waLink; wa.classList.remove('hidden'); }
    else if (wa) wa.classList.add('hidden');
    m.classList.add('open');
  }
  window.closeSuccess = () => document.getElementById('success-modal').classList.remove('open');

  // ---- init ---------------------------------------------------------------
  document.addEventListener('cart:changed', renderCart);
  document.addEventListener('DOMContentLoaded', () => {
    // brand text from config
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
    document.getElementById('checkout-form')?.addEventListener('change', (e) => {
      if (e.target.name === 'fulfillment') refreshCheckoutTotals();
    });
  });
})();
