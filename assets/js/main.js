// assets/js/main.js
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ------------------------------------------------------------
  // Preloader UI (создаем, если в HTML нет)
  // ------------------------------------------------------------
  function ensurePreloader() {
    let pre = $(".preloader");
    if (pre) return pre;

    pre = document.createElement("div");
    pre.className = "preloader";
    pre.innerHTML = `
      <div class="preloader__inner">
        <div class="loader"></div>
        <p>Loading...</p>
      </div>
    `;
    document.body.appendChild(pre);
    return pre;
  }

  function hidePreloader(pre) {
    if (!pre) return;
    pre.classList.add("hide");
    setTimeout(() => {
      try {
        pre.remove();
      } catch {}
    }, 650);
  }

  // ------------------------------------------------------------
  // Загрузка ресурсов (img + background-image + video loadeddata)
  // ------------------------------------------------------------
  function getBgImageUrls() {
    const urls = new Set();

    $$("*").forEach((el) => {
      const cs = getComputedStyle(el);
      const bg = cs.backgroundImage;
      if (!bg || bg === "none") return;

      // background-image: url("..."), url(...)
      const re = /url\((['"]?)(.*?)\1\)/g;
      let m;
      while ((m = re.exec(bg))) {
        const u = m[2];
        if (u && !u.startsWith("data:")) urls.add(u);
      }
    });

    return Array.from(urls);
  }

  function waitImage(src) {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => res();
      img.onerror = () => res(); // не блокируем весь сайт из-за одной битой картинки
      img.src = src;
    });
  }

  function waitDomImages() {
    const imgs = Array.from(document.images || []);
    if (imgs.length === 0) return Promise.resolve();

    return Promise.all(
      imgs.map(
        (img) =>
          new Promise((res) => {
            if (img.complete) return res();
            img.addEventListener("load", res, { once: true });
            img.addEventListener("error", res, { once: true });
          }),
      ),
    );
  }

  function waitBgImages() {
    const urls = getBgImageUrls();
    if (urls.length === 0) return Promise.resolve();
    return Promise.all(urls.map(waitImage));
  }

  function waitVideoReady(video) {
    return new Promise((res) => {
      if (!video) return res();
      // loadeddata = есть первый кадр
      if (video.readyState >= 2) return res();
      video.addEventListener("loadeddata", res, { once: true });
      video.addEventListener("error", res, { once: true });
    });
  }

  async function preloadAll({ startVideo, endVideo }) {
    // заставим браузер активнее грузить
    try {
      if (startVideo) startVideo.preload = "auto";
      if (endVideo) endVideo.preload = "auto";
    } catch {}

    // важное: .load() полезно, если preload был другой
    try {
      startVideo?.load?.();
      endVideo?.load?.();
    } catch {}

    await Promise.all([
      waitDomImages(),
      waitBgImages(),
      waitVideoReady(startVideo),
      waitVideoReady(endVideo),
    ]);
  }

  // ------------------------------------------------------------
  // Твой код (почти без изменений) — просто запускается позже
  // ------------------------------------------------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function pickStoneColor(stone) {
    const path = stone.querySelector("svg path[fill]");
    const fill = path?.getAttribute("fill");
    if (fill && fill !== "none" && fill !== "transparent") return fill;

    const anyPath = stone.querySelector("svg path");
    if (anyPath) {
      const cs = getComputedStyle(anyPath);
      if (cs.fill && cs.fill !== "none") return cs.fill;
    }
    return "#9CFFF5";
  }

  function setupStableScrambleLayer(el) {
    const finalText = el.textContent;
    el.textContent = "";

    const finalSpan = document.createElement("span");
    finalSpan.className = "final";
    finalSpan.textContent = finalText;

    const scrambleSpan = document.createElement("span");
    scrambleSpan.className = "scramble";
    scrambleSpan.textContent = finalText;

    el.append(finalSpan, scrambleSpan);

    return { finalText, finalSpan, scrambleSpan };
  }

  function scrambleText(scrambleSpan, finalText, durationMs, opts = {}) {
    const charset = (
      opts.charset || "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+-/=<>"
    ).split("");
    const keepSpaces = opts.keepSpaces ?? true;

    const len = finalText.length;
    const start = performance.now();
    let rafId = 0;

    const tick = (now) => {
      const t = clamp((now - start) / durationMs, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const locked = Math.floor(eased * len);

      let out = "";
      for (let i = 0; i < len; i++) {
        const ch = finalText[i];

        if (keepSpaces && ch === " ") {
          out += " ";
          continue;
        }

        if (i < locked) out += ch;
        else out += charset[(Math.random() * charset.length) | 0];
      }

      scrambleSpan.textContent = out;

      if (t < 1) rafId = requestAnimationFrame(tick);
      else scrambleSpan.textContent = finalText;
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }

  async function warmUpVideo(video) {
    try {
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.load();

      await new Promise((res) => {
        if (video.readyState >= 2) return res();
        video.addEventListener("loadeddata", res, { once: true });
      });

      await video.play();

      const stop = () => {
        try {
          video.pause();
          video.currentTime = 0;
        } catch {}
      };

      if ("requestVideoFrameCallback" in video) {
        video.requestVideoFrameCallback(() => stop());
      } else {
        setTimeout(stop, 0);
      }
    } catch {
      // muted autoplay может быть запрещен — ок
    }
  }

  function startStonesAfterSwap(stonesWrap, stones, totalStonesMs = 1200) {
    stonesWrap.classList.remove("svg-on");
    stones.forEach((s) => s.classList.remove("is-in"));

    const moveDurMs = 700;
    const svgDelayMs = 1000;

    const n = stones.length;
    const flyWindow = Math.max(totalStonesMs, n * 160);
    const step = n > 1 ? (flyWindow - moveDurMs) / (n - 1) : 0;

    stones.forEach((stone, i) => {
      setTimeout(() => stone.classList.add("is-in"), i * step);
    });

    const lastFinish = (n > 1 ? (n - 1) * step : 0) + moveDurMs;

    setTimeout(
      () => stonesWrap.classList.add("svg-on"),
      lastFinish + svgDelayMs,
    );
  }

  // ------------------------------------------------------------
  // Главный старт: прелоадер -> запуск анимаций
  // ------------------------------------------------------------
  async function init() {
    const preloader = ensurePreloader();

    const startVideo = $(".hero__start");
    const endVideo = $(".hero__end");
    const colorEl = $("h1 .color");
    const stonesWrap = $(".stones");
    const stones = stonesWrap ? $$(".stones > div") : [];

    if (
      !startVideo ||
      !endVideo ||
      !colorEl ||
      !stonesWrap ||
      stones.length === 0
    ) {
      hidePreloader(preloader);
      return;
    }

    // 1) ПРЕДЗАГРУЗКА
    // (включая фоновые картинки)
    await preloadAll({ startVideo, endVideo });

    // 2) скрываем прелоадер и только потом запускаем
    hidePreloader(preloader);

    // 3) init stones glow
    stones.forEach((stone) => {
      const color = pickStoneColor(stone);
      stone.style.setProperty("--glow", color);
    });

    // end video держим скрытым
    endVideo.style.opacity = "0";
    endVideo.currentTime = 0;
    try {
      endVideo.pause();
    } catch {}

    // scramble layer
    const { finalText, scrambleSpan } = setupStableScrambleLayer(colorEl);

    // ---------- timeline ----------
    async function run() {
      // стартуем первое видео
      try {
        await startVideo.play();
      } catch {}

      // прогрев второго видео во время первого
      warmUpVideo(endVideo);

      // ждём длительность первого
      const duration = await new Promise((res) => {
        if (Number.isFinite(startVideo.duration) && startVideo.duration > 0)
          return res(startVideo.duration);
        startVideo.addEventListener(
          "loadedmetadata",
          () => res(startVideo.duration || 5),
          { once: true },
        );
      });

      const totalMs = duration * 1000;

      // scramble ровно на длительность первого видео
      const stopScramble = scrambleText(scrambleSpan, finalText, totalMs, {
        keepSpaces: true,
      });

      startVideo.addEventListener(
        "ended",
        async () => {
          try {
            stopScramble();
          } catch {}
          scrambleSpan.textContent = finalText;

          // мгновенный своп
          startVideo.style.transition = "opacity 1ms linear";
          endVideo.style.transition = "opacity 1ms linear";

          startVideo.style.opacity = "0";
          endVideo.style.opacity = "1";

          try {
            endVideo.currentTime = 0;
          } catch {}

          try {
            await endVideo.play();
          } catch {}

          // Камни только после появления второго видео
          requestAnimationFrame(() => {
            requestAnimationFrame(() =>
              startStonesAfterSwap(stonesWrap, stones, 1400),
            );
          });
        },
        { once: true },
      );
    }

    run();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
