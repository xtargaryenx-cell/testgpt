function renderHero(data) {
  const root = document.querySelector("#homeRoot");
  if (!root) return;

  const hero = data.hero || {};
  const desktop = resolveAsset(hero.desktop || "");
  const mobile  = resolveAsset(hero.mobile  || "");
  const altText = hero.alt || data.title || "Hero";

  const html = `
    <section class="hero-full">
      <div class="hero-wide">
        <figure class="hero-figure">
          <picture>
            ${mobile ? `<source media="(max-width: 1024px)" srcset="${mobile}">` : ""}
            ${desktop ? `<img src="${desktop}" alt="${altText}">` : ""}
          </picture>
        </figure>
      </div>
    </section>
  `;

  const title = data.title ? `<h1>${data.title}</h1>` : "";
  const lead  = data.lead  ? `<p class="lead">${data.lead}</p>` : "";
  const textBlock = (title || lead) ? `<div class="container hero">${title}${lead}</div>` : "";

  root.innerHTML = html + textBlock;

  const parts = [];
  if (data.lead) parts.push(data.lead);
  if (data.title && (!data.lead || !String(data.lead).toLowerCase().includes(String(data.title).toLowerCase()))) {
    parts.push(data.title);
  }
  const desc = `Обувь Minnori — ${parts.join(" ")}`.trim();
  setMetaDescription(desc);
}

async function buildHome() {
  try {
    const data = await fetchJSON("/content/home.json");
    renderHero(data);
  } catch (e) {
    console.error("Не удалось загрузить главную:", e);
  }
}

document.addEventListener("DOMContentLoaded", buildHome);
