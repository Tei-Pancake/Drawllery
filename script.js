(() => {
  "use strict";

  // Elementos de la pagina
  const gallery = document.querySelector("#gallery");
  const intro = document.querySelector("#intro");
  const enterButton = document.querySelector("#enter-button");
  const skipIntroButton = document.querySelector("#skip-intro");

  const searchInput = document.querySelector("#artwork-search");
  const shuffleButton = document.querySelector("#shuffle-button");
  const resultsCount = document.querySelector("#results-count");
  const emptyState = document.querySelector("#empty-state");

  const lightbox = document.querySelector("#lightbox");
  const lightboxContent = document.querySelector("#lightbox-content");
  const closeLightboxButton = document.querySelector("#close-lightbox");
  const lightboxPrev = document.querySelector("#lightbox-prev");
  const lightboxNext = document.querySelector("#lightbox-next");

  const music = document.querySelector("#background-music");
  const audioToggle = document.querySelector("#audio-toggle");
  const volume = document.querySelector("#volume");

  let artworks = [];
  let visibleArtworks = [];
  let activeArtworkIndex = 0;
  let musicPlaying = false;
  let lastFocusedElement = null;

  // Comprueba que los elementos necesarios existan.
  function validateElements() {
    const requiredElements = {
      gallery,
      intro,
      enterButton,
      skipIntroButton,
      searchInput,
      shuffleButton,
      resultsCount,
      emptyState,
      lightbox,
      lightboxContent,
      closeLightboxButton,
      lightboxPrev,
      lightboxNext,
      music,
      audioToggle,
      volume
    };

    const missing = Object.keys(requiredElements).filter(
      (key) => !requiredElements[key]
    );

    if (missing.length > 0) {
      console.error(
        "Drawllery: faltan elementos HTML con estos nombres:",
        missing.join(", ")
      );
      return false;
    }

    return true;
  }

  // Mezcla una lista sin modificar la original.
  function shuffle(items) {
    const result = [...items];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  // Determina la orientación de una obra.
  function detectShape(width, height) {
    const ratio = width / height;

    if (ratio > 1.1) {
      return "horizontal";
    }

    if (ratio < 0.9) {
      return "vertical";
    }

    return "square";
  }

  // Carga una imagen y obtiene sus dimensiones reales.
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = function () {
        resolve({
          src: src,
          width: image.naturalWidth,
          height: image.naturalHeight
        });
      };

      image.onerror = function () {
        reject(new Error("No se pudo cargar la imagen: " + src));
      };

      image.src = src;
    });
  }

  // Normaliza los datos de cada obra.
  function normalizeArtwork(item, index) {
    const art = typeof item === "string" ? { src: item } : item;

    return {
      src: art.src,
      title: art.title || "Obra " + String(index + 1).padStart(2, "0"),
      description: art.description || "",
      originalIndex: index
    };
  }

  // Añade un marco a una ilustración.
  function makeFrameLayer(stage, frame) {
    if (!frame) {
      return false;
    }

    const inset = frame.inset || {
      top: 12,
      right: 11,
      bottom: 12,
      left: 11
    };

    stage.style.setProperty(
      "--frame-ratio",
      frame.width + " / " + frame.height
    );

    stage.style.setProperty("--top", (inset.top ?? 12) + "%");
    stage.style.setProperty("--right", (inset.right ?? 11) + "%");
    stage.style.setProperty("--bottom", (inset.bottom ?? 12) + "%");
    stage.style.setProperty("--left", (inset.left ?? 11) + "%");

    const frameImage = document.createElement("img");

    frameImage.className = "frame-image";
    frameImage.src = frame.src;
    frameImage.alt = "";
    frameImage.draggable = false;
    frameImage.decoding = "async";

    stage.appendChild(frameImage);

    return true;
  }

  // Crea la tarjeta de una obra.
  function createArtworkCard(art, index) {
    const card = document.createElement("article");
    card.className = "artwork-card";
    card.setAttribute("role", "listitem");
    card.style.animationDelay = Math.min(index % 8, 7) * 45 + "ms";

    const button = document.createElement("button");
    button.className = "artwork-card-button";
    button.type = "button";
    button.setAttribute("aria-label", "Ampliar " + art.title);

    const stage = document.createElement("div");
    stage.className = "artwork-stage";

    stage.style.setProperty(
      "--frame-ratio",
      (art.frame ? art.frame.width : art.width) +
        " / " +
        (art.frame ? art.frame.height : art.height)
    );

    const image = document.createElement("img");
    image.className = "artwork-photo";
    image.src = art.src;
    image.alt = art.title;
    image.loading = "lazy";
    image.decoding = "async";
    image.draggable = false;

    stage.appendChild(image);

    if (makeFrameLayer(stage, art.frame)) {
      card.classList.add("has-frame");
    }

    const meta = document.createElement("div");
    meta.className = "artwork-meta";

    const title = document.createElement("h3");
    title.className = "artwork-title";
    title.textContent = art.title;

    const number = document.createElement("span");
    number.className = "artwork-number";
    number.textContent = String(index + 1).padStart(2, "0");

    meta.append(title, number);
    button.append(stage, meta);

    if (art.description) {
      const description = document.createElement("p");
      description.className = "artwork-description";
      description.textContent = art.description;
      button.appendChild(description);
    }

    button.addEventListener("click", function () {
      openArtwork(art);
    });

    // Inclinación sutil al mover el cursor.
    button.addEventListener("pointermove", function (event) {
      if (
        event.pointerType !== "mouse" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      const rect = stage.getBoundingClientRect();

      if (!rect.width || !rect.height) {
        return;
      }

      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;

      const rotateX = (0.5 - y) * 1.5;
      const rotateY = (x - 0.5) * 1.5;

      stage.style.transform =
        "perspective(900px) rotateX(" +
        rotateX +
        "deg) rotateY(" +
        rotateY +
        "deg)";
    });

    button.addEventListener("pointerleave", function () {
      stage.style.transform = "";
    });

    card.appendChild(button);

    return card;
  }

  // Carga los marcos definidos en artworks.json.
  async function loadFrames(frameData) {
    const loadedFrames = {};

    for (const [shape, list] of Object.entries(frameData || {})) {
      const results = await Promise.all(
        (Array.isArray(list) ? list : []).map(async function (frame) {
          try {
            const image = await loadImage(frame.src);

            return {
              src: image.src,
              width: image.width,
              height: image.height,
              inset: frame.inset
            };
          } catch (error) {
            console.warn(error.message);
            return null;
          }
        })
      );

      loadedFrames[shape] = results.filter(Boolean);
    }

    return loadedFrames;
  }

  // Actualiza las obras que coinciden con la búsqueda.
  function renderGallery() {
    const query = searchInput.value.trim().toLocaleLowerCase("es");

    visibleArtworks = artworks.filter(function (art) {
      const searchableText =
        (art.title + " " + art.description + " " + art.src)
          .toLocaleLowerCase("es");

      return searchableText.includes(query);
    });

    gallery.replaceChildren();

    const fragment = document.createDocumentFragment();

    visibleArtworks.forEach(function (art, index) {
      fragment.appendChild(createArtworkCard(art, index));
    });

    gallery.appendChild(fragment);

    resultsCount.textContent =
      String(visibleArtworks.length).padStart(2, "0") +
      " / " +
      String(artworks.length).padStart(2, "0") +
      " OBRAS";

    emptyState.hidden = visibleArtworks.length !== 0;
    gallery.hidden = visibleArtworks.length === 0;
  }

  // Abre una obra en la vista ampliada.
  function openArtwork(art) {
    lastFocusedElement = document.activeElement;

    const stage = document.createElement("div");
    stage.className = "lightbox-stage";

    stage.style.setProperty(
      "--frame-ratio",
      (art.frame ? art.frame.width : art.width) +
        " / " +
        (art.frame ? art.frame.height : art.height)
    );

    const image = document.createElement("img");
    image.className = "artwork-photo";
    image.src = art.src;
    image.alt = art.title;
    image.draggable = false;
    image.decoding = "async";

    stage.appendChild(image);
    makeFrameLayer(stage, art.frame);

    const caption = document.createElement("div");
    caption.className = "lightbox-caption";

    const title = document.createElement("h2");
    title.textContent = art.title;
    caption.appendChild(title);

    if (art.description) {
      const description = document.createElement("p");
      description.textContent = art.description;
      caption.appendChild(description);
    }

    lightboxContent.replaceChildren(stage, caption);

    activeArtworkIndex = visibleArtworks.indexOf(art);

    lightboxPrev.disabled = visibleArtworks.length < 2;
    lightboxNext.disabled = visibleArtworks.length < 2;

    lightbox.classList.add("visible");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    closeLightboxButton.focus();
  }

  // Cierra la vista ampliada.
  function closeArtwork() {
    lightbox.classList.remove("visible");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxContent.replaceChildren();
    document.body.classList.remove("modal-open");

    if (lastFocusedElement && lastFocusedElement.isConnected) {
      lastFocusedElement.focus();
    }
  }

  // Navega entre las obras visibles.
  function stepLightbox(direction) {
    if (visibleArtworks.length < 2) {
      return;
    }

    activeArtworkIndex =
      (activeArtworkIndex + direction + visibleArtworks.length) %
      visibleArtworks.length;

    openArtwork(visibleArtworks[activeArtworkIndex]);
  }

  // Cierra la introducción.
  function dismissIntro() {
    if (!intro || intro.classList.contains("gone")) {
      return;
    }

    intro.classList.add("opening");

    window.setTimeout(function () {
      intro.classList.add("gone");
      intro.setAttribute("aria-hidden", "true");
    }, 1500);
  }

  // Sincroniza el botón de música.
  function updateAudioButton() {
    audioToggle.textContent = musicPlaying
      ? "Música: encendida"
      : "Música: apagada";

    audioToggle.setAttribute("aria-pressed", String(musicPlaying));
  }

  // Botón de entrada.
  enterButton.addEventListener("click", async function () {
    dismissIntro();

    music.volume = Number(volume.value);
    music.muted = Number(volume.value) === 0;

    try {
      await music.play();
      musicPlaying = true;
    } catch (error) {
      musicPlaying = false;
      console.info("La música no se inició. Puedes activarla más tarde.");
    }

    updateAudioButton();
  });

  skipIntroButton.addEventListener("click", dismissIntro);

  // Búsqueda en tiempo real.
  searchInput.addEventListener("input", renderGallery);

  // Mezcla el orden de la galería.
  shuffleButton.addEventListener("click", function () {
    artworks = shuffle(artworks);
    renderGallery();
  });

  // Controles de la vista ampliada.
  closeLightboxButton.addEventListener("click", closeArtwork);

  lightboxPrev.addEventListener("click", function () {
    stepLightbox(-1);
  });

  lightboxNext.addEventListener("click", function () {
    stepLightbox(1);
  });

  lightbox.addEventListener("click", function (event) {
    if (event.target === lightbox) {
      closeArtwork();
    }
  });

  // Control de reproducción de música.
  audioToggle.addEventListener("click", async function () {
    if (musicPlaying) {
      music.pause();
      musicPlaying = false;
    } else {
      try {
        music.volume = Number(volume.value);
        music.muted = Number(volume.value) === 0;

        await music.play();
        musicPlaying = true;
      } catch (error) {
        musicPlaying = false;
        console.info("No se pudo reproducir la música. Comprueba el archivo.");
      }
    }

    updateAudioButton();
  });

  volume.addEventListener("input", function () {
    music.volume = Number(volume.value);
    music.muted = Number(volume.value) === 0;
  });

  music.addEventListener("pause", function () {
    musicPlaying = false;
    updateAudioButton();
  });

  music.addEventListener("play", function () {
    musicPlaying = true;
    updateAudioButton();
  });

  // Atajos de teclado.
  document.addEventListener("keydown", function (event) {
    if (lightbox.classList.contains("visible")) {
      if (event.key === "Escape") {
        closeArtwork();
      }

      if (event.key === "ArrowLeft") {
        stepLightbox(-1);
      }

      if (event.key === "ArrowRight") {
        stepLightbox(1);
      }

      return;
    }

    if (!intro.classList.contains("gone")) {
      if (event.key === "Escape") {
        dismissIntro();
      }

      return;
    }

    if (event.key === "/" && document.activeElement !== searchInput) {
      event.preventDefault();
      searchInput.focus();
    }
  });

  // Carga la colección desde artworks.json.
  async function initGallery() {
    resultsCount.textContent = "CARGANDO OBRAS";

    try {
      const response = await fetch("./artworks.json");

      if (!response.ok) {
        throw new Error(
          "artworks.json respondió con HTTP " + response.status
        );
      }

      const data = await response.json();

      if (!Array.isArray(data.artworks)) {
        throw new Error(
          'El JSON debe contener una lista llamada "artworks".'
        );
      }

      const loadedFrames = await loadFrames(data.frames);

      const checkedArtworks = await Promise.all(
        data.artworks.map(async function (item, index) {
          const art = normalizeArtwork(item, index);

          if (!art.src) {
            return null;
          }

          try {
            const image = await loadImage(art.src);
            const shape = detectShape(image.width, image.height);
            const options = loadedFrames[shape] || [];

            const frame = options.length > 0
              ? randomItem(options)
              : null;

            return {
              ...art,
              ...image,
              shape: shape,
              frame: frame
            };
          } catch (error) {
            console.warn(error.message);
            return null;
          }
        })
      );

      // Conserva las rutas repetidas del JSON.
      artworks = shuffle(checkedArtworks.filter(Boolean));

      if (artworks.length === 0) {
        throw new Error(
          "No se pudo cargar ninguna obra. Comprueba la carpeta Images."
        );
      }

      renderGallery();
    } catch (error) {
      console.error("Error al iniciar Drawllery:", error);

      resultsCount.textContent = "NO SE PUDO CARGAR";
      gallery.replaceChildren();

      const message = document.createElement("p");
      message.className = "empty-state";
      message.hidden = false;
      message.textContent =
        "No se pudo cargar la galería. Comprueba las rutas de las carpetas " +
        "y abre el proyecto con Live Server.";

      gallery.appendChild(message);
    }
  }

  // Comprueba el HTML antes de iniciar.
  if (validateElements()) {
    initGallery();
    updateAudioButton();
  }
})();