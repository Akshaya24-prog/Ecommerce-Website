// checkout.js
// Checkout page (checkout.html): shows the order summary, collects shipping
// info, and submits the checkout request.

(function () {
  const form = document.getElementById("checkoutForm");
  if (!form) return; // not on the checkout page

  const itemsContainer = document.getElementById("checkoutItems");
  const totalEl = document.getElementById("checkoutTotal");
  const errorBox = document.getElementById("checkoutError");
  const placeOrderBtn = document.getElementById("placeOrderBtn");

  async function loadSummary() {
    try {
      const cart = await api.get("/orders/cart/");
      if (!cart.items || !cart.items.length) {
        showToast("Your cart is empty.", "info");
        window.location.href = "cart.html";
        return;
      }
      itemsContainer.innerHTML = cart.items
        .map(
          (item) => `
            <div class="summary-row">
              <span>${escapeHtml(item.product.name)} × ${item.quantity}</span>
              <span>${formatPrice(item.subtotal)}</span>
            </div>
          `
        )
        .join("");
      totalEl.textContent = formatPrice(cart.total_price);
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.hidden = true;
    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = "Placing order…";

    try {
      const payload = {
        shipping_address: document.getElementById("shippingAddress").value.trim(),
        contact_phone: document.getElementById("contactPhone").value.trim(),
      };
      const order = await api.post("/orders/checkout/", payload);
      if (window.refreshCartBadge) window.refreshCartBadge();
      showToast(`Order #${order.id} placed!`, "success");
      window.location.href = "orders.html";
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.hidden = false;
      placeOrderBtn.disabled = false;
      placeOrderBtn.textContent = "Place Order";
    }
  });

  loadSummary();
})();
