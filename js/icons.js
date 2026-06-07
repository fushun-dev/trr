/**
 * Inline monoline SVG icon set (high-class, no emoji).
 * Usage:
 *   - Static HTML:  <span class="icon" data-icon="cart"></span>
 *   - From JS:      ICON('cart', 'icon')   // returns an <svg> string
 * Icons inherit `currentColor` and scale with font-size (1em).
 */
(function () {
  const P = (paths, opts = {}) =>
    `<svg viewBox="0 0 24 24" fill="${opts.fill || 'none'}" stroke="${opts.stroke || 'currentColor'}" ` +
    `stroke-width="${opts.sw || 1.8}" stroke-linecap="round" stroke-linejoin="round" ` +
    `width="1em" height="1em" aria-hidden="true">${paths}</svg>`;

  const ICONS = {
    // brand rice-roll mark (filled, for logo/fallback)
    roll:
      '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">' +
      '<rect x="7" y="3" width="10" height="18" rx="5" fill="currentColor" opacity="0.16"/>' +
      '<rect x="7" y="3" width="10" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
      '<rect x="7" y="10" width="10" height="4.4" fill="currentColor"/>' +
      '<circle cx="10.4" cy="6.6" r="0.7" fill="currentColor"/>' +
      '<circle cx="13.4" cy="6.1" r="0.7" fill="currentColor"/>' +
      '<circle cx="11.2" cy="18" r="0.7" fill="currentColor"/></svg>',
    cart: P('<circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/><path d="M2.5 3h2l2.2 12.3a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.3L21 7H6"/>'),
    pickup: P('<path d="M4 9.5 5.2 5h13.6L20 9.5"/><path d="M4 9.5h16v9.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M9 20v-5h6v5"/>'),
    delivery: P('<rect x="1.5" y="6" width="12" height="9" rx="1"/><path d="M13.5 9h4l3 3.2V15h-7z"/><circle cx="6" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/>'),
    clock: P('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    pin: P('<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
    check: P('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.6 2.6L16 9.5"/>'),
    chat: P('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/>'),
    plus: P('<path d="M12 5v14M5 12h14"/>'),
    minus: P('<path d="M5 12h14"/>'),
    user: P('<circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6"/>'),
    logout: P('<path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3"/><path d="M10 12H3m0 0 3.5-3.5M3 12l3.5 3.5"/>'),
    tag: P('<path d="M3.5 12.5 11 5h7.5a1 1 0 0 1 1 1V13.5L12 21z"/><circle cx="15.5" cy="8.5" r="1.3"/>'),
    ticket: P('<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4z"/><path d="M14 6v12" stroke-dasharray="1.5 2"/>'),
    megaphone: P('<path d="M3 11v2a1 1 0 0 0 1 1h2l9 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M18 9a4 4 0 0 1 0 6"/>'),
    chart: P('<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7" y="11" width="3" height="6"/><rect x="12.5" y="7" width="3" height="10"/><rect x="18" y="13" width="3" height="4"/>'),
    gear: P('<circle cx="12" cy="12" r="3.2"/><path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
    box: P('<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>'),
    menu: P('<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>'),
    layers: P('<path d="M12 3 3 8l9 5 9-5z"/><path d="M3 13l9 5 9-5"/>'),
    users: P('<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.3 2.9-5 6.5-5s6.5 1.7 6.5 5"/><path d="M16 5.2A3.2 3.2 0 0 1 16 11"/><path d="M17.5 14.6c2.4.5 4 2 4 4.4"/>'),
    trash: P('<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>'),
    edit: P('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 5l4 4"/>'),
    share: P('<path d="M12 15V3m0 0 4 4m-4-4-4 4"/><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/>'),
    homeplus: P('<path d="M4 11 12 4l8 7"/><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9"/><path d="M12 13v4M10 15h4"/>'),
    refresh: P('<path d="M20 11a8 8 0 1 0-1 5"/><path d="M20 5v6h-6"/>'),
    sparkle: P('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>'),
    money: P('<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>'),
    bank: P('<path d="M3 9 12 4l9 5"/><path d="M4 9v8M9 9v8M15 9v8M20 9v8"/><path d="M3 20h18"/>'),
    card: P('<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 9.5h19"/><path d="M6 14.5h4"/>'),
    store: P('<path d="M4 9.5 5.2 5h13.6L20 9.5"/><path d="M4 9.5h16v9.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M9 20v-5h6v5"/>'),
    image: P('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5L5 20"/>'),
    globe: P('<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/>'),
    bag: P('<path d="M6 8h12l-1 12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
    chevron: P('<path d="M6 9l6 6 6-6"/>'),
    book: P('<path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h12"/>'),
    bell: P('<path d="M6 9a6 6 0 0 1 12 0c0 4.5 1.5 5.5 2 6H4c.5-.5 2-1.5 2-6z"/><path d="M10 19a2 2 0 0 0 4 0"/>'),
    back: P('<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>'),
  };

  window.ICON = (name, cls) => {
    let svg = ICONS[name] || ICONS.roll;
    if (cls) svg = svg.replace('<svg ', `<svg class="${cls}" `);
    return svg;
  };

  function inject(root = document) {
    root.querySelectorAll('[data-icon]').forEach((el) => {
      if (el.dataset.iconDone) return;
      el.innerHTML = ICON(el.dataset.icon);
      el.dataset.iconDone = '1';
    });
  }
  window.injectIcons = inject;
  document.addEventListener('DOMContentLoaded', () => inject());
})();
