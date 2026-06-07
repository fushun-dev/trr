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
})();
