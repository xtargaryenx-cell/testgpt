async function fetchJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Fetch failed for ${path}`);
  return res.json();
}

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

function toggleMenu(open) {
  const menu = qs("#overlayMenu");
  if (!menu) return;
  if (typeof open === "boolean") {
    menu.classList.toggle("open", open);
  } else {
    menu.classList.toggle("open");
  }
  menu.setAttribute("aria-hidden", menu.classList.contains("open") ? "false" : "true");
}

function initMenu() {
  const btn = qs(".menu-toggle");
  if (btn) btn.addEventListener("click", () => toggleMenu());

  // Закрытие по Esc или клику вне
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") toggleMenu(false);
  });
  qs("#overlayMenu")?.addEventListener("click", (e) => {
    if (e.target.id === "overlayMenu") toggleMenu(false);
  });

  // Загрузка меню из content/navigation.json
  buildMenu();
}

async function buildMenu() {
  try {
    const nav = await fetchJSON("content/navigation.json");
    const ul = qs("#menuList");
    if (!ul) return;
    ul.innerHTML = "";

    // Главная
    const homeLi = document.createElement("li");
    const homeA = document.createElement("a");
    homeA.href = "./";
    homeA.textContent = "Главная";
    homeLi.appendChild(homeA);
    ul.appendChild(homeLi);

    // Родительские разделы
    (nav.parents || []).forEach((p) => {
      const li = document.createElement("li");
      const parent = document.createElement("div");
      parent.className = "menu-parent";
      parent.textContent = p.title || p.id;
      li.appendChild(parent);

      const children = document.createElement("div");
      children.className = "menu-children";

      (p.children || []).forEach((c) => {
        const a = document.createElement("a");
        a.textContent = c.title || c.slug;
        a.href = `category.html?parent=${encodeURIComponent(p.id)}&slug=${encodeURIComponent(c.slug)}`;
        children.appendChild(a);
      });

      li.appendChild(children);
      ul.appendChild(li);
    });
  } catch (e) {
    console.error("Не удалось загрузить меню:", e);
  }
}

document.addEventListener("DOMContentLoaded", initMenu);
