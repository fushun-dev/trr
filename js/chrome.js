/**
 * Shared site chrome (header + cart/auth/account overlays) for secondary pages
 * (guide, profile) so they match the landing page. Injects the markup, then
 * app.js / auth.js / pwa.js wire it exactly as on the storefront.
 * Load order: config, icons, i18n, chrome, supabase, cart, app, auth, pwa.
 */
(function () {
  const HEADER = `
  <header class="sticky top-0 z-30 glass">
    <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
      <a href="index.html" class="flex items-center gap-2">
        <div class="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center text-white shadow">
          <span class="icon icon-lg" data-icon="roll"></span>
        </div>
        <div class="leading-tight">
          <p class="font-extrabold text-gray-800 brand-name">Taiwan Rice Roll</p>
          <p class="text-[11px] text-purple-600 font-medium hidden sm:block">Jalan Luak · Miri</p>
        </div>
      </a>
      <div class="flex items-center gap-1.5">
        <span id="header-shop-status" class="hidden items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"></span>
        <button id="lang-toggle" class="btn btn-ghost text-sm font-bold" aria-label="Language"><span class="icon" data-icon="globe"></span> <span data-lang-label>中文</span></button>
        <button id="login-btn" class="btn btn-primary text-sm"><span class="icon" data-icon="user"></span> <span data-i18n="nav.signin">Sign in</span></button>
        <div id="user-box" class="hidden flex items-center gap-1.5">
          <button id="account-btn" class="btn btn-ghost text-sm" aria-label="My orders" data-i18n-aria="nav.myorders"><span class="icon" data-icon="bag"></span></button>
          <a id="admin-link" href="admin/index.html" class="btn btn-ghost text-sm hidden" aria-label="Admin" data-i18n-aria="nav.admin"><span class="icon" data-icon="gear"></span></a>
          <div class="relative">
            <button id="profile-btn" class="btn btn-ghost text-sm" aria-label="Profile"><span class="icon" data-icon="user"></span> <span class="icon text-xs" data-icon="chevron"></span></button>
            <div id="profile-menu" class="profile-menu hidden">
              <div class="px-3 py-2 border-b border-purple-50 text-xs text-gray-400">Hi, <span id="user-name" class="font-semibold text-purple-700">there</span></div>
              <button id="menu-profile" class="profile-item"><span class="icon" data-icon="user"></span> <span data-i18n="menu.profile">My profile</span></button>
              <button id="menu-guide" class="profile-item"><span class="icon" data-icon="book"></span> <span data-i18n="menu.guide">User guide</span></button>
              <button id="menu-lang" class="profile-item"><span class="icon" data-icon="globe"></span> <span data-i18n="menu.language">中文 / English</span></button>
              <button id="menu-logout" class="profile-item text-red-600"><span class="icon" data-icon="logout"></span> <span data-i18n="menu.logout">Logout</span></button>
            </div>
          </div>
        </div>
        <button id="open-cart" class="btn btn-primary text-sm relative">
          <span class="icon" data-icon="cart"></span> <span class="hidden sm:inline" data-i18n="nav.cart">Cart</span> <span id="cart-count" class="ml-0.5 font-bold">0</span>
        </button>
      </div>
    </div>
  </header>
  <div id="closed-banner" class="hidden bg-red-600 text-white text-sm text-center py-2.5 px-4 font-semibold"></div>
  <div id="announce-bar" class="hidden"></div>`;

  const OVERLAYS = `
  <div id="install-banner" class="install-banner">
    <div class="ib-icon"><span class="icon icon-lg" data-icon="roll"></span></div>
    <div class="flex-1 min-w-0">
      <p class="font-extrabold text-gray-800 text-sm leading-tight truncate" data-shop-name>Taiwan Rice Roll</p>
      <p class="text-xs text-gray-500" data-i18n="install.sub">Install app for quick access</p>
    </div>
    <button id="install-btn" class="btn btn-primary text-sm" data-i18n="install.btn">Install</button>
  </div>
  <div id="ios-install-sheet" class="ios-sheet-backdrop">
    <div class="ios-sheet">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-extrabold text-gray-800 text-lg" data-i18n="ios.title">Add to Home Screen</h3>
        <button id="ios-sheet-close" class="text-gray-400 text-2xl leading-none">&times;</button>
      </div>
      <p class="text-xs font-bold text-purple-700 uppercase tracking-wide mb-2" data-i18n="ios.ios_h">On iPhone / iPad (Safari)</p>
      <ol class="space-y-3 text-sm text-gray-600">
        <li class="flex items-center gap-3"><span class="ib-icon !w-9 !h-9 text-white"><span class="icon" data-icon="share"></span></span> <span><span data-i18n="ios.s1a">Tap the</span> <b data-i18n="ios.share">Share</b> <span data-i18n="ios.s1b">button.</span></span></li>
        <li class="flex items-center gap-3"><span class="ib-icon !w-9 !h-9 text-white"><span class="icon" data-icon="homeplus"></span></span> <span data-i18n="ios.s2">Choose "Add to Home Screen".</span></li>
        <li class="flex items-center gap-3"><span class="ib-icon !w-9 !h-9 text-white"><span class="icon" data-icon="check"></span></span> <span data-i18n="ios.s3">Tap Add — done.</span></li>
      </ol>
      <p class="text-xs font-bold text-purple-700 uppercase tracking-wide mt-5 mb-2" data-i18n="ios.and_h">On Android (Chrome)</p>
      <ol class="space-y-3 text-sm text-gray-600">
        <li class="flex items-center gap-3"><span class="ib-icon !w-9 !h-9 text-white"><span class="icon" data-icon="menu"></span></span> <span data-i18n="ios.a1">Open Chrome's menu.</span></li>
        <li class="flex items-center gap-3"><span class="ib-icon !w-9 !h-9 text-white"><span class="icon" data-icon="homeplus"></span></span> <span data-i18n="ios.a2">Tap "Add to Home screen".</span></li>
      </ol>
    </div>
  </div>
  <button id="cart-fab" class="cart-fab md:hidden"><span class="icon icon-lg" data-icon="cart"></span><span id="fab-count" class="count" style="display:none">0</span></button>
  <div id="drawer-backdrop" class="drawer-backdrop"></div>
  <aside id="cart-drawer" class="drawer">
    <div class="brand-gradient text-white px-5 py-4 flex items-center justify-between">
      <h3 class="font-bold text-lg" data-i18n="cart.title">Your Cart</h3>
      <button id="close-cart" class="text-white/90 text-2xl leading-none">&times;</button>
    </div>
    <div id="cart-body" class="flex-1 overflow-auto px-5"></div>
    <div id="cart-footer" class="hidden border-t border-purple-100 p-5">
      <div class="flex justify-between font-semibold text-gray-700 mb-3"><span data-i18n="cart.subtotal">Subtotal</span><span id="cart-subtotal">RM 0.00</span></div>
      <button id="checkout-btn" class="btn btn-primary w-full py-3" data-i18n="cart.checkout">Checkout</button>
    </div>
  </aside>
  <div id="checkout-modal" class="modal-backdrop">
    <div class="modal p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-extrabold text-gray-800" data-i18n="co.title">Checkout</h3>
        <button id="checkout-close" class="text-gray-400 text-2xl leading-none">&times;</button>
      </div>
      <form id="checkout-form" class="space-y-3">
        <label class="flex items-center gap-2.5 bg-purple-50 rounded-xl px-3 py-2.5 cursor-pointer select-none">
          <input type="checkbox" id="for-self" name="for_self" checked class="w-4 h-4 accent-purple-600" />
          <span class="text-sm font-semibold text-gray-700" data-i18n="co.forself">Ordering for myself</span>
        </label>
        <div id="self-wrap" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label class="text-xs font-semibold text-gray-500" data-i18n="co.yourname">Your name</label><input name="name" class="field mt-1" data-i18n-ph="ph.yourname" placeholder="Your name" /></div>
          <div><label class="text-xs font-semibold text-gray-500" data-i18n="co.yourphone">Your phone</label><input name="phone" class="field mt-1" data-i18n-ph="ph.phone" placeholder="01x-xxxxxxx" /></div>
        </div>
        <div id="recipient-wrap" class="hidden space-y-3">
          <div class="flex items-center gap-2 text-purple-700 text-xs font-semibold"><span class="icon" data-icon="user"></span> <span data-i18n="co.deliverto">Deliver to / pickup by</span></div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label class="text-xs font-semibold text-gray-500" data-i18n="co.rname">Recipient name</label><input name="recipient_name" class="field mt-1" data-i18n-ph="co.rname" placeholder="Recipient's name" /></div>
            <div><label class="text-xs font-semibold text-gray-500" data-i18n="co.rphone">Recipient phone</label><input name="recipient_phone" class="field mt-1" data-i18n-ph="ph.phone" placeholder="01x-xxxxxxx" /></div>
          </div>
        </div>
        <div>
          <label class="text-xs font-semibold text-gray-500" data-i18n="co.fulfillment">Fulfillment</label>
          <div class="grid grid-cols-2 gap-2 mt-1">
            <label class="field flex items-center gap-2 cursor-pointer"><input type="radio" name="fulfillment" value="pickup" checked /><span class="icon text-purple-600" data-icon="pickup"></span> <span data-i18n="co.pickup">Pickup</span></label>
            <label class="field flex items-center gap-2 cursor-pointer"><input type="radio" name="fulfillment" value="delivery" /><span class="icon text-purple-600" data-icon="delivery"></span> <span data-i18n="co.delivery">Delivery</span></label>
          </div>
        </div>
        <div id="address-wrap" class="hidden">
          <label class="text-xs font-semibold text-gray-500" data-i18n="co.address">Delivery address</label>
          <textarea name="address" rows="2" class="field mt-1" data-i18n-ph="ph.address" placeholder="Street, area, landmarks"></textarea>
        </div>
        <div>
          <label class="text-xs font-semibold text-gray-500" data-i18n="co.payment">Payment</label>
          <select name="payment" class="field mt-1">
            <option value="cash" data-i18n="co.pay_cash">Cash on pickup / delivery</option>
            <option value="transfer" data-i18n="co.pay_transfer">Bank transfer / DuitNow</option>
            <option value="card" data-i18n="co.pay_card">Card</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-semibold text-gray-500" data-i18n="co.promo">Promo code</label>
          <div class="flex gap-2 mt-1"><input id="coupon-input" class="field" data-i18n-ph="ph.promo" placeholder="Enter code (optional)" /><button type="button" id="coupon-apply" class="btn btn-ghost whitespace-nowrap" data-i18n="co.apply">Apply</button></div>
          <p id="coupon-msg" class="text-xs mt-1"></p>
        </div>
        <div>
          <label class="text-xs font-semibold text-gray-500" data-i18n="co.notes">Notes (optional)</label>
          <input name="notes" class="field mt-1" data-i18n-ph="ph.notes" placeholder="Less spicy, no coriander…" />
        </div>
        <div class="bg-purple-50 rounded-xl p-3 text-sm space-y-1">
          <div class="flex justify-between"><span data-i18n="co.subtotal">Subtotal</span><span id="co-subtotal">RM 0.00</span></div>
          <div id="co-discount-row" class="flex justify-between text-emerald-600 hidden"><span data-i18n="co.discount">Discount</span><span id="co-discount">- RM 0.00</span></div>
          <div class="flex justify-between"><span data-i18n="co.delivery_fee">Delivery</span><span id="co-delivery" data-i18n="co.free">Free</span></div>
          <div class="flex justify-between font-extrabold text-gray-800 text-base pt-1 border-t border-purple-100 mt-1"><span data-i18n="co.total">Total</span><span id="co-total">RM 0.00</span></div>
        </div>
        <button type="submit" class="btn btn-primary w-full py-3" data-i18n="co.place">Place order</button>
      </form>
    </div>
  </div>
  <div id="success-modal" class="modal-backdrop">
    <div class="modal p-8 text-center">
      <div class="text-emerald-500 flex justify-center mb-3"><span class="icon icon-xl" data-icon="check"></span></div>
      <h3 class="text-2xl font-extrabold text-gray-800" data-i18n="succ.title">Order placed</h3>
      <p class="text-gray-500 mt-2" data-i18n="succ.your_no">Your order number is</p>
      <p class="text-2xl font-extrabold brand-gradient-text my-2" id="success-order-no">—</p>
      <p class="text-sm text-gray-400" data-i18n="succ.note">We'll start preparing it shortly.</p>
      <a id="success-wa" href="#" target="_blank" rel="noopener" class="btn btn-primary w-full py-3 mt-5 hidden"><span class="icon" data-icon="chat"></span> <span data-i18n="succ.wa">Send order via WhatsApp</span></a>
      <button onclick="closeSuccess()" class="btn btn-ghost w-full py-3 mt-2" data-i18n="succ.done">Done</button>
    </div>
  </div>
  <div id="account-modal" class="modal-backdrop">
    <div class="modal p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-xl font-extrabold text-gray-800" data-i18n="nav.myorders">My orders</h3>
        <button id="account-close" class="text-gray-400 text-2xl leading-none">&times;</button>
      </div>
      <div id="account-body"></div>
    </div>
  </div>
  <div id="auth-modal" class="modal-backdrop">
    <div class="modal p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 id="auth-title" class="text-xl font-extrabold text-gray-800">Sign in</h3>
        <button id="auth-close" class="text-gray-400 text-2xl leading-none">&times;</button>
      </div>
      <p id="auth-hint" class="hidden text-sm text-purple-700 bg-purple-50 rounded-lg p-3 mb-3" data-i18n="auth.hint">Please sign in or create an account to place your order.</p>
      <form id="auth-form" class="space-y-3">
        <div id="auth-name-wrap" class="hidden"><label class="text-xs font-semibold text-gray-500" data-i18n="auth.fullname">Full name</label><input name="name" class="field mt-1" data-i18n-ph="ph.yourname" placeholder="Your name" /></div>
        <div id="auth-phone-wrap" class="hidden"><label class="text-xs font-semibold text-gray-500" data-i18n="auth.phone">Phone</label><input name="phone" class="field mt-1" data-i18n-ph="ph.phone" placeholder="01x-xxxxxxx" /></div>
        <div><label class="text-xs font-semibold text-gray-500" data-i18n="auth.email">Email</label><input name="email" type="email" required class="field mt-1" data-i18n-ph="ph.email" placeholder="you@example.com" /></div>
        <div><label class="text-xs font-semibold text-gray-500" data-i18n="auth.password">Password</label><input name="password" type="password" required minlength="6" class="field mt-1" data-i18n-ph="ph.password" placeholder="At least 6 characters" /></div>
        <button id="auth-submit" type="submit" class="btn btn-primary w-full py-3">Sign in</button>
        <button id="auth-toggle" type="button" class="text-sm text-purple-600 font-semibold w-full text-center">New here? Create an account</button>
      </form>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('afterbegin', HEADER);
  document.body.insertAdjacentHTML('beforeend', OVERLAYS);
  if (window.injectIcons) window.injectIcons(document);
  if (window.I18N) window.I18N.apply();
})();
