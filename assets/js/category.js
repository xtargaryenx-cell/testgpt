function qs(sel, root = document) { return root.querySelector(sel); }
async function fetchJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Не удалось загрузить ${path}: ${res.status}`);
  }
  return res.json();
}

function params() {
  const u = new URL(location.href);
  return {
    parent: (u.searchParams.get("parent") || "").trim(),
    slug: (u.searchParams.get("slug") || "").trim()
  };
}

function humanParent(p) {
  if (p === "men") return "Мужские";
  if (p === "women") return "Женские";
  return "";
}

async function renderCategory() {
  const root = document.getElementById("categoryRoot");
  const { parent, slug } = params();
  if (!parent || !slug) {
    root.innerHTML = "<p>Страница не найдена: отсутствуют параметры parent/slug.</p>";
    return;
  }
  const path = `content/categories/${parent}-${slug}.json`;

  try {
    const data = await fetchJSON(path);
    root.innerHTML = "";

    const header = document.createElement("div");
    header.className = "category-header";

    const h1 = document.createElement("h1");
    const defaultTitle = `${humanParent(parent)} ${data.slugTitle || data.slug || ""}`.trim();
    h1.textContent = data.title || defaultTitle || "Категория";
    header.appendChild(h1);

    if (data.description) {
      const p = document.createElement("p");
      p.textContent = data.description;
      header.appendChild(p);
    }

    root.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "grid";
    grid.style.setProperty("--grid-columns", (data.grid && data.grid.columns) || 3);
    grid.style.setProperty("--grid-gap", (data.grid && data.grid.gap) || "24px");

    if (!Array.isArray(data.items) || data.items.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "Нет элементов для отображения.";
      root.appendChild(empty);
      return;
    }

    data.items.forEach((it) => {
      const a = document.createElement("a");
      a.className = "card";
      a.href = it.link || "#";
      a.target = it.target || "_blank";
      a.rel = "noopener";

      const img = document.createElement("img");
      img.src = it.image;
      img.alt = it.caption || "Minnori";
      a.appendChild(img);

      if (it.caption) {
        const cap = document.createElement("div");
        cap.className = "caption";
        cap.textContent = it.caption;
        a.appendChild(cap);
      }

      grid.appendChild(a);
    });

    root.appendChild(grid);
  } catch (e) {
    console.error(e);
    root.innerHTML = `
      <p>Не удалось загрузить страницу категории.</p>
      <p style="color:#666">Ожидался файл: ${path}</p>
    `;
  }
}

document.addEventListener("DOMContentLoaded", renderCategory);
