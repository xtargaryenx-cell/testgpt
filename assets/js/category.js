// Страница подкатегории: загрузка данных, установка тайтла и рендер

function getQueryParam(name) {
  const u = new URL(location.href);
  return u.searchParams.get(name) || "";
}

function adjByParentId(id, fallbackTitle) {
  const key = (id || "").toLowerCase();
  if (key === "men") return "Мужские";
  if (key === "women") return "Женские";
  // Иначе используем заголовок из навигации как есть (без склонения)
  return (fallbackTitle || "").trim();
}

function composeTitle(nav, parentId, slug, catData) {
  // Ищем родителя и подраздел в навигации
  const parents = (nav && nav.parents) || [];
  const parent = parents.find(p => (p.id || "").toLowerCase() === (parentId || "").toLowerCase());
  const child  = parent?.children?.find(c => (c.slug || "").toLowerCase() === (slug || "").toLowerCase());

  const adj = adjByParentId(parentId, parent?.title || "");
  // Приоритет названия подкатегории: из навигации -> из данных категории -> slug
  const subTitle = (child?.title || catData?.slugTitle || catData?.title || slug || "").trim();

  const prefix = "Обувь Minnori | ";
  if (adj) return `${prefix}${adj}${subTitle ? " " + subTitle : ""}`;
  // Фолбэк, если не нашли adj: используем "Каталог" + название
  return `${prefix}${parent?.title || "Каталог"}${subTitle ? " " + subTitle : ""}`;
}

function cardHTML(item) {
  const img = item.image ? `<img src="${item.image}" alt="${item.caption || ""}">` : "";
  const cap = item.caption ? `<div class="caption">${item.caption}</div>` : "";
  const inner = `${img}${cap}`;
  if (item.link) {
    return `<a class="card" href="${item.link}" target="${item.target || "_self"}" rel="${item.target === "_blank" ? "noopener" : ""}">${inner}</a>`;
  }
  return `<div class="card">${inner}</div>`;
}

async function buildCategory() {
  const parentId = getQueryParam("parent");
  const slug = getQueryParam("slug");

  if (!parentId || !slug) {
    console.warn("Не заданы параметры parent/slug");
    document.title = "Обувь Minnori | Каталог";
    return;
  }

  try {
    // Загружаем данные категории и навигацию параллельно
    const [catData, nav] = await Promise.all([
      fetchJSON(`content/categories/${encodeURIComponent(parentId)}-${encodeURIComponent(slug)}.json`),
      fetchJSON("content/navigation.json")
    ]);

    // Тайтл
    document.title = composeTitle(nav, parentId, slug, catData);

    // Разметка страницы
    const root = document.querySelector("#categoryRoot");
    if (!root) return;

    const title = catData.title || "";
    const desc  = catData.description || "";

    // Хедер
    const headerHTML = `
      <div class="category-header">
        ${title ? `<h1>${title}</h1>` : ""}
        ${desc ? `<p>${desc}</p>` : ""}
      </div>
    `;

    // Сетка карточек
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
    const root = document.querySelector("#categoryRoot");
    if (root) root.innerHTML = `<p>Не удалось загрузить данные этой подкатегории.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", buildCategory);
