// nav.js
// Runs on every page. Guards routes that need auth/admin, fills in the
// navbar's logged-in state, and keeps the cart badge count up to date.

(function () {
  function guardRoute() {
    const body = document.body;
    if (body.dataset.requiresAdmin === "true") {
      if (!isLoggedIn()) {
        window.location.href = "login.html";
        return false;
      }
      if (!isAdmin()) {
        window.location.href = "index.html";
        return false;
      }
    } else if (body.dataset.requiresAuth === "true") {
      if (!isLoggedIn()) {
        window.location.href = "login.html";
        return false;
      }
    }
    return true;
  }

  function renderNavActions() {
    const container = document.getElementById("navActions");
    if (!container) return;

    if (!isLoggedIn()) {
      container.innerHTML = `
        <a href="login.html" class="btn btn-ghost btn-sm">Log in</a>
        <a href="register.html" class="btn btn-primary btn-sm">Sign up</a>
        <button type="button" class="btn btn-outline btn-sm" id="navAdminBtn">Admin</button>
      `;
      const adminBtn = document.getElementById("navAdminBtn");
      if (adminBtn) {
        adminBtn.addEventListener("click", () => {
          if (window.openLoginModal) {
            window.openLoginModal(
              function () {
                if (isAdmin()) {
                  window.location.href = "admin-products.html";
                } else {
                  showToast("This account does not have admin access.", "error");
                }
              },
              { title: "Admin Portal Login", subtitle: "Enter your admin credentials to continue." }
            );
          } else {
            window.location.href = "login.html";
          }
        });
      }
      return;
    }

    const user = getCurrentUser() || {};
    container.innerHTML = `
      ${!isAdmin() ? `<a href="cart.html" class="cart-link">Cart <span class="cart-badge" id="cartBadge">0</span></a>` : ""}
      <div class="user-pill">
        <span>${escapeHtml(user.username || "")}</span>
        <span class="role-badge">${escapeHtml(user.role || "")}</span>
      </div>
      <button type="button" class="btn btn-outline btn-sm" id="logoutBtn">Log out</button>
    `;

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", logout);

    refreshCartBadge();
  }

  function toggleAdminLink() {
    const link = document.getElementById("adminNavLink");
    if (link) link.hidden = !isAdmin();
  }

  function markActiveNav() {
    const page = document.body.dataset.page;
    if (!page) return;
    document.querySelectorAll("[data-nav]").forEach((el) => {
      const navVal = el.dataset.nav;
      const isMatch = navVal === page || (page.indexOf("admin") === 0 && navVal === "admin");
      el.classList.toggle("active", isMatch);
    });
  }

  async function refreshCartBadge() {
    const badge = document.getElementById("cartBadge");
    if (!badge || !isLoggedIn()) return;
    try {
      const cart = await api.get("/orders/cart/");
      badge.textContent = cart.total_items || 0;
    } catch (err) {
      // Leave the badge at its last known value — not worth surfacing an
      // error toast just for the count.
    }
  }
  window.refreshCartBadge = refreshCartBadge;
  window.renderNavActions = renderNavActions;
  window.toggleAdminLink = toggleAdminLink;

  function hideOrdersLinkForAdmin() {
    if (!isAdmin()) return;
    document.querySelectorAll("[data-nav='orders']").forEach((el) => {
      el.hidden = true;
    });
  }

  // ----- Theme toggle -----
  const THEME_KEY = "ecom_theme";
  const MOON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  const SUN_SVG  = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';

  // Apply saved theme immediately so there's no flash
  (function () {
    const saved = localStorage.getItem(THEME_KEY) || "light";
    document.documentElement.setAttribute("data-theme", saved);
  })();

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    const btn = document.getElementById("themeToggleBtn");
    if (btn) btn.innerHTML = theme === "dark" ? SUN_SVG : MOON_SVG;
  }

  function injectThemeToggle() {
    const navActions = document.getElementById("navActions");
    if (!navActions || document.getElementById("themeToggleBtn")) return;
    const theme = document.documentElement.getAttribute("data-theme") || "light";
    const btn = document.createElement("button");
    btn.id = "themeToggleBtn";
    btn.type = "button";
    btn.className = "theme-toggle";
    btn.setAttribute("aria-label", "Toggle light / dark theme");
    btn.innerHTML = theme === "dark" ? SUN_SVG : MOON_SVG;
    btn.addEventListener("click", function () {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      applyTheme(current === "dark" ? "light" : "dark");
    });
    navActions.parentElement.insertBefore(btn, navActions);
  }

  // Redirect already-logged-in users away from login/register pages
  const page = document.body.dataset.page;
  if ((page === "login" || page === "register") && isLoggedIn()) {
    window.location.href = isAdmin() ? "admin-dashboard.html" : "index.html";
  } else if (guardRoute()) {
    renderNavActions();
    toggleAdminLink();
    markActiveNav();
    hideOrdersLinkForAdmin();
    injectThemeToggle();
  }
})();
