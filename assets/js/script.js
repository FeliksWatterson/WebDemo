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
  // Navbar
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

  // Header & Back Top Button
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

  //YouTube Player
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
        const correctedIframeSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&controls=1&modestbranding=1&iv_load_policy=3&fs=1&color=white`;
        iframe.setAttribute("src", correctedIframeSrc);
        iframe.setAttribute("frameborder", "0");
        iframe.setAttribute(
          "allow",
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        );
        iframe.setAttribute("allowfullscreen", "");

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
});

document.addEventListener("DOMContentLoaded", () => {
  // Chatbot ElmElm
  const chatbotIcon = document.getElementById("chatbot-icon");
  const chatbotWindow = document.getElementById("chatbot-window");
  const closeChatbotBtn = document.getElementById("close-chatbot-btn");
  const chatbotMessages = document.getElementById("chatbot-messages");
  const chatbotInput = document.getElementById("chatbot-input");
  const chatbotSendBtn = document.getElementById("chatbot-send-btn");

  // Check element trước khi thêm event listener
  if (chatbotIcon) {
    chatbotIcon.addEventListener("click", () => {
      if (chatbotWindow) {
        chatbotWindow.classList.toggle("active");
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

  const addMessageToChat = (message, sender) => {
    if (!chatbotMessages) return;
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message");
    messageDiv.classList.add(
      sender === "user" ? "user-message" : "bot-message"
    );

    const p = document.createElement("p");
    p.textContent = message;
    messageDiv.appendChild(p);

    chatbotMessages.appendChild(messageDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  };

  const handleSendMessage = async () => {
    if (!chatbotInput || !chatbotSendBtn) return;
    const messageText = chatbotInput.value.trim();
    if (messageText === "") return;

    addMessageToChat(messageText, "user");
    chatbotInput.value = "";
    chatbotSendBtn.disabled = true;

    // GỌI API GPT
    try {
      const typingIndicator = addMessageToChat(
        "Bot đang soạn tin...",
        "bot-typing"
      );

      const response = await fetch("/api/chatgpt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: messageText }),
      });

      if (!response.ok) {
        throw new Error("Lỗi khi gọi API chatbot");
      }

      const data = await response.json();
      const botReply = data.reply;

      if (typingIndicator && typingIndicator.parentNode) {
      }

      addMessageToChat(botReply, "bot");
    } catch (error) {
      console.error("Lỗi chatbot:", error);
      addMessageToChat("T chưa làm backend nên chưa dùng được đâu :v", "bot");
    } finally {
      chatbotSendBtn.disabled = false;
    }
  };

  if (chatbotSendBtn) {
    chatbotSendBtn.addEventListener("click", handleSendMessage);
  }

  if (chatbotInput) {
    chatbotInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        handleSendMessage();
      }
    });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const stickyStepItems = document.querySelectorAll(".step-item-sticky");

  if (
    stickyStepItems.length > 0 &&
    window.matchMedia("(min-width: 993px)").matches
  ) {
    const observerOptions = {
      root: null,
      rootMargin: `-${
        getComputedStyle(document.documentElement).getPropertyValue(
          "--header-height-desktop"
        ) || "80px"
      } 0px -30% 0px`,
      threshold: 0.5,
    };

    const handleStepIntersection = (entries, observer) => {
      entries.forEach((entry) => {
        const frame = entry.target.querySelector(".step-frame");
        if (!frame) return;

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

    if (stickyStepItems[0]) {
      stickyStepItems[0].classList.add("is-fully-visible");
      const firstFrame = stickyStepItems[0].querySelector(".step-frame");
      if (firstFrame) {
      }
    }
  } else if (stickyStepItems.length > 0) {
    stickyStepItems.forEach((item) => {
      const frame = item.querySelector(".step-frame");
      if (frame) {
        item.classList.remove("is-fully-visible");
      }
    });
  }
});

const stickyStepNavDots = document.querySelectorAll(
  ".sticky-steps-navigation .dot"
);
stickyStepNavDots.forEach((dot) => {
  dot.addEventListener("click", function (e) {
    e.preventDefault();
    const targetId = this.getAttribute("data-step-target");
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
