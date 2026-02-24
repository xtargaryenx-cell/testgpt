async function fetchJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed for ${path}`);
  return res.json();
}

function qs(sel, root = document) { return root.querySelector(sel); }

function setViewportVar() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}

function isMobile() {
  return window.matchMedia("(max-width: 1023.98px)").matches;
}

function toggleMenu(open) {
  const menu = qs("#overlayMenu");
  if (!menu) return;

  const willOpen = typeof open === "boolean" ? open : !menu.classList.contains("open");
  menu.classList.toggle("open", willOpen);
  menu.setAttribute("aria-hidden", willOpen ? "false" : "true");

  // Блокируем фон только на мобильном фуллскрине
  const lock = willOpen && isMobile();
  document.body.classList.toggle("menu-open", lock);
  document.documentElement.classList.toggle("menu-open", lock);

  if (willOpen) setViewportVar();
}

function makeColumn(parent) {
  if (!parent) return "";
  const children = (parent.children || []).map(c => {
    const href = `category.html?parent=${encodeURIComponent(parent.id)}&slug=${encodeURIComponent(c.slug)}`;
    return `<a href="${href}">${c.title || c.slug}</a>`;
  }).join("");
  return `
    <div class="menu-col">
      <div class="menu-parent">${parent.title || parent.id}</div>
      <div class="menu-children">${children}</div>
    </div>
  `;
}

function buildMenuLayout(nav) {
  const root = document.querySelector("#overlayContent");
  if (!root) return;

  const parents = nav.parents || [];
  const women = parents.find(p => (p.id || "").toLowerCase() === "women") || parents[0];
  const men   = parents.find(p => (p.id || "").toLowerCase() === "men")   || parents[1];

  const promo = nav.menuPromo || {};
  const wPromo = promo.women || {};
  const mPromo = promo.men || {};

  function fallbackLink(parent) {
    if (!parent || !parent.children || !parent.children.length) return "#";
    const c = parent.children[0];
    return `category.html?parent=${encodeURIComponent(parent.id)}&slug=${encodeURIComponent(c.slug)}`;
  }

  const wHref = wPromo.link || fallbackLink(women);
  const mHref = mPromo.link || fallbackLink(men);

  const wImg = wPromo.image ? `<a class="promo" href="${wHref}"><img src="${wPromo.image}" alt="Женская обувь"></a>` : "";
  const mImg = mPromo.image ? `<a class="promo" href="${mHref}"><img src="${mPromo.image}" alt="Мужская обувь"></a>` : "";

  const makeColumn = (parent) => {
    if (!parent) return "";
    const children = (parent.children || []).map(c => {
      const href = `category.html?parent=${encodeURIComponent(parent.id)}&slug=${encodeURIComponent(c.slug)}`;
      return `<a href="${href}">${c.title || c.slug}</a>`;
    }).join("");
    return `
      <div class="menu-col">
        <div class="menu-parent">${parent.title || parent.id}</div>
        <div class="menu-children">${children}</div>
      </div>
    `;
  };

  root.innerHTML = `
    <div class="menu-home"><a href="./">Главная</a></div>
    <div class="menu-grid">
      ${makeColumn(women)}
      ${makeColumn(men)}
      <div class="menu-promo menu-promo--women">${wImg}</div>
      <div class="menu-promo menu-promo--men">${mImg}</div>
    </div>
  `;
}

async function buildMenu() {
  try {
    const nav = await fetchJSON("content/navigation.json");
    buildMenuLayout(nav);
  } catch (e) {
    console.error("Не удалось загрузить меню:", e);
  }
}

function initMenu() {
  const btn = qs(".menu-toggle");
  if (btn) btn.addEventListener("click", () => toggleMenu());

  qs("#menuCloseBtn")?.addEventListener("click", () => toggleMenu(false));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") toggleMenu(false);
  });

  setViewportVar();
  window.addEventListener("resize", setViewportVar);

  buildMenu();
}

document.addEventListener("DOMContentLoaded", initMenu);
