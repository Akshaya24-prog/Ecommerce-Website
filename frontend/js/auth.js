// auth.js
// Form handlers for login.html and register.html.

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorBox = document.getElementById("authError");
      const submitBtn = loginForm.querySelector("button[type=submit]");
      errorBox.hidden = true;
      submitBtn.disabled = true;
      submitBtn.textContent = "Logging in…";

      try {
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        const data = await api.post("/auth/login/", { username, password });
        setAuthData({ access: data.access, refresh: data.refresh, user: data.user });
        showToast(`Welcome back, ${data.user.username}!`, "success");
        window.location.href = data.user.role === "admin" ? "admin-dashboard.html" : "index.html";
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = "Log in";
      }
    });
  }

  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorBox = document.getElementById("authError");
      const submitBtn = registerForm.querySelector("button[type=submit]");
      errorBox.hidden = true;

      const password = document.getElementById("regPassword").value;
      const password2 = document.getElementById("regPassword2").value;
      if (password !== password2) {
        errorBox.textContent = "Passwords do not match.";
        errorBox.hidden = false;
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Creating account…";

      try {
        const payload = {
          username: document.getElementById("regUsername").value.trim(),
          email: document.getElementById("regEmail").value.trim(),
          password: password,
          password2: password2,
          phone_number: document.getElementById("regPhone").value.trim(),
        };
        await api.post("/auth/register/", payload);
        showToast("Account created! Please log in.", "success");
        window.location.href = "login.html";
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = "Create account";
      }
    });
  }
});
