document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector(".login-container form");
  const registerForm = document.getElementById("registerForm");

  if (loginForm) {
    const emailInput = loginForm.querySelector("#username");
    const passwordInput = loginForm.querySelector("#password");

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearErrors(loginForm);

      let isValid = true;
      if (!emailInput.value.trim()) {
        showError(emailInput, "Vui lòng nhập email.");
        isValid = false;
      }
      if (!passwordInput.value.trim()) {
        showError(passwordInput, "Vui lòng nhập mật khẩu.");
        isValid = false;
      }
      if (!isValid) return;

      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            email: emailInput.value.trim(),
            password: passwordInput.value,
          }),
        });

        let data;
        try {
          data = await res.json();
        } catch {
          const text = await res.text();
          console.error(
            "Non-JSON response (login):",
            res.status,
            text.slice(0, 200)
          );
          showError(
            loginForm.querySelector("button[type='submit']"),
            `Server trả ${res.status}. Có thể sai route/API không tồn tại.`
          );
          return;
        }

        if (!res.ok) {
          showError(
            loginForm.querySelector("button[type='submit']"),
            data.error || "Email hoặc mật khẩu không đúng."
          );
          return;
        }

        if (data.token) {
          localStorage.setItem("token", data.token);
          alert("Đăng nhập thành công!");
          window.location.href = "/index.html";
        } else {
          showError(
            loginForm.querySelector("button[type='submit']"),
            "Phản hồi không hợp lệ từ máy chủ."
          );
        }
      } catch (err) {
        console.error("Lỗi đăng nhập:", err);
        showError(
          loginForm.querySelector("button[type='submit']"),
          "Có lỗi xảy ra, vui lòng thử lại."
        );
      }
    });
  }

  if (registerForm) {
    const emailEl = document.getElementById("email");
    const passEl = document.getElementById("regPassword");
    const confirmEl = document.getElementById("confirmPassword");

    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearErrors(registerForm);

      let ok = true;
      if (!emailEl.value.trim()) {
        showError(emailEl, "Vui lòng nhập email.");
        ok = false;
      }
      if (!passEl.value || passEl.value.length < 6) {
        showError(passEl, "Mật khẩu tối thiểu 6 ký tự.");
        ok = false;
      }
      if (confirmEl.value !== passEl.value) {
        showError(confirmEl, "Mật khẩu xác nhận không khớp.");
        ok = false;
      }
      if (!ok) return;

      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            email: emailEl.value.trim(),
            password: passEl.value,
          }),
        });

        let data;
        try {
          data = await res.json();
        } catch {
          const text = await res.text();
          console.error(
            "Non-JSON response (register):",
            res.status,
            text.slice(0, 200)
          );
          showError(
            registerForm.querySelector("button[type='submit']"),
            `Server trả ${res.status}. Có thể sai route/API không tồn tại.`
          );
          return;
        }

        if (!res.ok) {
          showError(
            registerForm.querySelector("button[type='submit']"),
            data.error || "Đăng ký thất bại."
          );
          return;
        }

        if (data.token) {
          localStorage.setItem("token", data.token);
          alert("Đăng ký thành công!");
          window.location.href = "/index.html";
        } else {
          alert("Đăng ký thành công! Hãy đăng nhập.");
          window.location.href = "/auth.html#login";
        }
      } catch (err) {
        console.error("Lỗi đăng ký:", err);
        showError(
          registerForm.querySelector("button[type='submit']"),
          "Có lỗi xảy ra, vui lòng thử lại."
        );
      }
    });
  }

  function showError(afterEl, msg) {
    const p = document.createElement("p");
    p.className = "error-message";
    p.textContent = msg;
    p.style.color = "var(--radical-red)";
    p.style.fontSize = "var(--fs-7)";
    p.style.marginTop = "5px";
    afterEl.parentNode.insertBefore(p, afterEl.nextSibling);
  }

  function clearErrors(form) {
    form.querySelectorAll(".error-message").forEach((n) => n.remove());
  }
});
