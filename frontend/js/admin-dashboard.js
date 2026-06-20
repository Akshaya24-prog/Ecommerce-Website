// admin-dashboard.js
// Admin dashboard (admin-dashboard.html): aggregate stats plus a quick look
// at the most recent orders.

(function () {
  const statProducts = document.getElementById("statProducts");
  if (!statProducts) return; // not on the admin dashboard page

  const statOrders = document.getElementById("statOrders");
  const statPending = document.getElementById("statPending");
  const statRevenue = document.getElementById("statRevenue");
  const recentOrdersTable = document.getElementById("recentOrdersTable");

  function renderRecentOrders(orders) {
    if (!orders.length) {
      recentOrdersTable.innerHTML = emptyStateHtml(
        "No orders yet",
        "Orders will appear here once customers start checking out."
      );
      return;
    }
    const rows = orders
      .slice(0, 8)
      .map(
        (o) => `
          <tr>
            <td>#${o.id}</td>
            <td>${escapeHtml(o.username)}</td>
            <td>${formatDate(o.created_at)}</td>
            <td><span class="status-badge status-${escapeHtml(o.status)}">${escapeHtml(o.status)}</span></td>
            <td class="num">${formatPrice(o.total_amount)}</td>
          </tr>
        `
      )
      .join("");
    recentOrdersTable.innerHTML = `
      <table>
        <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Status</th><th>Total</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  async function loadStats() {
    try {
      const [products, orders] = await Promise.all([
        api.getAll("/products/"),
        api.getAll("/orders/"),
      ]);

      statProducts.textContent = products.length;
      statOrders.textContent = orders.length;

      const pending = orders.filter((o) => o.status === "pending");
      statPending.textContent = pending.length;

      const revenue = orders
        .filter((o) => o.status !== "cancelled")
        .reduce((sum, o) => sum + Number(o.total_amount), 0);
      statRevenue.textContent = formatPrice(revenue);

      renderRecentOrders(orders);
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  loadStats();
})();
