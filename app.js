(() => {
  "use strict";
  const $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)];
  const read = (k) => {
      try {
        return JSON.parse(localStorage.getItem(k));
      } catch {
        return null;
      }
    },
    write = (k, v) => {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch {}
    };
  let lang = read("tv-language");
  if (!["cs", "en", "pl"].includes(lang)) {
    const browserLanguage = navigator.language.toLowerCase().split("-")[0];
    lang = ["en", "pl"].includes(browserLanguage) ? browserLanguage : "cs";
  }
  let theme =
    document.documentElement.dataset.theme === "light" ? "light" : "dark";
  let content = { menu: [], gallery: [], hours: [] },
    category = 0,
    modal = null;
  const t = (k) => LOCALES[lang][k] ?? k;
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const localized = (v) =>
    typeof v === "object" && v ? v[lang] || v.cs || "" : v;
  const safeUrl = (v) => {
    try {
      let u = new URL(v, location.href);
      return ["https:", "http:"].includes(u.protocol) ? u.href : "";
    } catch {
      return "";
    }
  };
  function render() {
    document.documentElement.lang = lang;
    document.title = 'Táta vaří | Tata Vary';
    $("meta[name=description]").setAttribute("content", t("pageDescription"));
    $$("[data-aria]").forEach((e) =>
      e.setAttribute("aria-label", t(e.dataset.aria)),
    );
    $$("[data-alt]").forEach((e) => e.setAttribute("alt", t(e.dataset.alt)));
    updateTheme();
    $$("[data-i]").forEach((e) => (e.textContent = t(e.dataset.i)));
    $$("[data-lang]").forEach((e) => {
      e.classList.toggle("active", e.dataset.lang === lang);
      e.setAttribute("aria-pressed", e.dataset.lang === lang);
    });
    $("#tabs").innerHTML = t("categories")
      .map(
        (x, i) =>
          `<button role="tab" id="tab-${i}" aria-controls="menu-content" aria-selected="${i === category}" class="${i === category ? "active" : ""}" data-category="${i}">${esc(x)}</button>`,
      )
      .join("");
    renderMenu();
    renderContact();
      const igLink = $("#instagramLink"),
        igUrl = safeUrl(content.instagram);
      if (igUrl) {
        igLink.href = igUrl;
        igLink.target = "_blank";
        igLink.rel = "noopener";
        igLink.removeAttribute("aria-disabled");
      } else {
        igLink.href = "#";
        igLink.setAttribute("aria-disabled", "true");
      }
    $("#legalCompany").textContent = content.company
      ? content.company + (content.ico ? " · IČO " + content.ico : "")
      : t("legalPending");
    $("#formStatus").textContent = "";
    if (modal) showModal(modal);
  }
  function updateTheme() {
    document.documentElement.dataset.theme = theme;
    const button = $("#themeToggle"),
      label = t(theme === "dark" ? "themeLight" : "themeDark");
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.setAttribute("aria-pressed", String(theme === "light"));
    $("#themeIcon").textContent = theme === "dark" ? "☀" : "☾";
  }
  function renderMenu() {
    const items = (content.menu || []).filter(
      (x) =>
        category === 0 ||
        x.category ===
          ["all", "mains", "soups", "desserts", "drinks"][category],
    );
    $("#menu-content").setAttribute("aria-labelledby", `tab-${category}`);
    if (!items.length) {
      $("#menu-content").innerHTML =
        `<div class="empty-menu"><div class="empty-icon"><img src="assets/logo-outline.png" alt="Táta vaří" width="94" height="72"></div><h3>${t("emptyTitle")}</h3><p>${t("emptyText")}</p><a class="button" href="#about">${t("emptyButton")}</a></div>`;
    } else {
      $("#menu-content").innerHTML =
        `<div class="menu-cards">${items.map((x) => `<article class="menu-card">${safeUrl(x.image) ? `<img src="${esc(safeUrl(x.image))}" alt="${esc(localized(x.name))}" loading="lazy">` : ""}<div>${x.badge ? `<small>${esc(localized(x.badge))}</small>` : ""}<h3>${esc(localized(x.name))}</h3><p>${esc(localized(x.description))}</p><p>${t("allergens")}: ${esc((x.allergens || []).join(", "))}</p><strong>${esc(x.price)} Kč</strong></div></article>`).join("")}</div>`;
    }
    $("#prev").disabled = $("#next").disabled = items.length <= 1;
  }
  function renderContact() {
    ["address", "phone", "email"].forEach(
      (k) => ($("#" + k).textContent = localized(content[k]) || t("pending")),
    );
    const today = (new Date().getDay() + 6) % 7;
    $("#hours").innerHTML = t("days")
      .map(
        (d, i) =>
          `<div class="hours-row ${i === today ? "today" : ""}"><span>${d}</span><span>${content.hours?.[i] ? esc(content.hours[i].open + " – " + content.hours[i].close) : t("pending")}</span></div>`,
      )
      .join("");
    const actions = [];
    if (content.phone && /^[+\d\s()-]+$/.test(content.phone))
      actions.push(
        `<a class="button small" href="tel:${esc(content.phone)}">${t("phone")}</a>`,
      );
    if (content.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content.email))
      actions.push(
        `<a class="button small" href="mailto:${esc(content.email)}">E-mail</a>`,
      );
    if (safeUrl(content.directionsUrl))
      actions.push(
        `<a class="button small" href="${esc(safeUrl(content.directionsUrl))}" target="_blank" rel="noopener">${t("directions")}</a>`,
      );
    $("#contact-actions").innerHTML = actions.join(" ");
    if (safeUrl(content.mapEmbedUrl) && localized(content.address))
      $("#map").innerHTML =
        `<iframe title="${t("directions")}" loading="lazy" referrerpolicy="no-referrer" src="${esc(safeUrl(content.mapEmbedUrl))}"></iframe>`;
    const h = content.hours?.[today];
    if (h) {
      const now = new Date(),
        mins = now.getHours() * 60 + now.getMinutes(),
        parse = (s) => {
          const [a, b] = s.split(":").map(Number);
          return a * 60 + b;
        };
      $(".hero-note span:last-child").textContent =
        mins >= parse(h.open) && mins < parse(h.close)
          ? t("openToday") + " " + h.close
          : t("closed");
    }
  }
  function showModal(type) {
    modal = type;
    let html = "";
    if (type === "settings") {
      const consent = read("tv-consent") || {};
      html = `<h2>${t("cookieSettings")}</h2><div class="setting"><div><strong>${t("necessary")}</strong><p>${t("necessaryText")}</p></div><input type="checkbox" checked disabled aria-label="${t("necessary")}"></div>${["analytics", "marketing"].map((k) => `<label class="setting"><div><strong>${t(k)}</strong><p>${t("noTracking")}</p></div><input id="${k}" type="checkbox" ${consent[k] ? "checked" : ""}></label>`).join("")}<p>${t("cookiesText")}</p><button id="saveConsent" class="button">${t("save")}</button>`;
    } else if (type.startsWith("gallery:")) {
      const i = Number(type.split(":")[1]),
        g = content.gallery?.[i];
      html = `<h2>${esc(g ? localized(g.caption) : t("g" + (i + 1)))}</h2><div class="lightbox-graphic">${g ? `<img src="${esc(safeUrl(g.image))}" alt="${esc(localized(g.caption))}">` : i === 1 ? '<img src="assets/logo.webp" alt="Táta vaří">' : ["♨", "", "☕", "♥", "✦", "☺"][i]}</div>${g ? "" : `<p>${t("galleryPlaceholder")}</p>`}`;
    } else {
      html = `<h2>${t(type === "allergens" ? "allergens" : type)}</h2><p><small>${t("updated")}</small></p>`;
      if (type === "allergens")
        html += `<p>${t("allergenText")}</p><ol>${t("allergenList")
          .map((x) => `<li>${x}</li>`)
          .join("")}</ol>`;
      else html += `<p>${t("legalDraft")}</p><p>${t(type + "Text")}</p>`;
    }
    $("#dialogContent").innerHTML = html;
    if (!$("#dialog").open) $("#dialog").showModal();
  }
  function consent(analytics, marketing) {
    write("tv-consent", {
      analytics,
      marketing,
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });
    $("#cookieBanner").hidden = true;
    if ($("#dialog").open) $("#dialog").close();
    modal = null;
  }
  document.addEventListener("click", (e) => {
    const language = e.target.closest("[data-lang]");
    if (language) {
      lang = language.dataset.lang;
      write("tv-language", lang);
      render();
    }
    const tab = e.target.closest("[data-category]");
    if (tab) {
      category = Number(tab.dataset.category);
      render();
    }
    const m = e.target.closest("[data-modal]");
    if (m) showModal(m.dataset.modal);
    const c = e.target.closest("[data-cookie]");
    if (c) {
      if (c.dataset.cookie === "settings") showModal("settings");
      else
        consent(c.dataset.cookie === "accept", c.dataset.cookie === "accept");
    }
    if (e.target.id === "saveConsent")
      consent($("#analytics").checked, $("#marketing").checked);
    if (e.target.closest("nav a")) {
      $("#nav").classList.remove("open");
      $("#burger").setAttribute("aria-expanded", "false");
    }
  });
  $("#tabs").addEventListener("keydown", (e) => {
    if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      category =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? 4
            : (category + (e.key === "ArrowRight" ? 1 : 4)) % 5;
      render();
      $(`#tab-${category}`).focus();
    }
  });
  $("#themeToggle").onclick = () => {
    theme = theme === "dark" ? "light" : "dark";
    write("tv-theme", theme);
    updateTheme();
  };
  $("#cookieSettings").onclick = () => showModal("settings");
  $("#closeDialog").onclick = () => $("#dialog").close();
  $("#dialog").addEventListener("close", () => (modal = null));
  $("#dialog").addEventListener("click", (e) => {
    if (e.target === $("#dialog")) {
      const r = $("#dialog").getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        $("#dialog").close();
    }
  });
  $("#burger").onclick = () => {
    let open = $("#nav").classList.toggle("open");
    $("#burger").setAttribute("aria-expanded", String(open));
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      $("#nav").classList.remove("open");
      $("#burger").setAttribute("aria-expanded", "false");
    }
  });
  window.addEventListener(
    "scroll",
    () => $("#header").classList.toggle("scrolled", scrollY > 60),
    { passive: true },
  );
  ["prev", "next"].forEach(
    (id) =>
      ($("#" + id).onclick = () =>
        $(".menu-cards")?.scrollBy({
          left: (id === "next" ? 1 : -1) * $(".menu-cards").clientWidth,
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        })),
  );
  $("#contactForm").onsubmit = (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    if (data.get("website")) return;
    if (!content.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content.email)) {
      $("#formStatus").textContent = t("formUnavailable");
      return;
    }
    const body = `${data.get("message")}\n\n${data.get("name")}\n${data.get("email")}`;
    location.href = `mailto:${content.email}?subject=${encodeURIComponent("Táta vaří — " + data.get("name"))}&body=${encodeURIComponent(body)}`;
    $("#formStatus").textContent = t("formReady");
  };
  $("#year").textContent = new Date().getFullYear();
  const savedConsent = read("tv-consent");
  $("#cookieBanner").hidden = !!(
    savedConsent && savedConsent.expires > Date.now()
  );
  render();
  fetch("content.json")
    .then((r) => {
      if (!r.ok) throw Error("Content unavailable");
      return r.json();
    })
    .then((data) => {
      content = data;
      render();
    })
    .catch(() => {});
})();
