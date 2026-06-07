/**
 * Shopping cart — persisted in localStorage so it survives reloads.
 * Cart item shape: { id, name, price, qty }
 */
(function () {
  const KEY = 'trr_cart_v1';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  }
  function write(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    document.dispatchEvent(new CustomEvent('cart:changed'));
  }

  window.Cart = {
    items: read,
    count() { return read().reduce((n, i) => n + i.qty, 0); },
    subtotal() { return read().reduce((s, i) => s + i.price * i.qty, 0); },

    add(product, qty = 1) {
      const items = read();
      const found = items.find((i) => i.id === product.id);
      if (found) found.qty += qty;
      else items.push({ id: product.id, name: product.name, price: Number(product.price), qty });
      write(items);
    },
    setQty(id, qty) {
      let items = read();
      const it = items.find((i) => i.id === id);
      if (!it) return;
      it.qty = qty;
      if (it.qty <= 0) items = items.filter((i) => i.id !== id);
      write(items);
    },
    remove(id) { write(read().filter((i) => i.id !== id)); },
    clear() { write([]); },
  };
})();
