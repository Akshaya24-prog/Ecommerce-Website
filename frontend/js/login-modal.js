// login-modal.js
// Inline login modal for the catalog page.
// openLoginModal(afterLoginFn) — opens the modal; afterLoginFn is called after a
// successful login so the interrupted action (e.g. add to cart) can resume.

(function () {
  const overlay = document.getElementById("loginModal");
  if (!overlay) return;

  const form       = document.getElementById("loginModalForm");
  const errorBox   = document.getElementById("loginModalError");
  const submitBtn  = document.getElementById("loginModalSubmit");
  const closeBtn   = document.getElementById("loginModalClose");

  let _afterLogin = null;

  const titleEl    = overlay.querySelector(".modal-head h2");
  const subtitleEl = overlay.querySelector("p");
  const DEFAULT_TITLE    = titleEl    ? titleEl.textContent    : "Sign in to continue";
  const DEFAULT_SUBTITLE = subtitleEl ? subtitleEl.textContent : "";

  function open(afterLogin, options) {
    _afterLogin = afterLogin || null;
    if (titleEl)    titleEl.textContent    = (options && options.title)    || DEFAULT_TITLE;
    if (subtitleEl) subtitleEl.textContent = (options && options.subtitle) || DEFAULT_SUBTITLE;
    form.reset();
    errorBox.hidden = true;
    errorBox.textContent = "";
    overlay.hidden = false;
    document.getElementById("loginModalUsername").focus();
  }

  function close() {
    overlay.hidden = true;
    _afterLogin = null;
  }

  window.openLoginModal = open;

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !overlay.hidden) close(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.hidden = true;
    submitBtn.disabled = true;
    const orig = submitBtn.textContent;
    submitBtn.textContent = "Signing in…";

    try {
      const username = document.getElementById("loginModalUsername").value.trim();
      const password = document.getElementById("loginModalPassword").value;
      const data = await api.post("/auth/login/", { username, password });
      setAuthData({ access: data.access, refresh: data.refresh, user: data.user });
      showToast(`Welcome back, ${data.user.username}!`, "success");
      close();
      if (window.renderNavActions) window.renderNavActions();
      if (window.toggleAdminLink) window.toggleAdminLink();
      if (_afterLogin) { const cb = _afterLogin; _afterLogin = null; cb(); }
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = orig;
    }
  });
})();
