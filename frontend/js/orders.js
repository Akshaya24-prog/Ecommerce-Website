// orders.js
// "My Orders" page (orders.html): expandable order history for the
// logged-in customer, with a cancel action while an order is still pending.

(function () {
  const list = document.getElementById("ordersList");
  if (!list) return; // not on the orders page

  function render(orders) {
    if (!orders.length) {
      list.innerHTML = emptyStateHtml("No orders yet", "Once you place an order, it'll show up here.");
      return;
    }

    list.innerHTML = orders
      .map((order) => {
        const itemRows = order.items
          .map(
            (item) => `
              <div class="order-line">
                <span>${escapeHtml(item.product_name)} × ${item.quantity}</span>
                <span>${formatPrice(item.subtotal)}</span>
              </div>
            `
          )
          .join("");
        const canCancel = order.status === "pending";

        return `
          <div class="order-card" data-order-id="${order.id}">
            <div class="order-card-head" data-toggle>
              <div>
                <div class="order-id">Order #${order.id}</div>
                <div class="order-meta">${formatDate(order.created_at)}</div>
              </div>
              <div class="order-head-right">
                <span class="price-tag">${formatPrice(order.total_amount)}</span>
                <span class="status-badge status-${escapeHtml(order.status)}">${escapeHtml(order.status)}</span>
                <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </div>
            </div>
            <div class="order-card-body">
              <div class="order-meta" style="margin-bottom: 10px;">Shipping to: ${escapeHtml(order.shipping_address)}</div>
              ${itemRows}
              ${
                canCancel
                  ? `<div class="order-actions"><button type="button" class="btn btn-outline btn-sm" data-cancel="${order.id}">Cancel order</button></div>`
                  : ""
              }
            </div>
          </div>
        `;
      })
      .join("");
  }

  async function loadOrders() {
    list.innerHTML = '<div class="loading-row">Loading your orders…</div>';
    try {
      const orders = await api.getAll("/orders/");
      render(orders);
    } catch (err) {
      list.innerHTML = emptyStateHtml("Couldn't load orders", err.message);
    }
  }

  list.addEventListener("click", async (e) => {
    const cancelBtn = e.target.closest("[data-cancel]");
    if (cancelBtn) {
      e.stopPropagation();
      if (!confirm("Cancel this order? This cannot be undone.")) return;
      try {
        await api.patch(`/orders/${cancelBtn.dataset.cancel}/cancel/`);
        showToast("Order cancelled.", "success");
        loadOrders();
      } catch (err) {
        showToast(err.message, "error");
      }
      return;
    }

    const head = e.target.closest("[data-toggle]");
    if (head) {
      head.closest(".order-card").classList.toggle("open");
    }
  });

  if (typeof BroadcastChannel !== "undefined") {
    new BroadcastChannel("ecom_updates").onmessage = function (e) {
      if (e.data.type === "order_changed") loadOrders();
    };
  }

  loadOrders();
})();
