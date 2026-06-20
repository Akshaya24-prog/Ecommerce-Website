// products.js
// Catalog page (index.html): category filter sidebar, search, sorting, and
// adding items to the cart.

(function () {
  const grid = document.getElementById("productGrid");
  if (!grid) return; // not on the catalog page

  const categoryList = document.getElementById("categoryFilterList");
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");
  const heroProductCount = document.getElementById("heroProductCount");
  const heroCategoryCount = document.getElementById("heroCategoryCount");

  const state = { search: "", category: "", ordering: "" };
  let searchTimer = null;

  function productThumb(product) {
    const src = product.image_url || product.image;
    if (src) {
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(product.name)}">`;
    }
    return initials(product.name);
  }

  function renderProducts(products) {
    if (heroProductCount) heroProductCount.textContent = products.length;

    if (!products.length) {
      grid.innerHTML = emptyStateHtml(
        "No products found",
        "Try a different search term or category."
      );
      return;
    }

    grid.innerHTML = products
      .map((p) => {
        const outOfStock = !p.in_stock;
        return `
          <div class="product-card">
            <div class="product-thumb">
              ${productThumb(p)}
              ${outOfStock ? '<span class="stock-flag">Out of stock</span>' : ""}
            </div>
            <div class="product-body">
              <span class="product-category">${escapeHtml(p.category_name || "Uncategorized")}</span>
              <h3 class="product-name">${escapeHtml(p.name)}</h3>
              <p class="product-desc">${escapeHtml(p.description || "")}</p>
              <div class="product-footer">
                <span class="price-tag">${formatPrice(p.price)}</span>
              </div>
              <div class="add-to-cart-row">
                <div class="qty-control">
                  <button type="button" data-action="dec" aria-label="Decrease quantity" ${isAdmin() ? "disabled" : ""}>−</button>
                  <input type="number" value="1" min="1" max="${p.stock}" data-qty ${isAdmin() ? "disabled" : ""}>
                  <button type="button" data-action="inc" aria-label="Increase quantity" ${isAdmin() ? "disabled" : ""}>+</button>
                </div>
                <button type="button" class="btn btn-primary" data-add-to-cart="${p.id}" ${outOfStock || isAdmin() ? "disabled" : ""}>
                  ${outOfStock ? "Unavailable" : "Add to cart"}
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  async function loadProducts() {
    grid.innerHTML = '<div class="loading-row">Loading products…</div>';
    try {
      const products = await api.getAll("/products/", {
        search: state.search,
        category: state.category,
        ordering: state.ordering,
      });
      renderProducts(products);
    } catch (err) {
      grid.innerHTML = emptyStateHtml("Couldn't load products", err.message);
    }
  }

  async function loadCategories() {
    if (!categoryList) return;
    try {
      const categories = await api.getAll("/products/categories/");
      if (heroCategoryCount) heroCategoryCount.textContent = categories.length;
      const items = categories
        .map(
          (c) =>
            `<li><button type="button" data-category="${c.id}">${escapeHtml(c.name)} (${c.product_count})</button></li>`
        )
        .join("");
      categoryList.insertAdjacentHTML("beforeend", items);
    } catch (err) {
      // Filters are a nice-to-have; a failed fetch shouldn't block the page.
    }
  }

  if (categoryList) {
    categoryList.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-category]");
      if (!btn) return;
      categoryList.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.category = btn.dataset.category || "";
      loadProducts();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.search = searchInput.value.trim();
        loadProducts();
      }, 350);
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      state.ordering = sortSelect.value;
      loadProducts();
    });
  }

  grid.addEventListener("click", async (e) => {
    const qtyBtn = e.target.closest("button[data-action]");
    if (qtyBtn) {
      if (!isLoggedIn()) {
        if (window.openLoginModal) openLoginModal(() => {});
        return;
      }
      const input = qtyBtn.parentElement.querySelector("[data-qty]");
      const max = Number(input.max) || 999;
      let val = Number(input.value) || 1;
      val = qtyBtn.dataset.action === "inc" ? Math.min(val + 1, max) : Math.max(val - 1, 1);
      input.value = val;
      return;
    }

    const addBtn = e.target.closest("button[data-add-to-cart]");
    if (addBtn) {
      if (!isLoggedIn()) {
        if (window.openLoginModal) openLoginModal(() => addBtn.click());
        return;
      }
      const productId = addBtn.dataset.addToCart;
      const qtyInput = addBtn.closest(".product-body").querySelector("[data-qty]");
      const quantity = Number(qtyInput.value) || 1;

      addBtn.disabled = true;
      const originalText = addBtn.textContent;
      addBtn.textContent = "Adding…";
      try {
        await api.post("/orders/cart/items/", { product: productId, quantity });
        showToast("Added to cart.", "success");
        if (window.refreshCartBadge) window.refreshCartBadge();
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        addBtn.disabled = false;
        addBtn.textContent = originalText;
      }
    }
  });

  window.reloadProducts = loadProducts;

  loadCategories();
  loadProducts();
})();
