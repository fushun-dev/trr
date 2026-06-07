/**
 * Install-as-app banner (HSI-style) — always visible in the browser, hidden
 * only when the app is already running as an installed app (standalone).
 * - Android / desktop Chrome: captures `beforeinstallprompt` for the native prompt.
 * - iOS Safari / others: shows "Add to Home Screen" instructions.
 */
(function () {
  let deferredPrompt = null;

  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const isiOS = () =>
    /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

  function hide() {
    document.getElementById('install-banner')?.classList.remove('show');
    document.body.classList.remove('has-install-banner');
    document.getElementById('ios-install-sheet')?.classList.remove('open');
  }
  function show() {
    if (isStandalone()) return; // only hidden when opened as an installed app
    document.getElementById('install-banner')?.classList.add('show');
    document.body.classList.add('has-install-banner');
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
    } else {
      // No native prompt available (iOS, or already-dismissed Chrome) — show steps.
      document.getElementById('ios-install-sheet')?.classList.add('open');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('install-btn')?.addEventListener('click', doInstall);
    document.getElementById('footer-install')?.addEventListener('click', doInstall);
    document.getElementById('ios-sheet-close')?.addEventListener('click', () =>
      document.getElementById('ios-install-sheet')?.classList.remove('open'));
    document.getElementById('ios-install-sheet')?.addEventListener('click', (e) => {
      if (e.target.id === 'ios-install-sheet') e.currentTarget.classList.remove('open');
    });

    // Always show the banner in a normal browser; only hidden when installed.
    show();
  });
})();
