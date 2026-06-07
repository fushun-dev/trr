/**
 * Customer authentication modal (optional). Guests can order without an account;
 * signing in lets them view their order history.
 */
(function () {
  let mode = 'login'; // 'login' | 'register'

  window.openAuth = function (requiredToOrder) {
    if (!requireConfig()) return;
    document.getElementById('auth-modal')?.classList.add('open');
    document.getElementById('auth-hint')?.classList.toggle('hidden', !requiredToOrder);
    // Always open on the Sign in view; new users tap "Create an account".
    setMode('login');
    setTimeout(() => document.querySelector('#auth-form [name="email"]')?.focus(), 60);
  };
  window.closeAuth = function () {
    document.getElementById('auth-modal')?.classList.remove('open');
  };

  function setMode(m) {
    mode = m;
    const isReg = m === 'register';
    const T = window.I18N ? I18N.t : (k) => k;
    document.getElementById('auth-title').textContent = isReg ? T('auth.create') : T('auth.signin');
    document.getElementById('auth-name-wrap').classList.toggle('hidden', !isReg);
    document.getElementById('auth-phone-wrap').classList.toggle('hidden', !isReg);
    document.getElementById('auth-submit').textContent = isReg ? T('auth.create') : T('auth.signin');
    document.getElementById('auth-toggle').textContent = isReg ? T('auth.to_login') : T('auth.to_register');
  }
  window.toggleAuthMode = () => setMode(mode === 'login' ? 'register' : 'login');

  async function submitAuth(e) {
    e.preventDefault();
    if (!requireConfig()) return;
    const f = e.target;
    const email = f.email.value.trim();
    const password = f.password.value;
    const btn = f.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
      if (mode === 'register') {
        const { error } = await sb.auth.signUp({
          email, password,
          options: { data: { full_name: f.name.value.trim(), phone: f.phone.value.trim() } },
        });
        if (error) throw error;
        showToast('Account created! Check your email to confirm.', 'success');
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Route admins straight to the staff dashboard (HSI-style routeByRole).
        const profile = await getProfile();
        if (profile && profile.role === 'admin') {
          showToast('Welcome back, admin — opening dashboard…', 'success');
          window.location.href = 'admin/index.html';
          return;
        }
        showToast('Welcome back!', 'success');
      }
      closeAuth();
      await refreshAuthUI();
    } catch (err) {
      showToast(err.message || 'Authentication failed', 'error');
    } finally {
      btn.disabled = false;
    }
  }
  window.submitAuth = submitAuth;

  window.doLogout = async function () {
    if (sb) await sb.auth.signOut();
    if (window.clearUserData) window.clearUserData();
    showToast('Signed out', 'info');
    refreshAuthUI();
  };

  async function refreshAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const userBox = document.getElementById('user-box');
    const userName = document.getElementById('user-name');
    if (!loginBtn) return;
    const profile = window.TRR_CONFIGURED ? await getProfile() : null;
    const langToggle = document.getElementById('lang-toggle');
    if (profile) {
      loginBtn.classList.add('hidden');
      userBox?.classList.remove('hidden');
      langToggle?.classList.add('hidden'); // language lives in the profile menu when signed in
      if (userName) userName.textContent = (profile.full_name || 'Account').split(' ')[0];
      document.getElementById('admin-link')?.classList.toggle('hidden', profile.role !== 'admin');
      if (window.subscribeMyOrders) window.subscribeMyOrders(profile.id);
      window.askNotifyPermission && window.askNotifyPermission();
    } else {
      loginBtn.classList.remove('hidden');
      userBox?.classList.add('hidden');
      langToggle?.classList.remove('hidden');
    }
  }
  window.refreshAuthUI = refreshAuthUI;

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-btn')?.addEventListener('click', openAuth);
    document.getElementById('auth-close')?.addEventListener('click', closeAuth);
    document.getElementById('auth-toggle')?.addEventListener('click', toggleAuthMode);
    document.getElementById('auth-form')?.addEventListener('submit', submitAuth);
    document.getElementById('logout-btn')?.addEventListener('click', doLogout);
    refreshAuthUI();
  });
})();
