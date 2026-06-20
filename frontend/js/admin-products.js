// admin-products.js
// Admin product management (admin-products.html): list/search products,
// and create, edit (including image upload), or delete them via a modal.

(function () {
  const tableContainer = document.getElementById("productsTableContainer");
  if (!tableContainer) return; // not on the admin products page

  const searchInput = document.getElementById("productSearchInput");
  const addBtn = document.getElementById("addProductBtn");

  const overlay = document.getElementById("productModalOverlay");
  const modalTitle = document.getElementById("productModalTitle");
  const closeBtn = document.getElementById("productModalClose");
  const cancelBtn = document.getElementById("productCancelBtn");
  const form = document.getElementById("productForm");
  const errorBox = document.getElementById("productFormError");
  const saveBtn = document.getElementById("productSaveBtn");
  const categorySelect = document.getElementById("productCategory");

  let searchTimer = null;

  function thumbCell(p) {
    const src = p.image_url || p.image;
    if (src) return `<img src="${escapeHtml(src)}" alt="">`;
    return initials(p.name);
  }

  function renderTable(products) {
    if (!products.length) {
      tableContainer.innerHTML = emptyStateHtml(
        "No products found",
        "Try a different search, or add your first product."
      );
      return;
    }
    const rows = products
      .map(
        (p) => `
          <tr data-id="${p.id}">
            <td><div class="thumb-cell">${thumbCell(p)}</div></td>
            <td>${escapeHtml(p.name)}</td>
            <td>${escapeHtml(p.category_name || "—")}</td>
            <td class="num">${formatPrice(p.price)}</td>
            <td class="num">${p.stock}</td>
            <td>${p.is_active ? "Active" : "Hidden"}</td>
            <td class="table-actions">
              <button type="button" class="btn btn-outline btn-sm" data-edit="${p.id}">Edit</button>
              <button type="button" class="btn btn-danger btn-sm" data-delete="${p.id}">Delete</button>
            </td>
          </tr>
        `
      )
      .join("");
    tableContainer.innerHTML = `
      <table>
        <thead><tr><th></th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  async function loadProducts(search) {
    tableContainer.innerHTML = '<div class="loading-row">Loading products…</div>';
    try {
      const products = await api.getAll("/products/", { search: search || "" });
      renderTable(products);
    } catch (err) {
      tableContainer.innerHTML = emptyStateHtml("Couldn't load products", err.message);
    }
  }

  async function loadCategories() {
    try {
      const categories = await api.getAll("/products/categories/");
      categorySelect.innerHTML =
        '<option value="">Uncategorized</option>' +
        categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
    } catch (err) {
      // Non-fatal — the admin can still manage products without the
      // category dropdown populated.
    }
  }

  function openModal(product) {
    form.reset();
    errorBox.hidden = true;
    document.getElementById("productId").value = product ? product.id : "";
    modalTitle.textContent = product ? "Edit Product" : "Add Product";
    document.getElementById("productName").value = product ? product.name : "";
    document.getElementById("productPrice").value = product ? product.price : "";
    document.getElementById("productStock").value = product ? product.stock : "";
    document.getElementById("productDescription").value = product ? product.description : "";
    document.getElementById("productImageUrl").value = product ? (product.image_url || "") : "";
    document.getElementById("productActive").checked = product ? product.is_active : true;
    categorySelect.value = product && product.category ? product.category : "";
    overlay.hidden = false;
  }

  function closeModal() {
    overlay.hidden = true;
  }

  addBtn.addEventListener("click", () => openModal(null));
  closeBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  tableContainer.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit]");
    if (editBtn) {
      try {
        const product = await api.get(`/products/${editBtn.dataset.edit}/`);
        openModal(product);
      } catch (err) {
        showToast(err.message, "error");
      }
      return;
    }

    const deleteBtn = e.target.closest("[data-delete]");
    if (deleteBtn) {
      if (!confirm("Delete this product? This cannot be undone.")) return;
      try {
        await api.delete(`/products/${deleteBtn.dataset.delete}/`);
        showToast("Product deleted.", "success");
        broadcastEvent("product_changed");
        loadProducts(searchInput.value.trim());
      } catch (err) {
        showToast(err.message, "error");
      }
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.hidden = true;
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    const id = document.getElementById("productId").value;
    const categoryVal = categorySelect.value;
    const body = {
      name: document.getElementById("productName").value.trim(),
      price: document.getElementById("productPrice").value,
      stock: document.getElementById("productStock").value,
      description: document.getElementById("productDescription").value,
      is_active: document.getElementById("productActive").checked,
      image_url: document.getElementById("productImageUrl").value.trim(),
      category: categoryVal || null,
    };

    try {
      if (id) {
        await api.patch(`/products/${id}/`, body);
        showToast("Product updated.", "success");
      } else {
        await api.post("/products/", body);
        showToast("Product created.", "success");
      }
      broadcastEvent("product_changed");
      closeModal();
      loadProducts(searchInput.value.trim());
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.hidden = false;
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Product";
    }
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => loadProducts(searchInput.value.trim()), 350);
    });
  }

  loadCategories();
  loadProducts();
})();
