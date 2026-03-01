const preloader = document.querySelector(".preloader");

function preloadResources() {
  const images = document.images;
  const videos = document.querySelectorAll("video");

  let total = images.length + videos.length;
  let loaded = 0;

  function resourceLoaded() {
    loaded++;

    if (loaded >= total) {
      startSite();
    }
  }

  for (let img of images) {
    if (img.complete) {
      resourceLoaded();
    } else {
      img.addEventListener("load", resourceLoaded);
      img.addEventListener("error", resourceLoaded);
    }
  }

  videos.forEach((video) => {
    video.addEventListener("loadeddata", resourceLoaded);
  });
}

function startSite() {
  preloader.classList.add("hide");

  setTimeout(() => {
    preloader.remove();
  }, 600);

  function initAnimations() {
    const preloader = document.querySelector(".preloader");

    function preloadResources() {
      const images = document.images;
      const videos = document.querySelectorAll("video");

      let total = images.length + videos.length;
      let loaded = 0;

      function resourceLoaded() {
        loaded++;

        if (loaded >= total) {
          startSite();
        }
      }

      for (let img of images) {
        if (img.complete) {
          resourceLoaded();
        } else {
          img.addEventListener("load", resourceLoaded);
          img.addEventListener("error", resourceLoaded);
        }
      }

      videos.forEach((video) => {
        video.addEventListener("loadeddata", resourceLoaded);
      });
    }

    function startSite() {
      preloader.classList.add("hide");

      setTimeout(() => {
        preloader.remove();
      }, 600);

      initAnimations(); // запуск твоих анимаций
    }

    document.addEventListener("DOMContentLoaded", preloadResources);
  } // запуск твоих анимаций
}

document.addEventListener("DOMContentLoaded", preloadResources);
