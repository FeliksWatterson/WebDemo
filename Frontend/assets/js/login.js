document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector(".login-container form");

  if (loginForm) {
    const usernameInput = loginForm.querySelector("#username");
    const passwordInput = loginForm.querySelector("#password");

    loginForm.addEventListener("submit", function (event) {
      event.preventDefault(); // tải lại trang

      let isValid = true;
      let errorMessage = "";

      // Xóa thông báo lỗi
      const existingErrorMessages =
        loginForm.querySelectorAll(".error-message");
      existingErrorMessages.forEach((msg) => msg.remove());

      // Check tên đăng nhập/email
      if (usernameInput.value.trim() === "") {
        isValid = false;
        displayErrorMessage(
          usernameInput,
          "Vui lòng nhập tên đăng nhập hoặc email."
        );
      }

      // Check pass
      if (passwordInput.value.trim() === "") {
        isValid = false;
        displayErrorMessage(passwordInput, "Vui lòng nhập mật khẩu.");
      }

      if (isValid) {
        console.log("Form hợp lệ, chuẩn bị gửi dữ liệu...");
        console.log("Tên đăng nhập/Email:", usernameInput.value);
        // console.log('Mật khẩu:', passwordInput.value);

        // Sau lam backend roi gui data ve
        // fetch('/api/login', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify({
        //         username: usernameInput.value,
        //         password: passwordInput.value
        //     })
        // })
        // .then(response => response.json())
        // .then(data => {
        //     console.log('Phản hồi từ server:', data);
        //     if (data.success) {
        //         alert('Đăng nhập thành công!');
        //         // window.location.href = '/dashboard.html';
        //     } else {
        //         displayErrorMessage(loginForm.querySelector('button[type="submit"]'), data.message || 'Tên đăng nhập hoặc mật khẩu không đúng.');
        //     }
        // })
        // .catch(error => {
        //     console.error('Lỗi khi đăng nhập:', error);
        //     displayErrorMessage(loginForm.querySelector('button[type="submit"]'), 'Đã có lỗi xảy ra. Vui lòng thử lại.');
        // });

        // thong bao chua co backend
        alert("T chưa làm backend nên chưa đăng nhập được đâu :v");
        // loginForm.reset();
      } else {
        console.log("Form không hợp lệ.");
      }
    });

    function displayErrorMessage(inputElement, message) {
      const errorElement = document.createElement("p");
      errorElement.className = "error-message";
      errorElement.textContent = message;
      errorElement.style.color = "var(--radical-red)";
      errorElement.style.fontSize = "var(--fs-7)";
      errorElement.style.marginTop = "5px";

      inputElement.parentNode.insertBefore(
        errorElement,
        inputElement.nextSibling
      );
    }
  }
});
