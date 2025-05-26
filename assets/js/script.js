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
