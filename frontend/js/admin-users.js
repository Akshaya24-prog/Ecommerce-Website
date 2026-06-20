(function () {
  const tableContainer = document.getElementById("usersTableContainer");
  if (!tableContainer) return;

  const searchInput = document.getElementById("userSearchInput");
  let allUsers = [];
  let searchTimer = null;

  function renderTable(users) {
    if (!users.length) {
      tableContainer.innerHTML = emptyStateHtml("No users found", "Try a different search term.");
      return;
    }
    const rows = users.map((u) => `
      <tr>
        <td>${escapeHtml(u.username)}</td>
        <td>${escapeHtml(u.email || "—")}</td>
        <td>${escapeHtml([u.first_name, u.last_name].filter(Boolean).join(" ") || "—")}</td>
        <td><span class="role-badge" style="font-size:0.75rem">${escapeHtml(u.role)}</span></td>
        <td>${escapeHtml(u.phone_number || "—")}</td>
        <td>${escapeHtml(u.address || "—")}</td>
        <td>${formatDate(u.date_joined)}</td>
      </tr>
    `).join("");

    tableContainer.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Full Name</th>
            <th>Role</th>
            <th>Phone</th>
            <th>Address</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function filterAndRender(query) {
    const q = (query || "").toLowerCase();
    if (!q) { renderTable(allUsers); return; }
    renderTable(allUsers.filter((u) =>
      (u.username || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.first_name || "").toLowerCase().includes(q) ||
      (u.last_name || "").toLowerCase().includes(q) ||
      (u.phone_number || "").includes(q)
    ));
  }

  async function loadUsers() {
    tableContainer.innerHTML = '<div class="loading-row">Loading users…</div>';
    try {
      const data = await api.getAll("/auth/users/");
      allUsers = data;
      renderTable(allUsers);
    } catch (err) {
      tableContainer.innerHTML = emptyStateHtml("Couldn't load users", err.message);
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => filterAndRender(searchInput.value.trim()), 300);
    });
  }

  loadUsers();
})();
