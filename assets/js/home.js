async function renderHome() {
  try {
    const root = document.getElementById("homeRoot");
    const data = await fetchJSON("content/home.json");
    root.innerHTML = "";

    const hero = document.createElement("section");
    hero.className = "hero";

    const h1 = document.createElement("h1");
    h1.textContent = data.title || "Minnori — обувь";
    hero.appendChild(h1);

    if (data.lead) {
      const p = document.createElement("p");
      p.className = "lead";
      p.textContent = data.lead;
      hero.appendChild(p);
    }

    if (Array.isArray(data.images) && data.images.length > 0) {
      const wrap = document.createElement("div");
      wrap.className = "hero-images " + (data.images.length >= 2 ? "two" : "");

      data.images.slice(0, 2).forEach((src) => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = "Minnori";
        wrap.appendChild(img);
      });

      hero.appendChild(wrap);
    }

    root.appendChild(hero);
  } catch (e) {
    console.error("Home render error", e);
  }
}

document.addEventListener("DOMContentLoaded", renderHome);
