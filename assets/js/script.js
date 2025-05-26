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

// --- NAVBAR TOGGLE ---
const navbar = document.querySelector("[data-navbar]");
const navTogglers = document.querySelectorAll("[data-nav-toggler]");
const navLinks = document.querySelectorAll("[data-nav-link]");
const overlay = document.querySelector("[data-overlay]");

const toggleNavbar = function () {
  navbar.classList.toggle("active");
  overlay.classList.toggle("active");
};

addEventOnElem(navTogglers, "click", toggleNavbar);

const closeNavbar = function () {
  navbar.classList.remove("active");
  overlay.classList.remove("active");
};

addEventOnElem(navLinks, "click", closeNavbar);

// --- HEADER & BACK TOP BTN ACTIVE ON SCROLL ---
const header = document.querySelector("[data-header]");
const backTopBtn = document.querySelector("[data-back-top-btn]");

const activeElem = function () {
  if (window.scrollY > 100) {
    header.classList.add("active");
    backTopBtn.classList.add("active");
  } else {
    header.classList.remove("active");
    backTopBtn.classList.remove("active");
  }
};

addEventOnElem(window, "scroll", activeElem);

// YOUTUBE PLAYER INLINE CHO INDEX.HTML
document.addEventListener("DOMContentLoaded", () => {
  const videoPlayerContainer = document.getElementById(
    "video-player-container"
  );
  const videoBannerImage = document.getElementById("video-banner-image");
  const youtubePlayButton = document.getElementById("youtube-play-button");

  if (videoPlayerContainer && videoBannerImage && youtubePlayButton) {
    youtubePlayButton.addEventListener("click", () => {
      const videoId = youtubePlayButton.getAttribute("data-youtube-id");
      if (videoId) {
        const iframe = document.createElement("iframe");
        iframe.setAttribute("width", "100%");
        iframe.setAttribute("height", "100%");
        iframe.setAttribute(
          "src",
          `https://www.youtube.com/watch?v=wedbl92dmSE{videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&fs=0&disablekb=1`
        );
        iframe.setAttribute("frameborder", "0");
        iframe.setAttribute(
          "allow",
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        );
        iframe.setAttribute("allowfullscreen", ""); // Cho phép toàn màn hình nhưng có thể bị giới hạn bởi fs=0

        videoBannerImage.style.display = "none";
        youtubePlayButton.style.display = "none";

        // Xử lý lớp phủ 'has-after' để video không bị mờ
        if (videoPlayerContainer.classList.contains("has-after")) {
          videoPlayerContainer.classList.remove("has-after");
          // Bạn có thể muốn thêm lại class này nếu người dùng dừng video và quay lại ảnh banner,
          // nhưng trong kịch bản này, chúng ta chỉ thay thế một lần.
        }

        videoPlayerContainer.appendChild(iframe);
      } else {
        console.error("Không tìm thấy data-youtube-id trên nút play.");
      }
    });
  } else {
    // Thêm log này để biết nếu các phần tử không được tìm thấy trên index.html
    // console.log("Một hoặc nhiều phần tử cho video player không được tìm thấy trên trang này.");
  }
});
