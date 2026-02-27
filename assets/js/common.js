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
function isMobile() { return window.matchMedia("(max-width: 1023.98px)").matches; }

/* Установка meta description */
function setMetaDescription(text) {
  const head = document.head || document.getElementsByTagName("head")[0];
  let tag = head.querySelector('meta[name="description"]');
  const content = String(text || "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", "description");
    head.appendChild(tag);
  }
  tag.setAttribute("content", content || "Обувь Minnori — официальный сайт.");
}

/* Friendly URL для подкатегорий */
function buildCatUrl(parentId, slug) {
  if (!parentId || !slug) return "#";
  return `/${encodeURIComponent(String(parentId))}/${encodeURIComponent(String(slug))}/`;
}
/* Конвертация старых ссылок вида category.html?parent=...&slug=... -> /parent/slug/ */
function toFriendlyLink(link) {
  if (!link) return link;
  try {
    const u = new URL(link, location.origin);
    if (u.pathname.endsWith("category.html")) {
      const p = u.searchParams.get("parent");
      const s = u.searchParams.get("slug");
      if (p && s) return buildCatUrl(p, s);
    }
  } catch (e) { /* игнор */ }
  return link;
}

function toggleMenu(open) {
  const menu = qs("#overlayMenu");
  if (!menu) return;
  const willOpen = typeof open === "boolean" ? open : !menu.classList.contains("open");
  menu.classList.toggle("open", willOpen);
  menu.setAttribute("aria-hidden", willOpen ? "false" : "true");

  const lock = willOpen && isMobile();
  document.body.classList.toggle("menu-open", lock);
  document.documentElement.classList.toggle("menu-open", lock);

  if (willOpen) setViewportVar();
}

function buildMenuLayout(nav) {
  const root = qs("#overlayContent");
  if (!root) return;

  const parents = nav.parents || [];
  const women = parents.find(p => (p.id || "").toLowerCase() === "women") || parents[0];
  const men   = parents.find(p => (p.id || "").toLowerCase() === "men")   || parents[1];

  const promo = nav.menuPromo || {};
  const wPromo = promo.women || {};
  const mPromo = promo.men || {};

  const makeColumn = (parent) => {
    if (!parent) return "";
    const items = (parent.children || []).map(c => {
      const href = buildCatUrl(parent.id, c.slug);
      return `<a href="${href}">${c.title || c.slug}</a>`;
    }).join("");
    return `
      <div class="menu-col">
        <div class="menu-parent">${parent.title || parent.id}</div>
        <div class="menu-children">${items}</div>
      </div>
    `;
  };

  function fallbackLink(parent) {
    if (!parent || !parent.children || !parent.children.length) return "#";
    const c = parent.children[0];
    return buildCatUrl(parent.id, c.slug);
  }
  const wHrefRaw = wPromo.link || fallbackLink(women);
  const mHrefRaw = mPromo.link || fallbackLink(men);
  const wHref = toFriendlyLink(wHrefRaw) || fallbackLink(women);
  const mHref = toFriendlyLink(mHrefRaw) || fallbackLink(men);

  const wImg = wPromo.image ? `<a class="promo" href="${wHref}"><img src="${wPromo.image}" alt="Женская обувь"></a>` : "";
  const mImg = mPromo.image ? `<a class="promo" href="${mHref}"><img src="${mPromo.image}" alt="Мужская обувь"></a>` : "";

  root.innerHTML = `
    <div class="menu-home"><a href="/">Главная</a></div>
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
    const nav = await fetchJSON("/content/navigation.json");
    buildMenuLayout(nav);
  } catch (e) {
    console.error("Не удалось загрузить меню:", e);
  }
}

function initMenu() {
  qs(".menu-toggle")?.addEventListener("click", () => toggleMenu());
  qs("#menuCloseBtn")?.addEventListener("click", () => toggleMenu(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggleMenu(false); });
  setViewportVar();
  window.addEventListener("resize", setViewportVar);
  buildMenu();
}

document.addEventListener("DOMContentLoaded", initMenu);
