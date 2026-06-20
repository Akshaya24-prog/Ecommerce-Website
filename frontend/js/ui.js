// ui.js
// Small, shared UI helpers used across every page: toasts, safe HTML
// escaping, and consistent price/date formatting.

function showToast(message, type) {
  let stack = document.getElementById("toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toast-stack";
    document.body.appendChild(stack);
  }
  const toast = document.createElement("div");
  let cls = "toast";
  if (type === "error") cls += " toast-error";
  if (type === "success") cls += " toast-success";
  toast.className = cls;
  toast.textContent = message;
  stack.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "opacity 0.2s ease";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 200);
  }, 3200);
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value === undefined || value === null ? "" : String(value);
  return div.innerHTML;
}

function formatPrice(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "₹0.00";
  return "₹" + num.toFixed(2);
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const datePart = date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  const timePart = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

// Returns the initial letter(s) of a product/category name, used as a
// placeholder inside .product-thumb / .cart-item-thumb when there's no image.
function initials(name) {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase();
}

function setLoading(el, isLoading, message) {
  if (!el) return;
  if (isLoading) {
    el.innerHTML = `<div class="loading-row">${escapeHtml(message || "Loading…")}</div>`;
  }
}

function emptyStateHtml(title, body) {
  return `
    <div class="empty-state">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body || "")}</p>
    </div>
  `;
}
