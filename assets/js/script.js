"use strict";

const addEventOnElem = function (elem, type, callback) {
  if (elem.length > 1) {
    for (let i = 0; i < elem.length; i++) {
      elem[i].addEventListener(type, callback);
    }
  } else {
    elem.addEventListener(type, callback);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.querySelector("[data-navbar]");
  const navTogglers = document.querySelectorAll("[data-nav-toggler]");
  const navLinks = document.querySelectorAll("[data-nav-link]");
  const overlay = document.querySelector("[data-overlay]");

  const toggleNavbar = function () {
    if (navbar) navbar.classList.toggle("active");
    if (overlay) overlay.classList.toggle("active");
  };
  if (navTogglers.length) addEventOnElem(navTogglers, "click", toggleNavbar);

  const closeNavbar = function () {
    if (navbar) navbar.classList.remove("active");
    if (overlay) overlay.classList.remove("active");
  };
  if (navLinks.length) addEventOnElem(navLinks, "click", closeNavbar);

  const header = document.querySelector("[data-header]");
  const backTopBtn = document.querySelector("[data-back-top-btn]");

  const activeElem = function () {
    if (window.scrollY > 100) {
      if (header) header.classList.add("active");
      if (backTopBtn) backTopBtn.classList.add("active");
    } else {
      if (header) header.classList.remove("active");
      if (backTopBtn) backTopBtn.classList.remove("active");
    }
  };
  if (header || backTopBtn) {
    addEventOnElem(window, "scroll", activeElem);
  }

  const videoPlayerContainer = document.getElementById(
    "video-player-container"
  );
  const videoBannerImage = document.getElementById("video-banner-image");
  const youtubePlayButton = document.getElementById("youtube-play-button");

  if (videoPlayerContainer && videoBannerImage && youtubePlayButton) {
    youtubePlayButton.addEventListener("click", () => {
      const videoId = youtubePlayButton.getAttribute("data-youtube-id");
      if (videoId && videoId.trim() !== "") {
        const iframe = document.createElement("iframe");
        iframe.setAttribute("width", "100%");
        iframe.setAttribute("height", "100%");
        const correctedIframeSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&rel=0&controls=1&modestbranding=1&iv_load_policy=3&fs=1&color=white`;
        iframe.setAttribute("src", correctedIframeSrc);
        iframe.setAttribute("frameborder", "0");
        iframe.setAttribute(
          "allow",
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        );
        iframe.setAttribute("allowfullscreens", "");

        if (videoBannerImage) {
          videoBannerImage.style.display = "none";
        }
        youtubePlayButton.style.display = "none";

        if (videoPlayerContainer.classList.contains("has-after")) {
          videoPlayerContainer.classList.remove("has-after");
        }
        videoPlayerContainer.innerHTML = "";
        videoPlayerContainer.appendChild(iframe);
      }
    });
  }

  const chatbotIcon = document.getElementById("chatbot-icon");
  const chatbotWindow = document.getElementById("chatbot-window");
  const closeChatbotBtn = document.getElementById("close-chatbot-btn");
  const chatbotMessages = document.getElementById("chatbot-messages");
  const chatbotInput = document.getElementById("chatbot-input");
  const chatbotSendBtn = document.getElementById("chatbot-send-btn");

  if (chatbotIcon) {
    chatbotIcon.addEventListener("click", () => {
      if (chatbotWindow) {
        chatbotWindow.classList.toggle("active");
        if (chatbotWindow.classList.contains("active") && chatbotInput) {
          chatbotInput.focus();
        }
      }
    });
  }

  if (closeChatbotBtn) {
    closeChatbotBtn.addEventListener("click", () => {
      if (chatbotWindow) {
        chatbotWindow.classList.remove("active");
      }
    });
  }

  const addMessageToChat = (message, type) => {
    if (!chatbotMessages) return null;

    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message");

    if (type === "user") {
      messageDiv.classList.add("user-message");
    } else if (type === "bot") {
      messageDiv.classList.add("bot-message");
    } else if (type === "bot-typing") {
      messageDiv.classList.add("bot-message", "typing-indicator");
    } else {
      messageDiv.classList.add(type);
    }

    const p = document.createElement("p");
    p.textContent = message;
    messageDiv.appendChild(p);

    chatbotMessages.appendChild(messageDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    return messageDiv;
  };

  const callGeminiAPI = async (prompt) => {
    const API_KEY = "AIzaSyCkTpOrGh95FcH8mKiqZM6AbFhe7B7RYVc";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Lỗi không xác định từ API");
    }

    const data = await response.json();

    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("AI phản hồi bị lỗi.");
    }
  };

  const handleSendMessage = async () => {
    if (!chatbotInput || !chatbotSendBtn || !chatbotMessages) return;
    const messageText = chatbotInput.value.trim();
    if (messageText === "") return;

    addMessageToChat(messageText, "user");
    chatbotInput.value = "";
    chatbotSendBtn.disabled = true;
    let typingIndicatorElement = null;

    try {
      typingIndicatorElement = addMessageToChat(
        "Bot đang soạn tin...",
        "bot-typing"
      );

      const botReply = await callGeminiAPI(messageText);

      if (typingIndicatorElement) {
        typingIndicatorElement.remove();
      }

      addMessageToChat(botReply, "bot");
    } catch (error) {
      console.error("Lỗi chatbot:", error);
      if (typingIndicatorElement) {
        typingIndicatorElement.remove();
      }
      addMessageToChat(
        error.message ||
          "Hiện tại tôi không thể trả lời. Vui lòng thử lại sau.",
        "bot"
      );
    } finally {
      chatbotSendBtn.disabled = false;
      if (chatbotInput) chatbotInput.focus();
    }
  };

  if (chatbotSendBtn) {
    chatbotSendBtn.addEventListener("click", handleSendMessage);
  }

  if (chatbotInput) {
    chatbotInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleSendMessage();
      }
    });
  }

  const stickyStepItems = document.querySelectorAll(".step-item-sticky");

  if (
    stickyStepItems.length > 0 &&
    window.matchMedia("(min-width: 993px)").matches
  ) {
    const headerHeightDesktop =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--header-height-desktop")
        .trim() || "80px";

    const observerOptions = {
      root: null,
      rootMargin: `-${headerHeightDesktop} 0px -30% 0px`,
      threshold: 0.5,
    };

    const handleStepIntersection = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-fully-visible");
        } else {
          entry.target.classList.remove("is-fully-visible");
        }
      });
    };

    const stepObserver = new IntersectionObserver(
      handleStepIntersection,
      observerOptions
    );
    stickyStepItems.forEach((item) => {
      stepObserver.observe(item);
    });

    if (stickyStepItems[0] && window.scrollY < 100) {
      stickyStepItems[0].classList.add("is-fully-visible");
    }
  } else if (stickyStepItems.length > 0) {
    stickyStepItems.forEach((item) => {
      item.classList.remove("is-fully-visible");
    });
  }

  const stickyStepNavDots = document.querySelectorAll(
    ".sticky-steps-navigation .dot"
  );
  if (stickyStepNavDots.length > 0) {
    stickyStepNavDots.forEach((dot) => {
      dot.addEventListener("click", function (e) {
        e.preventDefault();
        const targetId = this.getAttribute("href").substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
          let headerOffset = parseInt(
            getComputedStyle(document.documentElement).getPropertyValue(
              "--header-height-desktop"
            ) || "80px",
            10
          );
          if (window.innerWidth <= 992) {
            headerOffset = parseInt(
              getComputedStyle(document.documentElement).getPropertyValue(
                "--header-height-mobile"
              ) || "70px",
              10
            );
          }
          const elementPosition =
            targetElement.getBoundingClientRect().top + window.pageYOffset;
          const offsetPosition = elementPosition - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
          });
        }
      });
    });
  }
});
