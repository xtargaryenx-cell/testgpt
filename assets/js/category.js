// Страница подкатегории: загрузка данных, title/description и рендер

function getQueryParam(name) {
  const u = new URL(location.href);
  return u.searchParams.get(name) || "";
}
/* Чтение параметров из path: /{parent}/{slug}/ */
function getRouteParams() {
  const path = location.pathname.replace(/^\/+|\/+$/g, "");
  const parts = path.split("/");
  if (parts.length >= 2 && !parts[0].endsWith(".html")) {
    return { parent: decodeURIComponent(parts[0] || ""), slug: decodeURIComponent(parts[1] || "") };
  }
  return null;
}

function adjByParentId(id, fallbackTitle) {
  const key = (id || "").toLowerCase();
  if (key === "men") return "Мужские";
  if (key === "women") return "Женские";
  return (fallbackTitle || "").trim();
}

function composeTitle(nav, parentId, slug, catData) {
  const parents = (nav && nav.parents) || [];
  const parent = parents.find(p => (p.id || "").toLowerCase() === (parentId || "").toLowerCase());
  const child  = parent?.children?.find(c => (c.slug || "").toLowerCase() === (slug || "").toLowerCase());

  const adj = adjByParentId(parentId, parent?.title || "");
  const subTitle = (child?.title || catData?.slugTitle || catData?.title || slug || "").trim();

  const prefix = "Обувь Minnori | ";
  if (adj) return `${prefix}${adj}${subTitle ? " " + subTitle : ""}`;
  return `${prefix}${parent?.title || "Каталог"}${subTitle ? " " + subTitle : ""}`;
}

function composeDescription(nav, parentId, slug, catData) {
  if (catData?.description) return catData.description;
  const parents = (nav && nav.parents) || [];
  const parent = parents.find(p => (p.id || "").toLowerCase() === (parentId || "").toLowerCase());
  const child  = parent?.children?.find(c => (c.slug || "").toLowerCase() === (slug || "").toLowerCase());

  const adj = adjByParentId(parentId, parent?.title || "Каталог");
  const subTitle = (child?.title || catData?.slugTitle || catData?.title || slug || "").trim();

  return `${adj}${subTitle ? " " + subTitle : ""} — подборка изображений и ссылки. Обувь Minnori.`;
}

function cardHTML(item) {
  const src = resolveAsset(item.image);
  const img = src ? `<img src="${src}" alt="${item.caption || ""}">` : "";
  const cap = item.caption ? `<div class="caption">${item.caption}</div>` : "";
  const inner = `${img}${cap}`;
  if (item.link) {
    const target = item.target || "_self";
    const rel = target === "_blank" ? ' rel="noopener"' : "";
    return `<a class="card" href="${item.link}" target="${target}"${rel}>${inner}</a>`;
  }
  return `<div class="card">${inner}</div>`;
}

async function buildCategory() {
  const route = getRouteParams();
  const parentId = route?.parent || getQueryParam("parent");
  const slug = route?.slug || getQueryParam("slug");

  if (!parentId || !slug) {
    console.warn("Не заданы параметры parent/slug");
    document.title = "Обувь Minnori | Каталог";
    setMetaDescription("Обувь Minnori — каталог подкатегорий, подборки изображений и ссылки.");
    return;
  }

  try {
    const [catData, nav] = await Promise.all([
      fetchJSON(`/content/categories/${encodeURIComponent(parentId)}-${encodeURIComponent(slug)}.json`),
      fetchJSON("/content/navigation.json")
    ]);

    document.title = composeTitle(nav, parentId, slug, catData);
    setMetaDescription(composeDescription(nav, parentId, slug, catData));

    const root = document.querySelector("#categoryRoot");
    if (!root) return;

    const title = catData.title || "";
    const descBlock  = catData.description || "";

    const headerHTML = `
      <div class="category-header">
        ${title ? `<h1>${title}</h1>` : ""}
        ${descBlock ? `<p>${descBlock}</p>` : ""}
      </div>
    `;

    const items = Array.isArray(catData.items) ? catData.items : [];
    const gridHTML = `
      <div class="grid">
        ${items.map(cardHTML).join("")}
      </div>
    `;

    root.innerHTML = headerHTML + gridHTML;
  } catch (e) {
    console.error("Ошибка загрузки подкатегории:", e);
    document.title = "Обувь Minnori | Каталог";
    setMetaDescription("Обувь Minnori — каталог подкатегорий, подборки изображений и ссылки.");
    const root = document.querySelector("#categoryRoot");
    if (root) root.innerHTML = `<p>Не удалось загрузить данные этой подкатегории.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", buildCategory);
