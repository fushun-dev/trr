/**
 * Lightweight i18n for the storefront. English + Simplified Chinese.
 * Static text: add data-i18n="key" (textContent) or data-i18n-ph="key"
 * (placeholder) / data-i18n-aria="key" (aria-label). Dynamic text: I18N.t(key).
 * Choice is persisted; changing language fires a 'lang:changed' event.
 */
(function () {
  const STR = {
    en: {
      'nav.signin': 'Sign in', 'nav.myorders': 'My orders', 'nav.admin': 'Admin', 'nav.cart': 'Cart',
      'hero.badge': 'Freshly rolled in Miri',
      'hero.desc': 'Chewy purple glutinous rice wrapped around crispy you tiao, pork floss, salted egg and more. Order ahead for pickup or delivery.',
      'hero.cta': 'View the menu',
      'menu.title': 'Our Menu', 'menu.hint': 'Tap a category to filter.',
      'menu.all': 'All', 'menu.add': 'Add', 'menu.soldout': 'Sold out', 'menu.sale': 'Sale', 'menu.loading': 'Loading menu…', 'menu.empty': 'No items in this category yet.',
      'info.hours_t': 'Opening hours', 'info.hours_v': 'Daily 8:00am – 6:00pm',
      'info.loc_t': 'Location', 'info.loc_v': 'Jalan Luak, Miri, Sarawak',
      'info.deliv_t': 'Pickup & delivery', 'info.deliv_v': 'Free delivery over RM 50',
      'visit.title': 'Visit us in Miri',
      'visit.desc': 'Look for our purple stall at Jalan Luak. Every rice roll is rolled fresh to order — warm purple glutinous rice, crispy you tiao and your favourite fillings. Order ahead and skip the wait.',
      'visit.cta': 'Order now',
      'footer.staff': 'Staff login', 'footer.install': 'Install app',
      'install.sub': 'Install app for quick access', 'install.btn': 'Install',
      'ios.title': 'Add to Home Screen', 'ios.ios_h': 'On iPhone / iPad (Safari)',
      'ios.s1a': 'Tap the', 'ios.share': 'Share', 'ios.s1b': "button in Safari's toolbar.",
      'ios.s2': 'Choose "Add to Home Screen".', 'ios.s3': 'Tap Add — done. Open it like any app.',
      'ios.and_h': 'On Android (Chrome)', 'ios.a1': "Open Chrome's menu (top right).", 'ios.a2': 'Tap "Add to Home screen" / "Install app".',
      'cart.title': 'Your Cart', 'cart.empty': 'Your cart is empty', 'cart.subtotal': 'Subtotal', 'cart.checkout': 'Checkout',
      'co.title': 'Checkout', 'co.forself': 'Ordering for myself', 'co.yourname': 'Your name', 'co.yourphone': 'Your phone',
      'co.deliverto': 'Deliver to / pickup by', 'co.rname': 'Recipient name', 'co.rphone': 'Recipient phone',
      'co.fulfillment': 'Fulfillment', 'co.pickup': 'Pickup', 'co.delivery': 'Delivery', 'co.address': 'Delivery address',
      'co.payment': 'Payment', 'co.pay_cash': 'Cash on pickup / delivery', 'co.pay_transfer': 'Bank transfer / DuitNow', 'co.pay_card': 'Card',
      'co.promo': 'Promo code', 'co.apply': 'Apply', 'co.notes': 'Notes (optional)',
      'co.subtotal': 'Subtotal', 'co.discount': 'Discount', 'co.delivery_fee': 'Delivery', 'co.free': 'Free', 'co.total': 'Total', 'co.place': 'Place order',
      'succ.title': 'Order placed', 'succ.your_no': 'Your order number is', 'succ.note': "We'll start preparing it shortly.", 'succ.wa': 'Send order via WhatsApp', 'succ.done': 'Done',
      'auth.signin': 'Sign in', 'auth.create': 'Create account', 'auth.hint': 'Please sign in or create an account to place your order.',
      'auth.fullname': 'Full name', 'auth.phone': 'Phone', 'auth.email': 'Email', 'auth.password': 'Password',
      'auth.to_register': 'New here? Create an account', 'auth.to_login': 'Already have an account? Sign in',
      'acct.title': 'My Account', 'acct.points': 'Loyalty points', 'acct.tier': 'Tier', 'acct.history': 'Order history',
      'acct.tonext': 'more points to', 'acct.top': 'Top tier reached. Thank you!', 'acct.earn': 'Earn 1 point per RM 1 spent when an order is completed.',
      'acct.noorders': 'No orders yet.', 'acct.rate': 'Rate:', 'acct.loading': 'Loading…',
      'ph.yourname': 'Your name', 'ph.phone': '01x-xxxxxxx', 'ph.address': 'Street, area, landmarks',
      'ph.email': 'you@example.com', 'ph.password': 'At least 6 characters', 'ph.notes': 'Less spicy, no coriander…', 'ph.promo': 'Enter code (optional)',
      'toast.added': 'Added to cart', 'toast.signin': 'Please sign in to place your order', 'toast.empty': 'Your cart is empty',
      'shop.open': 'Open for orders', 'shop.closed': 'Closed',
      'shop.closed_banner': 'Sorry, we are currently closed. Please order during our opening hours.',
      'toast.closed': 'Sorry, the shop is closed right now.',
    },
    zh: {
      'nav.signin': '登录', 'nav.myorders': '我的订单', 'nav.admin': '管理', 'nav.cart': '购物车',
      'hero.badge': '美里新鲜现做',
      'hero.desc': '软糯紫米包裹酥脆油条、肉松、咸蛋等多种馅料。提前下单，自取或外送。',
      'hero.cta': '查看菜单',
      'menu.title': '我们的菜单', 'menu.hint': '点击分类筛选。',
      'menu.all': '全部', 'menu.add': '加入', 'menu.soldout': '售罄', 'menu.sale': '特价', 'menu.loading': '正在加载菜单…', 'menu.empty': '此分类暂无商品。',
      'info.hours_t': '营业时间', 'info.hours_v': '每天 上午8:00 – 下午6:00',
      'info.loc_t': '地址', 'info.loc_v': 'Jalan Luak, 美里, 砂拉越',
      'info.deliv_t': '自取与外送', 'info.deliv_v': '满 RM 50 免外送费',
      'visit.title': '欢迎光临美里店',
      'visit.desc': '在 Jalan Luak 寻找我们的紫色摊位。每个饭团都现点现做——温热紫米、酥脆油条与您喜爱的馅料。提前下单，免去等候。',
      'visit.cta': '立即下单',
      'footer.staff': '员工登录', 'footer.install': '安装应用',
      'install.sub': '安装应用，快速点单', 'install.btn': '安装',
      'ios.title': '添加到主屏幕', 'ios.ios_h': 'iPhone / iPad（Safari）',
      'ios.s1a': '点击 Safari 工具栏的', 'ios.share': '分享', 'ios.s1b': '按钮。',
      'ios.s2': '选择「添加到主屏幕」。', 'ios.s3': '点击「添加」——完成，像应用一样打开。',
      'ios.and_h': 'Android（Chrome）', 'ios.a1': '打开 Chrome 右上角菜单。', 'ios.a2': '点击「添加到主屏幕 / 安装应用」。',
      'cart.title': '购物车', 'cart.empty': '购物车是空的', 'cart.subtotal': '小计', 'cart.checkout': '结账',
      'co.title': '结账', 'co.forself': '为自己下单', 'co.yourname': '您的姓名', 'co.yourphone': '您的电话',
      'co.deliverto': '收件 / 自取人', 'co.rname': '收件人姓名', 'co.rphone': '收件人电话',
      'co.fulfillment': '取餐方式', 'co.pickup': '自取', 'co.delivery': '外送', 'co.address': '外送地址',
      'co.payment': '付款方式', 'co.pay_cash': '取餐 / 外送时付现', 'co.pay_transfer': '银行转账 / DuitNow', 'co.pay_card': '刷卡',
      'co.promo': '优惠码', 'co.apply': '使用', 'co.notes': '备注（可选）',
      'co.subtotal': '小计', 'co.discount': '折扣', 'co.delivery_fee': '外送费', 'co.free': '免费', 'co.total': '总计', 'co.place': '提交订单',
      'succ.title': '下单成功', 'succ.your_no': '您的订单号', 'succ.note': '我们将尽快为您准备。', 'succ.wa': '通过 WhatsApp 发送订单', 'succ.done': '完成',
      'auth.signin': '登录', 'auth.create': '注册账户', 'auth.hint': '请登录或注册账户以下单。',
      'auth.fullname': '姓名', 'auth.phone': '电话', 'auth.email': '邮箱', 'auth.password': '密码',
      'auth.to_register': '还没有账户？注册', 'auth.to_login': '已有账户？登录',
      'acct.title': '我的账户', 'acct.points': '会员积分', 'acct.tier': '等级', 'acct.history': '订单记录',
      'acct.tonext': '积分可升至', 'acct.top': '已达最高等级，感谢支持！', 'acct.earn': '订单完成后每消费 RM 1 获得 1 积分。',
      'acct.noorders': '暂无订单。', 'acct.rate': '评分：', 'acct.loading': '加载中…',
      'ph.yourname': '您的姓名', 'ph.phone': '01x-xxxxxxx', 'ph.address': '街道、地区、地标',
      'ph.email': 'you@example.com', 'ph.password': '至少 6 个字符', 'ph.notes': '少辣、不要香菜…', 'ph.promo': '输入优惠码（可选）',
      'toast.added': '已加入购物车', 'toast.signin': '请登录后下单', 'toast.empty': '购物车是空的',
      'shop.open': '营业中', 'shop.closed': '已打烊',
      'shop.closed_banner': '抱歉，我们目前已打烊，请在营业时间下单。',
      'toast.closed': '抱歉，本店目前已打烊。',
    },
  };

  let lang = localStorage.getItem('trr_lang') || 'en';

  function t(key) { return (STR[lang] && STR[lang][key]) || (STR.en[key] ?? key); }

  function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
    root.querySelectorAll('[data-i18n-ph]').forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
    root.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    document.documentElement.lang = lang === 'zh' ? 'zh' : 'en';
    document.querySelectorAll('[data-lang-label]').forEach((el) => (el.textContent = lang === 'en' ? '中文' : 'EN'));
  }

  function setLang(l) {
    lang = l; localStorage.setItem('trr_lang', l);
    apply();
    document.dispatchEvent(new CustomEvent('lang:changed', { detail: { lang } }));
  }

  window.I18N = { t, apply, setLang, get lang() { return lang; }, toggle: () => setLang(lang === 'en' ? 'zh' : 'en') };
  document.addEventListener('DOMContentLoaded', () => apply());
})();
