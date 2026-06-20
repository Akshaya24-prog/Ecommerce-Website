// admin-orders.js
// Admin order management (admin-orders.html): filter by status, inspect
// line items inline, and update order status with a dropdown.

(function () {
  const tableContainer = document.getElementById("ordersTableContainer");
  if (!tableContainer) return; // not on the admin orders page

  const statusFilter = document.getElementById("statusFilter");
  const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

  function statusOptions(current) {
    return STATUSES.map(
      (s) => `<option value="${s}" ${s === current ? "selected" : ""}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
    ).join("");
  }

  function renderTable(orders) {
    if (!orders.length) {
      tableContainer.innerHTML = emptyStateHtml("No orders found", "Try a different status filter.");
      return;
    }
    const rows = orders
      .map((o) => {
        const itemsSummary = o.items.map((i) => `${escapeHtml(i.product_name)} × ${i.quantity}`).join(", ");
        return `
          <tr data-id="${o.id}">
            <td>#${o.id}</td>
            <td>${escapeHtml(o.username)}</td>
            <td>${formatDate(o.created_at)}</td>
            <td class="num">${formatPrice(o.total_amount)}</td>
            <td><select class="status-select" data-status="${o.id}">${statusOptions(o.status)}</select></td>
            <td class="table-actions">
              <button type="button" class="btn btn-outline btn-sm" data-toggle-details="${o.id}">Details</button>
            </td>
          </tr>
          <tr class="order-details-row" data-details-for="${o.id}" hidden>
            <td colspan="6">
              <div class="order-meta" style="margin-bottom: 8px;">
                Shipping to: ${escapeHtml(o.shipping_address)}${o.contact_phone ? " · " + escapeHtml(o.contact_phone) : ""}
              </div>
              <div>${itemsSummary || "No items"}</div>
            </td>
          </tr>
        `;
      })
      .join("");
    tableContainer.innerHTML = `
      <table>
        <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  async function loadOrders() {
    tableContainer.innerHTML = '<div class="loading-row">Loading orders…</div>';
    try {
      const params = statusFilter && statusFilter.value ? { status: statusFilter.value } : {};
      const orders = await api.getAll("/orders/", params);
      renderTable(orders);
    } catch (err) {
      tableContainer.innerHTML = emptyStateHtml("Couldn't load orders", err.message);
    }
  }

  tableContainer.addEventListener("change", async (e) => {
    const select = e.target.closest("[data-status]");
    if (!select) return;
    const orderId = select.dataset.status;
    const newStatus = select.value;
    select.disabled = true;
    try {
      await api.patch(`/orders/${orderId}/status/`, { status: newStatus });
      showToast(`Order #${orderId} marked ${newStatus}.`, "success");
    } catch (err) {
      showToast(err.message, "error");
      loadOrders();
    } finally {
      select.disabled = false;
    }
  });

  tableContainer.addEventListener("click", (e) => {
    const toggleBtn = e.target.closest("[data-toggle-details]");
    if (!toggleBtn) return;
    const id = toggleBtn.dataset.toggleDetails;
    const row = tableContainer.querySelector(`[data-details-for="${id}"]`);
    if (row) row.hidden = !row.hidden;
  });

  if (statusFilter) {
    statusFilter.addEventListener("change", loadOrders);
  }

  loadOrders();
})();
