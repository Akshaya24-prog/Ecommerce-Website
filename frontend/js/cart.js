// cart.js
// Cart page (cart.html): list items, change quantities, remove items, and
// show running totals.

(function () {
  const container = document.getElementById("cartItemsContainer");
  if (!container) return; // not on the cart page

  const subtotalEl = document.getElementById("summarySubtotal");
  const totalEl = document.getElementById("summaryTotal");
  const checkoutBtn = document.getElementById("checkoutBtn");

  function itemThumb(item) {
    const product = item.product;
    const src = product.image_url || product.image;
    if (src) {
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(product.name)}">`;
    }
    return initials(product.name);
  }

  function render(cart) {
    const items = cart.items || [];
    if (!items.length) {
      container.innerHTML = emptyStateHtml(
        "Your cart is empty",
        "Browse the catalog and add something you like."
      );
      if (checkoutBtn) checkoutBtn.disabled = true;
    } else {
      container.innerHTML = items
        .map(
          (item) => `
            <div class="cart-item" data-item-id="${item.id}">
              <div class="cart-item-thumb">${itemThumb(item)}</div>
              <div>
                <div class="cart-item-name">${escapeHtml(item.product.name)}</div>
                <div class="cart-item-meta">${formatPrice(item.product.price)} each · ${item.product.stock} in stock</div>
              </div>
              <div class="qty-control">
                <button type="button" data-action="dec" aria-label="Decrease quantity">−</button>
                <input type="number" value="${item.quantity}" min="1" max="${item.product.stock}" data-qty>
                <button type="button" data-action="inc" aria-label="Increase quantity">+</button>
              </div>
              <button type="button" class="cart-item-remove" data-remove>Remove</button>
            </div>
          `
        )
        .join("");
      if (checkoutBtn) checkoutBtn.disabled = false;
    }

    if (subtotalEl) subtotalEl.textContent = formatPrice(cart.total_price);
    if (totalEl) totalEl.textContent = formatPrice(cart.total_price);
  }

  async function loadCart() {
    container.innerHTML = '<div class="loading-row">Loading your cart…</div>';
    try {
      const cart = await api.get("/orders/cart/");
      render(cart);
    } catch (err) {
      container.innerHTML = emptyStateHtml("Couldn't load your cart", err.message);
    }
  }

  async function updateQuantity(itemId, quantity) {
    try {
      const cart = await api.patch(`/orders/cart/items/${itemId}/`, { quantity });
      render(cart);
      if (window.refreshCartBadge) window.refreshCartBadge();
    } catch (err) {
      showToast(err.message, "error");
      loadCart();
    }
  }

  async function removeItem(itemId) {
    try {
      const cart = await api.delete(`/orders/cart/items/${itemId}/`);
      render(cart);
      showToast("Item removed.", "success");
      if (window.refreshCartBadge) window.refreshCartBadge();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  container.addEventListener("click", (e) => {
    const row = e.target.closest(".cart-item");
    if (!row) return;
    const itemId = row.dataset.itemId;

    const qtyBtn = e.target.closest("button[data-action]");
    if (qtyBtn) {
      const input = row.querySelector("[data-qty]");
      const max = Number(input.max) || 999;
      let val = Number(input.value) || 1;
      val = qtyBtn.dataset.action === "inc" ? Math.min(val + 1, max) : Math.max(val - 1, 1);
      input.value = val;
      updateQuantity(itemId, val);
      return;
    }

    if (e.target.closest("[data-remove]")) {
      removeItem(itemId);
    }
  });

  container.addEventListener("change", (e) => {
    const input = e.target.closest("[data-qty]");
    if (!input) return;
    const row = input.closest(".cart-item");
    const itemId = row.dataset.itemId;
    const val = Math.max(1, Math.min(Number(input.value) || 1, Number(input.max) || 999));
    input.value = val;
    updateQuantity(itemId, val);
  });

  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
      window.location.href = "checkout.html";
    });
  }

  loadCart();
})();
