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
        // Corrected YouTube iframe src for autoplay and other parameters
        const correctedIframeSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&rel=0&controls=1&modestbranding=1&iv_load_policy=3&fs=1&color=white`;
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
        videoPlayerContainer.innerHTML = ""; // Clear previous content
        videoPlayerContainer.appendChild(iframe);
      }
    });
  }

  // Chatbot Elements
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
          chatbotInput.focus(); // Focus input when window opens
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

  /**
   * Adds a message to the chatbot interface.
   * @param {string} message The message text.
   * @param {string} type The type of message ('user', 'bot', or 'bot-typing').
   * @returns {HTMLElement|null} The created message element or null.
   */
  const addMessageToChat = (message, type) => {
    if (!chatbotMessages) return null;

    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message");

    if (type === "user") {
      messageDiv.classList.add("user-message");
    } else if (type === "bot") {
      messageDiv.classList.add("bot-message");
    } else if (type === "bot-typing") {
      // Add classes for styling the typing indicator
      messageDiv.classList.add("bot-message", "typing-indicator");
    } else {
      messageDiv.classList.add(type); // Fallback for other custom types
    }

    const p = document.createElement("p");
    p.textContent = message;
    messageDiv.appendChild(p);

    chatbotMessages.appendChild(messageDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight; // Scroll to the latest message
    return messageDiv; // Return the created element
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

      // --- START CHATGPT API CALL INTEGRATION ---
      // IMPORTANT:
      // 1. Replace 'YOUR_CHATGPT_API_ENDPOINT' with your actual API endpoint.
      //    This might be a direct API endpoint or, preferably, your own backend proxy.
      // 2. API KEY HANDLING: For security, API keys should NOT be stored or used
      //    directly in client-side JavaScript in a production environment.
      //    The request should be made to your backend, which then securely calls the
      //    ChatGPT API with the key.
      // 3. The 'body' and response parsing (e.g., 'data.reply') might need
      //    adjustment based on the specific API you are using.

      const API_ENDPOINT =
        "https://demodautien.netlify.app/.netlify/functions/gpt";
      // Example: const API_ENDPOINT = "/api/chatgpt"; // If you have a backend proxy

      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // If your API (or backend proxy) requires an Authorization header:
          // "Authorization": "Bearer YOUR_API_KEY_OR_TOKEN", // Again, key management is crucial
        },
        // The structure of the body depends on what your API endpoint expects.
        // For OpenAI, it's usually more complex, involving a messages array.
        // This is a simplified example assuming your endpoint takes a simple message.
        body: JSON.stringify({ message: messageText }),
      });

      if (typingIndicatorElement) {
        typingIndicatorElement.remove(); // Remove "Bot đang soạn tin..."
      }

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          // If response is not JSON or other parsing error
          throw new Error(
            `Lỗi API: ${response.status} ${response.statusText}. Không thể phân tích phản hồi lỗi.`
          );
        }
        // Try to extract a meaningful error message from the API's JSON response
        throw new Error(
          errorData.error?.message ||
            errorData.message ||
            `Lỗi API: ${response.status}`
        );
      }

      const data = await response.json();

      // Adjust the next line based on the actual structure of the API response.
      // For OpenAI's Chat Completions API, it's often data.choices[0].message.content
      const botReply =
        data.reply ||
        (data.choices &&
          data.choices[0] &&
          data.choices[0].message &&
          data.choices[0].message.content) ||
        "Xin lỗi, tôi chưa thể xử lý yêu cầu này.";

      addMessageToChat(botReply, "bot");
      // --- END CHATGPT API CALL INTEGRATION ---
    } catch (error) {
      console.error("Lỗi chatbot:", error);
      if (typingIndicatorElement) {
        typingIndicatorElement.remove(); // Ensure typing indicator is removed on error
      }
      // Display a user-friendly error message, preferably from the error object itself
      addMessageToChat(
        error.message ||
          "Hiện tại tôi không thể trả lời. Vui lòng thử lại sau.",
        "bot"
      );
    } finally {
      chatbotSendBtn.disabled = false;
      if (chatbotInput) chatbotInput.focus(); // Re-focus the input field
    }
  };

  if (chatbotSendBtn) {
    chatbotSendBtn.addEventListener("click", handleSendMessage);
  }

  if (chatbotInput) {
    chatbotInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        event.preventDefault(); // Prevent form submission if it's part of a form
        handleSendMessage();
      }
    });
  }

  // Initial greeting from bot (if desired)
  // if (chatbotMessages && chatbotMessages.children.length === 0) { // Ensure it only adds if no messages yet
  //     addMessageToChat("Xin chào! Tôi có thể giúp gì cho bạn?", "bot");
  // }

  // Sticky Steps Functionality
  const stickyStepItems = document.querySelectorAll(".step-item-sticky");

  if (
    stickyStepItems.length > 0 &&
    window.matchMedia("(min-width: 993px)").matches // Only for desktop
  ) {
    const headerHeightDesktop =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--header-height-desktop")
        .trim() || "80px";

    const observerOptions = {
      root: null, // observing intersections with the viewport
      rootMargin: `-${headerHeightDesktop} 0px -30% 0px`, // Adjust top margin by header height, bottom margin to trigger earlier/later
      threshold: 0.5, // 50% of the element is visible
    };

    const handleStepIntersection = (entries, observer) => {
      entries.forEach((entry) => {
        // const frame = entry.target.querySelector(".step-frame"); // Not directly used for class toggle on item
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

    // Optional: Make the first step visible by default if it's at the top
    if (stickyStepItems[0] && window.scrollY < 100) {
      // Check if near top of page
      stickyStepItems[0].classList.add("is-fully-visible");
    }
  } else if (stickyStepItems.length > 0) {
    // On mobile or if observer not supported, remove any pre-set visibility classes
    stickyStepItems.forEach((item) => {
      item.classList.remove("is-fully-visible");
      // item.querySelector(".step-frame")?.style.opacity = 1; // Ensure frames are visible on mobile
      // item.querySelector(".step-frame")?.style.transform = "translateY(0) scale(1)";
    });
  }

  const stickyStepNavDots = document.querySelectorAll(
    ".sticky-steps-navigation .dot"
  );
  if (stickyStepNavDots.length > 0) {
    stickyStepNavDots.forEach((dot) => {
      dot.addEventListener("click", function (e) {
        e.preventDefault();
        const targetId = this.getAttribute("href").substring(1); // Get target ID from href like #step-1-target
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
