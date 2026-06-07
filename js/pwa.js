/**
 * Install-as-app banner (HSI-style).
 * - Android / desktop Chrome: captures `beforeinstallprompt` and shows an
 *   "Install" button that triggers the native prompt.
 * - iOS Safari: shows "Add to Home Screen" instructions (no native prompt).
 * Dismissals are remembered for ~14 days.
 */
(function () {
  const DISMISS_KEY = 'trr_install_dismissed';
  let deferredPrompt = null;

  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const isiOS = () =>
    /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

  function recentlyDismissed() {
    const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - t < 14 * 24 * 60 * 60 * 1000;
  }
  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    hide();
  }
  function hide() {
    document.getElementById('install-banner')?.classList.remove('show');
    document.getElementById('ios-install-sheet')?.classList.remove('open');
  }
  function show() {
    if (isStandalone() || recentlyDismissed()) return;
    const banner = document.getElementById('install-banner');
    if (banner) banner.classList.add('show');
  }

  // Android / desktop: native install flow
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    show();
  });

  window.addEventListener('appinstalled', () => {
    hide();
    showToast?.('App installed — find it on your home screen!', 'success');
  });

  async function doInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (outcome === 'accepted') hide();
      else dismiss();
    } else if (isiOS()) {
      document.getElementById('ios-install-sheet')?.classList.add('open');
    } else {
      showToast?.('Use your browser menu → "Install app" / "Add to Home screen".', 'info');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('install-btn')?.addEventListener('click', doInstall);
    document.getElementById('install-dismiss')?.addEventListener('click', dismiss);
    document.getElementById('ios-sheet-close')?.addEventListener('click', hide);
    document.getElementById('ios-install-sheet')?.addEventListener('click', (e) => {
      if (e.target.id === 'ios-install-sheet') hide();
    });

    // iOS never fires beforeinstallprompt — show the banner proactively.
    if (isiOS() && !isStandalone() && !recentlyDismissed()) {
      setTimeout(show, 1500);
    }
  });
})();
