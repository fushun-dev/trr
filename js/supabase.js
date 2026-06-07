/**
 * Supabase client + shared data/UI helpers used across the storefront and admin.
 * Loads after config.js and the Supabase UMD bundle.
 */
(function () {
  const cfg = window.TRR_CONFIG;

  // Initialise the client only when configured. Pages still render a demo
  // menu when credentials are absent so the site is previewable on GitHub Pages.
  window.sb = window.TRR_CONFIGURED
    ? supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  // ---- formatting ---------------------------------------------------------
  window.money = (n) => `${cfg.CURRENCY} ${Number(n || 0).toFixed(2)}`;

  // ---- toast notifications ------------------------------------------------
  window.showToast = function (msg, type = 'info') {
    let host = document.getElementById('toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toast-host';
      host.className = 'toast-host';
      document.body.appendChild(host);
    }
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 3200);
  };

  // ---- auth helpers -------------------------------------------------------
  window.getSession = async function () {
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session || null;
  };

  window.getProfile = async function () {
    const session = await getSession();
    if (!session) return null;
    const { data } = await sb
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    return data || null;
  };

  window.requireConfig = function () {
    if (!window.TRR_CONFIGURED) {
      showToast('Supabase is not configured yet — see js/config.js', 'error');
      return false;
    }
    return true;
  };

  // ---- in-app dialogs (replace native confirm/prompt) --------------------
  const T = (k, fb) => (window.I18N ? I18N.t(k) : fb);

  window.confirmDialog = function (message, opts = {}) {
    return new Promise((resolve) => {
      const host = document.createElement('div');
      host.className = 'modal-backdrop open';
      host.style.zIndex = 95;
      host.innerHTML =
        `<div class="modal p-6" style="max-width:380px">
          <p class="text-gray-800 font-semibold text-base mb-5">${message}</p>
          <div class="flex gap-2 justify-end">
            <button class="btn btn-ghost" data-no>${opts.cancel || T('dlg.cancel', 'Cancel')}</button>
            <button class="btn ${opts.danger ? '!bg-red-600 !text-white' : 'btn-primary'}" data-yes>${opts.ok || T('dlg.confirm', 'Confirm')}</button>
          </div>
        </div>`;
      document.body.appendChild(host);
      const close = (v) => { host.remove(); resolve(v); };
      host.querySelector('[data-yes]').onclick = () => close(true);
      host.querySelector('[data-no]').onclick = () => close(false);
      host.onclick = (e) => { if (e.target === host) close(false); };
      host.querySelector('[data-yes]').focus();
    });
  };

  window.promptDialog = function (message, def = '', opts = {}) {
    return new Promise((resolve) => {
      const host = document.createElement('div');
      host.className = 'modal-backdrop open';
      host.style.zIndex = 95;
      host.innerHTML =
        `<div class="modal p-6" style="max-width:380px">
          <p class="text-gray-800 font-semibold mb-3">${message}</p>
          <input class="field" type="${opts.type || 'text'}" value="${String(def).replace(/"/g, '&quot;')}" />
          <div class="flex gap-2 justify-end mt-4">
            <button class="btn btn-ghost" data-no>${T('dlg.cancel', 'Cancel')}</button>
            <button class="btn btn-primary" data-yes>${T('dlg.ok', 'OK')}</button>
          </div>
        </div>`;
      document.body.appendChild(host);
      const input = host.querySelector('input');
      const close = (v) => { host.remove(); resolve(v); };
      host.querySelector('[data-yes]').onclick = () => close(input.value);
      host.querySelector('[data-no]').onclick = () => close(null);
      host.onclick = (e) => { if (e.target === host) close(null); };
      input.onkeydown = (e) => { if (e.key === 'Enter') close(input.value); if (e.key === 'Escape') close(null); };
      setTimeout(() => { input.focus(); input.select(); }, 30);
    });
  };

  // ---- click-outside / Escape to close any modal or drawer ---------------
  document.addEventListener('click', (e) => {
    const t = e.target;
    // close a modal when its backdrop (not its inner card) is clicked
    if (t.classList && t.classList.contains('modal-backdrop') && t.classList.contains('open')) {
      t.classList.remove('open');
      document.body.classList.remove('no-scroll');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal-backdrop.open, .drawer.open, .drawer-backdrop.open, .ios-sheet-backdrop.open')
      .forEach((el) => el.classList.remove('open'));
    document.body.classList.remove('no-scroll');
  });
})();
