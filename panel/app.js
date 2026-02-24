// UTF-8 корректная панель управления Minnori
const state = {
  owner: "", repo: "", branch: "main", token: "",
  home: null, nav: null, cat: null, items: []
};

const GH_HEADERS = () => ({
  Authorization: `token ${state.token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28"
});

// Base64 <-> Uint8Array
function b64ToUint8Array(b64) {
  const bin = atob(b64);
  const len = bin.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}
function uint8ToB64(u8) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    bin += String.fromCharCode(...u8.subarray(i, i + chunk));
  }
  return btoa(bin);
}
// UTF-8 helpers
function utf8ToBase64(str) {
  const u8 = new TextEncoder().encode(str);
  return uint8ToB64(u8);
}
function base64ToUtf8(b64) {
  const u8 = b64ToUint8Array(b64);
  return new TextDecoder("utf-8").decode(u8);
}

const api = {
  async get(path) {
    const r = await fetch(`https://api.github.com/repos/${state.owner}/${state.repo}/contents/${path}?ref=${state.branch}`, {
      headers: GH_HEADERS()
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async put(path, contentBase64, sha, message) {
    const r = await fetch(`https://api.github.com/repos/${state.owner}/${state.repo}/contents/${path}`, {
      method: "PUT",
      headers: { ...GH_HEADERS(), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message || `Update ${path}`,
        content: contentBase64,
        branch: state.branch,
        sha
      })
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async getText(path) {
    const j = await this.get(path);
    const clean = (j.content || "").replace(/\n/g, "");
    const content = base64ToUtf8(clean);
    return { text: content, sha: j.sha };
  },
  async getJSON(path) {
    const { text, sha } = await this.getText(path);
    return { json: JSON.parse(text), sha };
  },
  async putJSON(path, obj, sha, msg) {
    const txt = JSON.stringify(obj, null, 2);
    const b64 = utf8ToBase64(txt);
    return this.put(path, b64, sha, msg);
  },
  async uploadFile(destPath, file) {
    const arrayBuf = await file.arrayBuffer();
    const b64 = uint8ToB64(new Uint8Array(arrayBuf)); // корректно для больших файлов
    return this.put(destPath, b64, undefined, `Upload ${destPath}`);
  }
};

// DOM утилиты
function el(tag, props = {}, children = []) {
  const e = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === "class") e.className = v;
    else if (k === "text") e.textContent = v;
    else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
    else if (k.startsWith("on") && typeof v === "function") e[k] = v;
    else e.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c == null) return;
    if (typeof c === "string") e.appendChild(document.createTextNode(c));
    else e.appendChild(c);
  });
  return e;
}
function setStatus(msg) { document.getElementById("status").textContent = msg; }

// Безопасное сохранение JSON (ретрай при несовпадении sha)
async function safePutJSON(path, obj, currentSha, msg) {
  try {
    return await api.putJSON(path, obj, currentSha, msg);
  } catch (e) {
    const s = String(e);
    if (s.includes("sha") || s.includes("does not match")) {
      const { sha } = await api.getText(path);
      return api.putJSON(path, obj, sha, msg);
    }
    throw e;
  }
}

async function connect() {
  state.owner = document.getElementById("ghOwner").value.trim();
  state.repo = document.getElementById("ghRepo").value.trim();
  state.branch = document.getElementById("ghBranch").value.trim() || "main";
  state.token = document.getElementById("ghToken").value.trim();

  if (!state.owner || !state.repo || !state.token) {
    setStatus("Укажите owner, repo и токен");
    return;
  }
  setStatus("Проверка репозитория...");
  try {
    const home = await api.getJSON("content/home.json");
    const nav = await api.getJSON("content/navigation.json");
    state.home = { data: home.json, sha: home.sha };
    state.nav = { data: nav.json, sha: nav.sha };
    fillHome();
    fillNav();
    fillParentsSelect();
    document.getElementById("panelContent").style.display = "block";
    setStatus("Подключено");
  } catch (e) {
    console.error(e);
    setStatus("Ошибка подключения. Проверьте реквизиты и наличие контента в репозитории.");
  }
}

function fillHome() {
  document.getElementById("homeTitle").value = state.home.data.title || "";
  document.getElementById("homeLead").value = state.home.data.lead || "";
  document.getElementById("homeImages").value = (state.home.data.images || []).join("\n");
}

function fillNav() {
  const root = document.getElementById("navEditor");
  root.innerHTML = "";

  (state.nav.data.parents || []).forEach((p, idx) => {
    const childrenBox = el("div", {}, (p.children || []).map((c, cidx) => {
      return el("div", { class: "item" }, [
        el("div", { class: "cols-2" }, [
          el("input", { type: "text", value: c.slug, "data-idx": idx, "data-cidx": cidx, "data-f": "slug" }),
          el("input", { type: "text", value: c.title || "", "data-idx": idx, "data-cidx": cidx, "data-f": "title" })
        ]),
        el("div", { style: "margin-top:6px" }, [
          el("button", { class: "btn secondary", onclick: () => { p.children.splice(cidx, 1); fillNav(); } }, "Удалить подраздел")
        ])
      ]);
    }));

    const box = el("div", { class: "item" }, [
      el("div", { class: "row" }, [
        el("label", {}, "ID (men/women и т.п.)"),
        el("input", { type: "text", value: p.id, "data-idx": idx, "data-f": "id" })
      ]),
      el("div", { class: "row" }, [
        el("label", {}, "Заголовок"),
        el("input", { type: "text", value: p.title || "", "data-idx": idx, "data-f": "title" })
      ]),
      el("div", {}, [
        el("div", { class: "muted" }, "Подразделы:"),
        childrenBox,
        el("button", { class: "btn secondary", onclick: () => { p.children = p.children || []; p.children.push({ slug: "new", title: "новая" }); fillNav(); } }, "Добавить подраздел")
      ]),
      el("div", { style: "margin-top:10px" }, [
        el("button", { class: "btn secondary", onclick: () => { state.nav.data.parents.splice(idx, 1); fillNav(); } }, "Удалить раздел")
      ])
    ]);

    root.appendChild(box);
  });

  root.appendChild(el("button", { class: "btn secondary", onclick: () => { state.nav.data.parents.push({ id: "new", title: "Новый", children: [] }); fillNav(); } }, "Добавить раздел"));

  root.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("input", () => {
      const idx = +inp.getAttribute("data-idx");
      const cidxAttr = inp.getAttribute("data-cidx");
      const f = inp.getAttribute("data-f");
      if (cidxAttr === null) {
        state.nav.data.parents[idx][f] = inp.value;
      } else {
        const cidx = +cidxAttr;
        state.nav.data.parents[idx].children[cidx][f] = inp.value;
      }
    });
  });
}

function fillParentsSelect() {
  const sel = document.getElementById("catParent");
  sel.innerHTML = "";
  (state.nav.data.parents || []).forEach(p => {
    sel.appendChild(el("option", { value: p.id, text: p.title || p.id }));
  });
}

async function saveHome() {
  state.home.data.title = document.getElementById("homeTitle").value.trim();
  state.home.data.lead = document.getElementById("homeLead").value.trim();
  state.home.data.images = document.getElementById("homeImages").value.split("\n").map(s => s.trim()).filter(Boolean);

  try {
    const res = await safePutJSON("content/home.json", state.home.data, state.home.sha, "Update home.json");
    state.home.sha = res.content.sha;
    setStatus("Главная сохранена");
  } catch (e) {
    console.error(e);
    setStatus("Ошибка сохранения главной");
  }
}

async function saveNav() {
  try {
    const res = await safePutJSON("content/navigation.json", state.nav.data, state.nav.sha, "Update navigation.json");
    state.nav.sha = res.content.sha;
    setStatus("Меню сохранено");
    fillParentsSelect();
  } catch (e) {
    console.error(e);
    setStatus("Ошибка сохранения меню");
  }
}

async function loadCategory() {
  const parent = document.getElementById("catParent").value.trim();
  const slug = document.getElementById("catSlug").value.trim();
  if (!parent || !slug) return;
  const path = `content/categories/${parent}-${slug}.json`;
  try {
    const { json, sha } = await api.getJSON(path);
    state.cat = { path, data: json, sha };
  } catch {
    state.cat = {
      path,
      data: {
        parentId: parent,
        slug,
        slugTitle: slug,
        title: "",
        description: "",
        grid: { columns: 3, gap: "24px" },
        items: []
      },
      sha: undefined
    };
  }
  fillCatForm();
}

function fillCatForm() {
  const d = state.cat.data;
  document.getElementById("catTitle").value = d.title || "";
  document.getElementById("catDesc").value = d.description || "";
  document.getElementById("catCols").value = (d.grid && d.grid.columns) || 3;
  document.getElementById("catGap").value = (d.grid && d.grid.gap) || "24px";
  state.items = (d.items || []).slice();
  renderItems();
}

function renderItems() {
  const wrap = document.getElementById("items");
  wrap.innerHTML = "";
  state.items.forEach((it, idx) => {
    const box = el("div", { class: "item" }, [
      el("div", { class: "row" }, [ el("label", {}, "Изображение (URL)"), el("input", { type: "url", value: it.image || "", "data-idx": idx, "data-f": "image" }) ]),
      el("div", { class: "row" }, [ el("label", {}, "Подпись"), el("input", { type: "text", value: it.caption || "", "data-idx": idx, "data-f": "caption" }) ]),
      el("div", { class: "row" }, [ el("label", {}, "Ссылка"), el("input", { type: "url", value: it.link || "", "data-idx": idx, "data-f": "link" }) ]),
      el("div", {}, el("button", { class: "btn secondary", onclick: () => { state.items.splice(idx, 1); renderItems(); } }, "Удалить"))
    ]);
    wrap.appendChild(box);
  });
  wrap.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("input", () => {
      const idx = +inp.getAttribute("data-idx");
      const f = inp.getAttribute("data-f");
      state.items[idx][f] = inp.value;
    });
  });
}

async function saveCat() {
  if (!state.cat) {
    setStatus("Выберите родителя и slug категории");
    return;
  }
  const d = state.cat.data;
  d.title = document.getElementById("catTitle").value.trim();
  d.description = document.getElementById("catDesc").value.trim();
  d.grid = {
    columns: parseInt(document.getElementById("catCols").value, 10) || 3,
    gap: document.getElementById("catGap").value.trim() || "24px"
  };
  d.items = state.items;

  try {
    const txt = JSON.stringify(d, null, 2);
    const b64 = utf8ToBase64(txt);
    let res;
    try {
      res = await api.put(state.cat.path, b64, state.cat.sha, `Update ${state.cat.path}`);
    } catch (e) {
      const s = String(e);
      if (s.includes("sha") || s.includes("does not match")) {
        const latest = await api.getText(state.cat.path).catch(() => null);
        const latestSha = latest?.sha;
        res = await api.put(state.cat.path, b64, latestSha, `Update ${state.cat.path}`);
      } else {
        throw e;
      }
    }
    state.cat.sha = res.content.sha;
    setStatus("Страница подраздела сохранена");
  } catch (e) {
    console.error(e);
    setStatus("Ошибка сохранения страницы");
  }
}

async function uploadToAssets(inputEl, subfolder, onDone) {
  const f = inputEl.files?.[0];
  if (!f) return;
  const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const dest = `assets/img/${subfolder}/${Date.now()}-${safeName}`;
  try {
    const res = await api.uploadFile(dest, f);
    const rel = dest;
    onDone(rel);
    setStatus(`Загружено: ${rel}`);
    inputEl.value = "";
  } catch (e) {
    console.error(e);
    setStatus("Ошибка загрузки файла");
  }
}

function bind() {
  document.getElementById("connectBtn").addEventListener("click", connect);
  document.getElementById("saveHome").addEventListener("click", saveHome);
  document.getElementById("saveNav").addEventListener("click", saveNav);

  document.getElementById("catParent").addEventListener("change", loadCategory);
  document.getElementById("catSlug").addEventListener("change", loadCategory);
  document.getElementById("saveCat").addEventListener("click", saveCat);
  document.getElementById("addItem").addEventListener("click", () => {
    state.items.push({ image: "", caption: "", link: "", target: "_blank" });
    renderItems();
  });

  document.getElementById("homeUpload").addEventListener("change", (e) => {
    uploadToAssets(e.target, "uploads", (rel) => {
      const ta = document.getElementById("homeImages");
      const v = ta.value.trim();
      ta.value = v ? (v + "\n" + rel) : rel;
    });
  });

  document.getElementById("catUpload").addEventListener("change", (e) => {
    uploadToAssets(e.target, "uploads", (rel) => {
      state.items.push({ image: rel, caption: "", link: "", target: "_blank" });
      renderItems();
    });
  });
}

document.addEventListener("DOMContentLoaded", bind);
