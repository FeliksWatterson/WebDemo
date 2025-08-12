"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const addEventOnElem = function (elem, type, callback) {
    if (!elem) return;
    if (elem.length > 1) {
      for (let i = 0; i < elem.length; i++) {
        elem[i].addEventListener(type, callback);
      }
    } else {
      elem.addEventListener(type, callback);
    }
  };

  const callGeminiAPI = async (prompt) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Lỗi kết nối đến máy chủ.");
    }

    const data = await response.json();
    return data.reply;
  };

  const addMessage = (container, message, type) => {
    if (!container) return null;
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", type);
    const p = document.createElement("p");
    p.textContent = message;
    messageDiv.appendChild(p);
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
    return messageDiv;
  };

  const navbar = document.querySelector("[data-navbar]");
  const navTogglers = document.querySelectorAll("[data-nav-toggler]");
  const overlay = document.querySelector("[data-overlay]");
  const toggleNavbar = () => {
    navbar.classList.toggle("active");
    overlay.classList.toggle("active");
  };
  addEventOnElem(navTogglers, "click", toggleNavbar);

  const header = document.querySelector("[data-header]");
  const activeHeader = () => {
    if (window.scrollY > 100) {
      header.classList.add("active");
    } else {
      header.classList.remove("active");
    }
  };
  addEventOnElem(window, "scroll", activeHeader);

  const chatbotIcon = document.getElementById("chatbot-icon");
  if (chatbotIcon) {
    const chatbotWindow = document.getElementById("chatbot-window");
    const closeChatbotBtn = document.getElementById("close-chatbot-btn");
    const chatbotMessages = document.getElementById("chatbot-messages");
    const chatbotInput = document.getElementById("chatbot-input");
    const chatbotSendBtn = document.getElementById("chatbot-send-btn");

    chatbotIcon.addEventListener("click", () =>
      chatbotWindow.classList.toggle("active")
    );
    closeChatbotBtn.addEventListener("click", () =>
      chatbotWindow.classList.remove("active")
    );

    const handleWidgetSendMessage = async () => {
      const messageText = chatbotInput.value.trim();
      if (messageText === "") return;
      addMessage(chatbotMessages, messageText, "user-message");
      chatbotInput.value = "";
      chatbotSendBtn.disabled = true;

      const typingIndicator = addMessage(
        chatbotMessages,
        "Bot đang soạn tin...",
        "bot-message"
      );
      typingIndicator.classList.add("typing-indicator");

      try {
        const botReply = await callGeminiAPI(messageText);
        typingIndicator.remove();
        addMessage(chatbotMessages, botReply, "bot-message");
      } catch (error) {
        typingIndicator.remove();
        addMessage(chatbotMessages, `Lỗi: ${error.message}`, "bot-message");
      } finally {
        chatbotSendBtn.disabled = false;
        chatbotInput.focus();
      }
    };

    chatbotSendBtn.addEventListener("click", handleWidgetSendMessage);
    chatbotInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleWidgetSendMessage();
    });
  }

  const fullPageContainer = document.querySelector(".ai-assistant-page");
  if (fullPageContainer) {
    const messagesContainer = document.getElementById("fullpage-chat-messages");
    const inputField = document.getElementById("fullpage-chat-input");
    const sendButton = document.getElementById("fullpage-chat-send-btn");
    const promptStarters = document.querySelectorAll(".prompt-starter-btn");

    const handleFullPageSendMessage = async () => {
      const messageText = inputField.value.trim();
      if (messageText === "") return;

      addMessage(messagesContainer, messageText, "user-message");
      inputField.value = "";
      sendButton.disabled = true;
      promptStarters.forEach((btn) => (btn.disabled = true));

      const typingIndicator = addMessage(
        messagesContainer,
        "Trợ lý đang soạn tin...",
        "bot-message"
      );
      typingIndicator.classList.add("typing-indicator");

      try {
        const botReply = await callGeminiAPI(messageText);
        typingIndicator.remove();
        addMessage(messagesContainer, botReply, "bot-message");
      } catch (error) {
        typingIndicator.remove();
        addMessage(messagesContainer, `Lỗi: ${error.message}`, "bot-message");
      } finally {
        sendButton.disabled = false;
        promptStarters.forEach((btn) => (btn.disabled = false));
        inputField.focus();
      }
    };

    sendButton.addEventListener("click", handleFullPageSendMessage);
    inputField.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleFullPageSendMessage();
    });

    promptStarters.forEach((button) => {
      button.addEventListener("click", () => {
        inputField.value = button.textContent;
        inputField.focus();
      });
    });
  }
});

document.addEventListener("DOMContentLoaded", initAuthUI);

async function initAuthUI() {
  const token = localStorage.getItem("token");
  const header = document.querySelector(".header .header-actions");
  if (!header) return;

  let authBox = document.getElementById("auth-box");
  if (!authBox) {
    authBox = document.createElement("div");
    authBox.id = "auth-box";
    authBox.style.display = "flex";
    authBox.style.alignItems = "center";
    authBox.style.gap = "10px";
    header.innerHTML = "";
    header.appendChild(authBox);
  }

  if (!token) {
    authBox.innerHTML = `
      <a href="/auth.html#login" class="btn has-before">
        <span class="span">Đăng nhập</span>
      </a>
      <a href="/auth.html#register" class="btn has-before">
        <span class="span">Đăng ký</span>
      </a>
    `;
    return;
  }

  try {
    const res = await fetch("/api/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("unauthorized");
    const me = await res.json();

    authBox.innerHTML = `
      <span id="account-link" style="cursor:pointer; font-weight:600; color:var(--oxford-blue);">
        Xin chào, ${me.email}
      </span>
    `;

    document.getElementById("account-link")?.addEventListener("click", () => {
      window.location.href = "/account.html";
    });
  } catch (e) {
    localStorage.removeItem("token");
    initAuthUI();
  }
}
