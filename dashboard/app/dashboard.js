// Canadian Metaresearch Dashboard — interactive pilot.
// Loads a record-level dataset, filters client-side, re-aggregates every view
// (charts + collaboration network), and exports the filtered subset as CSV.

// ----------------------------------------------------------------------------
// Config
// ----------------------------------------------------------------------------
const OA_ORDER = ["gold", "green", "diamond", "hybrid", "bronze", "closed", "unknown"];
const OA_COLOR = {
  gold: "#f5b301", green: "#2e9e5b", diamond: "#7aa7c6", hybrid: "#9b59b6",
  bronze: "#cd7f32", closed: "#8a9aa8", unknown: "#c4ccd4",
};
const SERIES = ["#1f7a63", "#7aa7c6", "#2e9e5b", "#f5b301", "#9b59b6", "#cd7f32",
  "#e67e22", "#1abc9c", "#34495e", "#e84393", "#00897b", "#7e57c2", "#d4a017",
  "#5d6d7e", "#16a085"];
const TOP_N_NODES = 60;
const MIN_EDGE_WEIGHT = 2;
const OPENALEX = "https://api.openalex.org/works";
// Optional OpenAlex polite-pool contact. Leave empty, or set a project (non-personal)
// email; it is sent with API requests from the browser, so do not use a private address.
const POLITE = "";
const MAILTO = POLITE ? `&mailto=${encodeURIComponent(POLITE)}` : "";

Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
Chart.defaults.color = "#5c6e68";

// ----------------------------------------------------------------------------
// i18n (English / French)
// ----------------------------------------------------------------------------
let LANG = localStorage.getItem("lang") || "en";
function lookup(key) {
  const v = (I18N[LANG] && I18N[LANG][key]);
  return v !== undefined ? v : I18N.en[key];
}
function t(key) { const v = lookup(key); return v !== undefined ? v : key; }
function tf(key, fallback) { const v = lookup(key); return v !== undefined ? v : fallback; }
const langLabel = (k) => tf("lang." + k, k || "Unknown");
const oaLabel = (k) => tf("oa." + k, k);
const typeLabel = (k) => tf("type." + k, k);

function applyStatic() {
  document.documentElement.lang = LANG;
  document.title = t("header.title");
  // If a key is missing (e.g. a stale cached i18n.js), keep the hard-coded HTML
  // fallback text rather than printing the raw key.
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const v = lookup(el.dataset.i18n); if (v !== undefined) el.textContent = v;
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const v = lookup(el.dataset.i18nHtml); if (v !== undefined) el.innerHTML = v;
  });
}

function relabelFilters() {
  document.querySelectorAll("#f-oa .oa-name").forEach((s) => { s.textContent = oaLabel(s.dataset.k); });
  // Rebuild the multi-selects so language/type option labels and the "all" placeholders
  // follow the active language; current selections are preserved (filters Sets).
  if (Object.keys(multiOptions).length) { computeMultiOptions(); buildMultiSelects(); }
}

function setLang(lang) {
  LANG = lang;
  localStorage.setItem("lang", lang);
  document.querySelectorAll("#lang-toggle button").forEach((b) =>
    b.classList.toggle("active", b.dataset.lang === lang));
  applyStatic();
  relabelFilters();
  if (ALL.length) { refreshValidation(); apply(); }
}

// ----------------------------------------------------------------------------
// State
// ----------------------------------------------------------------------------
let ALL = [];          // all records
let META = {};
const charts = {};     // id -> Chart instance
let network = null;    // vis.Network instance
let netData = null;    // {nodes, edges} DataSets
let lmap = null;       // Leaflet map instance
let lmapLayer = null;  // Leaflet layer group (markers + edges)
let GEO = null;        // institution id -> [lat, lon]
let langCounts = new Map();   // language code -> count (for filter labels)
let typeCounts = new Map();   // output type -> count (for filter labels)
let viewMode = "dashboard";   // "dashboard" | "records"
let networkStale = false;     // filters changed while off the dashboard view
const tableState = { key: "year", dir: "desc", page: 0, size: 25 };

// Records-table columns. get() -> sort value; cell() -> HTML.
const TABLE_COLS = [
  { key: "title", i18n: "table.col.title", num: false, get: (r) => r.title || "",
    cell: (r) => `<a href="https://openalex.org/${r.id}" target="_blank" rel="noopener">${escapeHtml(r.title || "—")}</a>` },
  { key: "year", i18n: "table.col.year", num: true, get: (r) => r.year || 0, cell: (r) => r.year ?? "—" },
  { key: "type", i18n: "table.col.type", num: false, get: (r) => r.type || "", cell: (r) => escapeHtml(typeLabel(r.type || "unknown")) },
  { key: "language", i18n: "table.col.lang", num: false, get: (r) => r.language || "", cell: (r) => escapeHtml(langLabel(r.language || "unknown")) },
  { key: "cited_by_count", i18n: "table.col.cites", num: true, get: (r) => r.cited_by_count || 0, cell: (r) => fmt(r.cited_by_count || 0) },
  { key: "oa_status", i18n: "table.col.oa", num: false, get: (r) => r.oa_status || "",
    cell: (r) => `<span class="oa-pill" style="--oa:${OA_COLOR[r.oa_status] || "#c4ccd4"}">${escapeHtml(oaLabel(r.oa_status))}</span>` },
  { key: "topic", i18n: "table.col.topic", num: false, get: (r) => r.topic || "", cell: (r) => escapeHtml(r.topic || "—") },
  { key: "field", i18n: "table.col.field", num: false, get: (r) => r.field || "", cell: (r) => escapeHtml(r.field || "—") },
  { key: "institutions", i18n: "table.col.insts", num: true, get: (r) => r.institutions.length,
    cell: (r) => `<span title="${escapeHtml(r.institutions.map((i) => i.name).join(", "))}">${r.institutions.length}</span>` },
];

const filters = {
  yearMin: null, yearMax: null,
  oaStatus: new Set(OA_ORDER),
  // Searchable multi-selects: a Set of selected values; an empty Set means "all".
  language: new Set(),
  type: new Set(),
  field: new Set(),
  topic: new Set(),
  institution: new Set(),   // OpenAlex ids of Canadian institutions
  mrTopics: new Set(),  // selected metaresearch topic ids (filled once data loads)
  oaOnly: false,
};
let ALL_MR_TOPICS = [];   // all corpus-defining metaresearch topic ids (for reset)
const tomSelects = {};    // id -> TomSelect instance (searchable multi-select widgets)
// Config + cached option data for the five searchable multi-select filters.
const MULTI = [
  { id: "f-language", key: "language", ph: "filters.allLanguages" },
  { id: "f-type", key: "type", ph: "filters.allTypes" },
  { id: "f-field", key: "field", ph: "filters.allFields" },
  { id: "f-topic", key: "topic", ph: "filters.allTopics" },
  { id: "f-institution", key: "institution", ph: "filters.allInstitutions" },
];
let multiOptions = {};   // id -> [[value, label], ...] for the current language
let instName = new Map();              // CA institution id -> name
let fieldCounts = [], topicCounts = [], instCounts = [];   // [value, count] sorted desc

// ----------------------------------------------------------------------------
// Boot
// ----------------------------------------------------------------------------
(async function boot() {
  let data;
  try {
    const res = await fetch("data/records.json", { cache: "no-store" });
    if (!res.ok) throw new Error(res.statusText);
    data = await res.json();
  } catch (err) {
    document.getElementById("loading").innerHTML =
      `⚠️ Could not load <code>data/records.json</code>. Serve over HTTP and run ` +
      `<code>build_records.py</code> first. (${err.message})`;
    return;
  }
  ALL = data.records;
  META = data.meta;

  // Institution coordinates for the geographic map (optional — map shows a notice if absent).
  try {
    const res = await fetch("data/institutions_geo.json", { cache: "no-store" });
    if (res.ok) GEO = await res.json();
  } catch (_) { /* leave GEO null */ }

  document.getElementById("loading").hidden = true;
  document.getElementById("dash").hidden = false;
  document.getElementById("methods-note").textContent = META.note || "";
  document.getElementById("filter-str").textContent = META.base_filter || "";

  buildFilterControls();
  wireUI();
  initValidation();
  setLang(LANG);   // applies static text, relabels filters, refreshes validation, runs apply()
})();

// ----------------------------------------------------------------------------
// Filter controls
// ----------------------------------------------------------------------------
function buildFilterControls() {
  const years = ALL.map((r) => r.year).filter(Boolean);
  const minY = Math.min(...years), maxY = Math.max(...years);
  filters.yearMin = minY; filters.yearMax = maxY;

  const yMin = document.getElementById("f-year-min");
  const yMax = document.getElementById("f-year-max");
  for (let y = maxY; y >= minY; y--) {
    yMin.appendChild(new Option(y, y));
    yMax.appendChild(new Option(y, y));
  }
  yMin.value = minY; yMax.value = maxY;

  // OA status checkboxes (label text in a span so it can be re-translated)
  const oaBox = document.getElementById("f-oa");
  const present = new Set(ALL.map((r) => r.oa_status));
  OA_ORDER.filter((s) => present.has(s)).forEach((s) => {
    const wrap = document.createElement("label");
    wrap.innerHTML = `<input type="checkbox" id="oa-${s}" value="${s}" checked> ` +
      `<span class="oa-name" data-k="${s}">${oaLabel(s)}</span>`;
    oaBox.appendChild(wrap);
  });

  // Searchable multi-select filters: language, type, field, topic, institution.
  // Counts are cached so option labels can be rebuilt on a language switch.
  langCounts = countBy(ALL, (r) => r.language);
  typeCounts = countBy(ALL, (r) => r.type);
  fieldCounts = [...countBy(ALL, (r) => r.field).entries()].filter(([k]) => k).sort((a, b) => b[1] - a[1]);
  topicCounts = [...countBy(ALL, (r) => r.topic).entries()].filter(([k]) => k).sort((a, b) => b[1] - a[1]);
  const instWorks = new Map();
  instName = new Map();
  ALL.forEach((r) => {
    const seen = new Set();
    r.institutions.forEach((i) => {
      if (i.country !== "CA" || seen.has(i.id)) return;
      seen.add(i.id);
      instName.set(i.id, i.name);
      instWorks.set(i.id, (instWorks.get(i.id) || 0) + 1);
    });
  });
  instCounts = [...instWorks.entries()].sort((a, b) => b[1] - a[1]);
  computeMultiOptions();
  buildMultiSelects();

  // Metaresearch topics (checkbox group) — a work may carry several.
  const mrTopicBox = document.getElementById("f-concepts");
  const mrTopicNames = META.topics || {};
  const mrTopicCounts = new Map();
  ALL.forEach((r) => (r.topics || []).forEach((tp) => mrTopicCounts.set(tp, (mrTopicCounts.get(tp) || 0) + 1)));
  ALL_MR_TOPICS = Object.keys(mrTopicNames);
  filters.mrTopics = new Set(ALL_MR_TOPICS);
  ALL_MR_TOPICS
    .sort((a, b) => (mrTopicCounts.get(b) || 0) - (mrTopicCounts.get(a) || 0))
    .forEach((id) => {
      const wrap = document.createElement("label");
      wrap.innerHTML = `<input type="checkbox" value="${id}" checked> ` +
        `<span>${escapeHtml(mrTopicNames[id])} (${mrTopicCounts.get(id) || 0})</span>`;
      mrTopicBox.appendChild(wrap);
    });
}

// Build the [value, label] option lists for the five multi-selects. Language and
// output-type labels are localized, so this is re-run on a language switch.
function computeMultiOptions() {
  const byCount = (a, b) => b[1] - a[1];
  multiOptions["f-language"] = [...langCounts.entries()].sort(byCount).map(([k, n]) => [k, `${langLabel(k)} (${n})`]);
  multiOptions["f-type"] = [...typeCounts.entries()].sort(byCount).map(([k, n]) => [k, `${typeLabel(k)} (${n})`]);
  multiOptions["f-field"] = fieldCounts.map(([k, n]) => [k, `${k} (${n})`]);
  multiOptions["f-topic"] = topicCounts.map(([k, n]) => [k, `${shortName(k)} (${n})`]);
  multiOptions["f-institution"] = instCounts.map(([id, n]) => [id, `${shortName(instName.get(id))} (${n})`]);
}

// (Re)create the Tom Select searchable multi-selects, preserving any selection.
function buildMultiSelects() {
  MULTI.forEach((cfg) => {
    const sel = document.getElementById(cfg.id);
    if (tomSelects[cfg.id]) { tomSelects[cfg.id].destroy(); }
    sel.innerHTML = "";
    multiOptions[cfg.id].forEach(([v, label]) => sel.appendChild(new Option(label, v)));
    tomSelects[cfg.id] = new TomSelect(sel, {
      plugins: ["remove_button", "checkbox_options"],
      maxItems: null,
      hidePlaceholder: false,
      placeholder: t(cfg.ph),
      onChange() { filters[cfg.key] = new Set(this.items); apply(); },
    });
    if (filters[cfg.key].size) tomSelects[cfg.id].setValue([...filters[cfg.key]], true);  // silent restore
  });
}

function wireUI() {
  document.getElementById("f-year-min").onchange = (e) => { filters.yearMin = +e.target.value; apply(); };
  document.getElementById("f-year-max").onchange = (e) => { filters.yearMax = +e.target.value; apply(); };
  // The five searchable multi-selects update filters via their Tom Select onChange (see buildMultiSelects).
  document.getElementById("f-concepts").addEventListener("change", (e) => {
    if (e.target.matches("input[type=checkbox]")) {
      e.target.checked ? filters.mrTopics.add(e.target.value) : filters.mrTopics.delete(e.target.value);
      apply();
    }
  });
  document.getElementById("f-oa-only").onchange = (e) => { filters.oaOnly = e.target.checked; apply(); };
  document.getElementById("f-oa").addEventListener("change", (e) => {
    if (e.target.matches("input[type=checkbox]")) {
      e.target.checked ? filters.oaStatus.add(e.target.value) : filters.oaStatus.delete(e.target.value);
      apply();
    }
  });
  document.getElementById("btn-reset").onclick = resetFilters;
  document.getElementById("btn-download").onclick = downloadCSV;

  // View tabs (Dashboard / Records)
  document.querySelectorAll("#view-tabs button").forEach((b) => (b.onclick = () => setView(b.dataset.view)));

  // Records table: sort on header click, paginate, change page size
  document.getElementById("rec-head").addEventListener("click", (e) => {
    const th = e.target.closest("th[data-key]"); if (!th) return;
    const key = th.dataset.key;
    if (tableState.key === key) {
      tableState.dir = tableState.dir === "asc" ? "desc" : "asc";
    } else {
      tableState.key = key;
      tableState.dir = TABLE_COLS.find((c) => c.key === key).num ? "desc" : "asc";
    }
    tableState.page = 0;
    renderTable(_filtered);
  });
  document.getElementById("tbl-prev").onclick = () => { tableState.page--; renderTable(_filtered); };
  document.getElementById("tbl-next").onclick = () => { tableState.page++; renderTable(_filtered); };
  document.getElementById("table-size").onchange = (e) => {
    tableState.size = +e.target.value; tableState.page = 0; renderTable(_filtered);
  };

  // Language toggle
  document.querySelectorAll("#lang-toggle button").forEach((b) =>
    (b.onclick = () => setLang(b.dataset.lang)));

  // Mobile sidebar toggle + close affordances (button + tap-outside backdrop)
  const sidebar = document.getElementById("sidebar");
  const closeSidebar = () => sidebar.classList.remove("open");
  document.getElementById("filters-toggle").onclick = () => sidebar.classList.toggle("open");
  document.getElementById("sidebar-close").onclick = closeSidebar;
  document.getElementById("sidebar-backdrop").onclick = closeSidebar;

  // Desktop sidebar collapse — hand the width back to the content
  const layout = document.querySelector(".layout");
  const navCollapse = document.getElementById("nav-collapse");
  navCollapse.onclick = () => {
    const collapsed = layout.classList.toggle("nav-collapsed");
    navCollapse.setAttribute("aria-expanded", String(!collapsed));
    const label = document.getElementById("nav-collapse-label");
    label.setAttribute("data-i18n", collapsed ? "navExpand" : "navCollapse");
    label.textContent = t(collapsed ? "navExpand" : "navCollapse");
    // Nudge Chart.js / Leaflet to re-fit the new content width
    window.dispatchEvent(new Event("resize"));
  };

  // Nav: smooth scroll + active state
  const navLinks = [...document.querySelectorAll(".nav a")];
  navLinks.forEach((a) => a.addEventListener("click", () => {
    sidebar.classList.remove("open");
    setView("dashboard");   // section anchors only exist in the dashboard view
  }));
  const sections = navLinks.map((a) => document.querySelector(a.getAttribute("href")));
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        navLinks.forEach((l) => l.classList.toggle("active",
          l.getAttribute("href") === `#${en.target.id}`));
      }
    });
  }, { rootMargin: "-20% 0px -70% 0px" });
  sections.forEach((s) => s && obs.observe(s));
}

function resetFilters() {
  const years = ALL.map((r) => r.year).filter(Boolean);
  filters.yearMin = Math.min(...years); filters.yearMax = Math.max(...years);
  filters.oaStatus = new Set(OA_ORDER);
  MULTI.forEach((cfg) => { filters[cfg.key] = new Set(); });
  filters.mrTopics = new Set(ALL_MR_TOPICS);
  filters.oaOnly = false;
  document.getElementById("f-year-min").value = filters.yearMin;
  document.getElementById("f-year-max").value = filters.yearMax;
  MULTI.forEach((cfg) => { if (tomSelects[cfg.id]) tomSelects[cfg.id].clear(true); });  // silent
  document.getElementById("f-oa-only").checked = false;
  document.querySelectorAll("#f-oa input").forEach((c) => (c.checked = true));
  document.querySelectorAll("#f-concepts input").forEach((c) => (c.checked = true));
  apply();
}

// ----------------------------------------------------------------------------
// Apply filters -> re-render everything
// ----------------------------------------------------------------------------
function currentFiltered() {
  const lo = Math.min(filters.yearMin, filters.yearMax);
  const hi = Math.max(filters.yearMin, filters.yearMax);
  return ALL.filter((r) => {
    if (r.year < lo || r.year > hi) return false;
    if (!filters.oaStatus.has(r.oa_status)) return false;
    if (filters.oaOnly && !r.is_oa) return false;
    if (filters.language.size && !filters.language.has(r.language)) return false;
    if (filters.type.size && !filters.type.has(r.type)) return false;
    if (filters.field.size && !filters.field.has(r.field)) return false;
    if (filters.topic.size && !filters.topic.has(r.topic)) return false;
    if (filters.institution.size &&
        !r.institutions.some((i) => filters.institution.has(i.id))) return false;
    if (filters.mrTopics.size < ALL_MR_TOPICS.length &&
        !(r.topics || []).some((tp) => filters.mrTopics.has(tp))) return false;
    return true;
  });
}

let _filtered = [];
function apply() {
  _filtered = currentFiltered();
  const n = _filtered.length;
  document.getElementById("match-count").innerHTML =
    t("matchCount").replace("{n}", fmt(n)).replace("{m}", fmt(ALL.length));
  renderKpis(_filtered);
  renderInsights(_filtered);
  renderCharts(_filtered);
  // Only re-render the network + map when they're actually on screen; otherwise defer
  // (avoids re-running physics — "spinning" — while on the Records view).
  if (viewMode === "dashboard") { renderNetwork(_filtered); renderMap(_filtered); }
  else networkStale = true;
  tableState.page = 0;
  if (viewMode === "records") renderTable(_filtered);
}

// ----------------------------------------------------------------------------
// KPIs + charts
// ----------------------------------------------------------------------------
function renderKpis(recs) {
  const oa = recs.filter((r) => r.is_oa).length;
  const oaPct = recs.length ? Math.round((oa / recs.length) * 100) : 0;
  const cites = recs.reduce((s, r) => s + (r.cited_by_count || 0), 0);
  const years = recs.map((r) => r.year).filter(Boolean);
  const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "—";
  const kpis = [
    { value: fmt(recs.length), label: t("kpi.works") },
    { value: oaPct + "%", label: t("kpi.oa") },
    { value: fmt(cites), label: t("kpi.citations") },
    { value: span, label: t("kpi.years") },
  ];
  document.getElementById("kpis").innerHTML = kpis
    .map((k) => `<div class="kpi"><div class="value">${k.value}</div><div class="label">${k.label}</div></div>`)
    .join("");
}

// ----------------------------------------------------------------------------
// Metaresearch report — auto-generated findings for the filtered corpus
// ----------------------------------------------------------------------------
function renderInsights(recs) {
  const grid = document.getElementById("report-grid");
  const n = recs.length;
  if (!n) { grid.innerHTML = `<p class="muted">${t("insights.empty")}</p>`; return; }

  const pct = (x) => Math.round((x / n) * 100);
  const fill = (key, vals) => {
    let s = t(key);
    Object.entries(vals).forEach(([k, v]) => { s = s.replaceAll(`{${k}}`, v); });
    return s;
  };

  // --- Openness & transparency -----------------------------------------------
  const oa = recs.filter((r) => r.is_oa).length;
  const community = recs.filter((r) => r.oa_status === "diamond" || r.oa_status === "green").length;
  const preprints = recs.filter((r) => r.type === "preprint").length;

  // --- Citation impact (OA advantage) ----------------------------------------
  const mean = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0);
  const oaCites = mean(recs.filter((r) => r.is_oa).map((r) => r.cited_by_count || 0));
  const closedCites = mean(recs.filter((r) => !r.is_oa).map((r) => r.cited_by_count || 0));
  const advantage = closedCites > 0 ? (oaCites / closedCites) : 0;

  // --- Linguistic diversity --------------------------------------------------
  const fr = recs.filter((r) => r.language === "fr").length;

  // --- Collaboration ---------------------------------------------------------
  const intl = recs.filter((r) => r.institutions.some((i) => i.country && i.country !== "CA")).length;
  const caInst = new Set();
  recs.forEach((r) => r.institutions.forEach((i) => { if (i.country === "CA") caInst.add(i.id); }));

  // --- Thematic concentration ------------------------------------------------
  const topicCounts = [...countBy(recs, (r) => r.topic).entries()].sort((a, b) => b[1] - a[1]);
  const top5 = topicCounts.slice(0, 5).reduce((s, e) => s + e[1], 0);
  const topField = [...countBy(recs, (r) => r.field).entries()].sort((a, b) => b[1] - a[1])[0];

  // --- Growth (latest 5-year window vs. the preceding 5 years) ---------------
  // Trailing windows anchored on the most recent year — robust to old outliers.
  const maxY = Math.max(...recs.map((r) => r.year).filter(Boolean));
  const recWin = [maxY - 4, maxY];
  const prevWin = [maxY - 9, maxY - 5];
  const recent = recs.filter((r) => r.year >= recWin[0] && r.year <= recWin[1]).length;
  const early = recs.filter((r) => r.year >= prevWin[0] && r.year <= prevWin[1]).length;
  const growth = early > 0 ? Math.round(((recent - early) / early) * 100) : null;

  const findings = [
    {
      q: t("insights.q.open"),
      stat: pct(oa) + "%",
      text: fill("insights.t.open", { c: pct(community) }),
    },
    {
      q: t("insights.q.preprint"),
      stat: pct(preprints) + "%",
      text: t("insights.t.preprint"),
    },
    {
      q: t("insights.q.advantage"),
      stat: advantage ? advantage.toFixed(1) + "×" : "—",
      text: fill("insights.t.advantage", { oa: oaCites.toFixed(1), cl: closedCites.toFixed(1) }),
    },
    {
      q: t("insights.q.lang"),
      stat: pct(fr) + "%",
      text: t("insights.t.lang"),
    },
    {
      q: t("insights.q.intl"),
      stat: pct(intl) + "%",
      text: fill("insights.t.intl", { i: fmt(caInst.size) }),
    },
    {
      q: t("insights.q.concentration"),
      stat: pct(top5) + "%",
      text: fill("insights.t.concentration", { f: topField ? topField[0] : "—" }),
    },
    {
      q: t("insights.q.growth"),
      stat: growth === null ? "—" : (growth >= 0 ? "+" : "") + growth + "%",
      text: fill("insights.t.growth", { e: prevWin[0] + "–" + prevWin[1], r: recWin[0] + "–" + recWin[1] }),
    },
  ];

  grid.innerHTML = findings.map((f) => `
    <div class="finding">
      <p class="finding-q" title="${escapeHtml(f.q)}">${escapeHtml(f.q)}</p>
      <div class="finding-stat">${escapeHtml(f.stat)}</div>
      <p class="finding-text" title="${escapeHtml(f.text)}">${escapeHtml(f.text)}</p>
    </div>`).join("");
}

// ----------------------------------------------------------------------------
// Records table — paginated, sortable, reacts to the same filters
// ----------------------------------------------------------------------------
function setView(view) {
  viewMode = view;
  document.getElementById("dash").classList.toggle("view-records", view === "records");
  document.querySelectorAll("#view-tabs button").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === view));
  if (view === "records") renderTable(_filtered);
  else {
    if (networkStale) { renderNetwork(_filtered); renderMap(_filtered); networkStale = false; }
    // Leaflet mis-sizes if it was laid out while hidden; refresh on return to dashboard.
    if (lmap) setTimeout(() => lmap.invalidateSize(), 60);
  }
  window.scrollTo({ top: 0 });
}

function renderTable(recs) {
  const col = TABLE_COLS.find((c) => c.key === tableState.key) || TABLE_COLS[1];
  const dir = tableState.dir === "asc" ? 1 : -1;
  const sorted = [...recs].sort((a, b) => {
    const av = col.get(a), bv = col.get(b);
    return (col.num ? av - bv : String(av).localeCompare(String(bv), LANG === "fr" ? "fr" : "en")) * dir;
  });

  const size = tableState.size;
  const pages = Math.max(1, Math.ceil(sorted.length / size));
  tableState.page = Math.min(Math.max(tableState.page, 0), pages - 1);
  const start = tableState.page * size;
  const slice = sorted.slice(start, start + size);

  document.getElementById("rec-head").innerHTML = "<tr>" + TABLE_COLS.map((c) => {
    const active = c.key === tableState.key;
    const arrow = active ? (tableState.dir === "asc" ? " ▲" : " ▼") : "";
    return `<th data-key="${c.key}" class="${active ? "sorted" : ""}${c.num ? " num" : ""}">${escapeHtml(t(c.i18n))}${arrow}</th>`;
  }).join("") + "</tr>";

  document.getElementById("rec-body").innerHTML = slice.length
    ? slice.map((r) => "<tr>" + TABLE_COLS.map((c) => `<td class="${c.num ? "num" : ""}">${c.cell(r)}</td>`).join("") + "</tr>").join("")
    : `<tr><td colspan="${TABLE_COLS.length}" class="muted" style="text-align:center;padding:24px">${t("insights.empty")}</td></tr>`;

  document.getElementById("table-count").textContent = t("table.count").replace("{n}", fmt(sorted.length));
  document.getElementById("tbl-page").textContent = t("table.page").replace("{p}", tableState.page + 1).replace("{n}", pages);
  document.getElementById("tbl-prev").disabled = tableState.page === 0;
  document.getElementById("tbl-next").disabled = tableState.page >= pages - 1;
}

function renderCharts(recs) {
  // OA status
  const oaCounts = countBy(recs, (r) => r.oa_status);
  const oaKeys = OA_ORDER.filter((k) => oaCounts.has(k));
  const oaVals = oaKeys.map((k) => oaCounts.get(k));

  // Open vs closed
  const open = recs.filter((r) => r.is_oa).length;
  const closed = recs.length - open;

  // Shared y-axis ceiling + x-axis area so both overview bar charts are directly
  // comparable and line up at the y=0 baseline (the OA-status labels rotate).
  const yMax = niceMax(Math.max(0, ...oaVals, open, closed));
  const xAxisHeight = 58;
  vbar("isOaChart", [t("chart.open"), t("chart.closed")], [open, closed], ["#2e9e5b", "#8a9aa8"], { yMax, xAxisHeight });
  vbar("oaChart", oaKeys.map(oaLabel), oaVals, oaKeys.map((k) => OA_COLOR[k]), { yMax, xAxisHeight });

  // Year trends: outputs, open-access share, and citations per output
  const perYear = new Map();   // year -> { n, open, cites }
  recs.forEach((r) => {
    if (!r.year) return;
    const e = perYear.get(r.year) || { n: 0, open: 0, cites: 0 };
    e.n++; if (r.is_oa) e.open++; e.cites += r.cited_by_count || 0;
    perYear.set(r.year, e);
  });
  const years = [...perYear.keys()].filter((y) => y >= 1900).sort((a, b) => a - b);
  line("yearChart", years, years.map((y) => perYear.get(y).n));
  line("oaTrendChart", years, years.map((y) => {
    const e = perYear.get(y); return e.n ? Math.round((e.open / e.n) * 100) : 0;
  }), { color: "#2e9e5b", yMax: 100, yPct: true, suffix: "%" });
  line("citeTrendChart", years, years.map((y) => {
    const e = perYear.get(y); return e.n ? +(e.cites / e.n).toFixed(1) : 0;
  }), { color: "#7aa7c6" });

  // Top Canadian institutions
  const instCounts = new Map();
  recs.forEach((r) => r.institutions.forEach((i) => {
    if (i.country === "CA") instCounts.set(i.name, (instCounts.get(i.name) || 0) + 1);
  }));
  const topInst = [...instCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  hbar("instChart", topInst.map((e) => shortName(e[0])), topInst.map((e) => e[1]));

  // Topics
  const topicCounts = countBy(recs, (r) => r.topic);
  const topTopics = [...topicCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  hbar("topicChart", topTopics.map((e) => shortName(e[0])), topTopics.map((e) => e[1]));

  // Types
  const typeAgg = [...countBy(recs, (r) => r.type).entries()].sort((a, b) => b[1] - a[1]);
  doughnut("typeChart", typeAgg.map((e) => typeLabel(e[0])), typeAgg.map((e) => e[1]), SERIES);

  // Languages
  const langAgg = [...countBy(recs, (r) => r.language).entries()].sort((a, b) => b[1] - a[1]);
  doughnut("langChart", langAgg.map((e) => langLabel(e[0])), langAgg.map((e) => e[1]), SERIES);
}

// ----------------------------------------------------------------------------
// Collaboration network (built from the filtered records)
// ----------------------------------------------------------------------------
function renderNetwork(recs) {
  const works = new Map();   // inst id -> count
  const info = new Map();    // inst id -> {name, country}
  const edge = new Map();    // "a|b" -> weight
  recs.forEach((r) => {
    const ids = r.institutions.map((i) => { info.set(i.id, i); return i.id; });
    const uniq = [...new Set(ids)].sort();
    uniq.forEach((id) => works.set(id, (works.get(id) || 0) + 1));
    for (let i = 0; i < uniq.length; i++)
      for (let j = i + 1; j < uniq.length; j++) {
        const k = `${uniq[i]}|${uniq[j]}`;
        edge.set(k, (edge.get(k) || 0) + 1);
      }
  });

  const topIds = new Set([...works.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_N_NODES).map((e) => e[0]));
  const maxW = Math.max(1, ...[...topIds].map((id) => works.get(id)));

  const nodes = [...topIds].map((id) => {
    const it = info.get(id), isCA = it.country === "CA", w = works.get(id);
    return {
      id, label: it.name, title: `${it.name}\n${w} works`, value: w,
      // Shape doubles the encoding (not colour alone) for colour-blind readers:
      // Canadian institutions are dots, international ones triangles.
      shape: isCA ? "dot" : "triangle",
      color: { background: isCA ? "#1f7a63" : "#7aa7c6", border: isCA ? "#155c4a" : "#3f6b86" },
      font: { size: 12 + 14 * (w / maxW), color: "#1b2733" },
    };
  });
  const edges = [];
  edge.forEach((w, key) => {
    const [a, b] = key.split("|");
    if (w >= MIN_EDGE_WEIGHT && topIds.has(a) && topIds.has(b))
      edges.push({ from: a, to: b, value: w, title: `${w} shared works`,
        color: { color: "rgba(120,135,150,0.35)", highlight: "#1f7a63" } });
  });

  const container = document.getElementById("networkChart");
  // Edge widths: sqrt scaling spreads out the many low-weight ties so they're
  // distinguishable, instead of a linear scale that crushes them together.
  const edgeScaling = {
    min: 1, max: 16,
    customScalingFunction: (min, max, total, value) =>
      max === min ? 0.5 : Math.sqrt((value - min) / (max - min)),
  };
  const stabilization = { enabled: true, iterations: 120, fit: true };
  if (!network) {
    netData = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
    network = new vis.Network(container, netData, {
      nodes: { shape: "dot", scaling: { min: 8, max: 42, label: { enabled: true, min: 11, max: 26 } } },
      edges: { scaling: edgeScaling, smooth: { type: "continuous" } },
      physics: {
        // Higher damping + central gravity settle the layout quickly and stop
        // forceAtlas2 from drifting/rotating ("spinning") before it freezes.
        solver: "forceAtlas2Based",
        forceAtlas2Based: { gravitationalConstant: -32, centralGravity: 0.015,
          springLength: 110, springConstant: 0.08, avoidOverlap: 0.6, damping: 0.7 },
        maxVelocity: 28, minVelocity: 1.2, timestep: 0.4,
        stabilization,
      },
      interaction: { hover: true, tooltipDelay: 120 },
    });
    network.on("stabilizationIterationsDone", () => {
      network.setOptions({ physics: false });   // freeze once settled — no perpetual motion
      network.fit({ animation: { duration: 300 } });
    });
  } else {
    netData.nodes.clear(); netData.edges.clear();
    netData.nodes.add(nodes); netData.edges.add(edges);
    network.setOptions({ physics: { enabled: true, stabilization } });
  }

  document.getElementById("network-note").textContent = t("networkNote")
    .replace("{n}", nodes.length).replace("{N}", TOP_N_NODES)
    .replace("{e}", edges.length).replace("{w}", MIN_EDGE_WEIGHT);
}

// ----------------------------------------------------------------------------
// Geographic collaboration map (Leaflet) — top institutions placed by coordinates,
// co-authorship ties drawn as lines between them.
// ----------------------------------------------------------------------------
function renderMap(recs) {
  const note = document.getElementById("map-note");
  if (typeof L === "undefined" || !GEO) { note.textContent = t("map.unavailable"); return; }

  // Aggregate institutions (output) and ties (shared works) — same as the network.
  const works = new Map(), info = new Map(), edge = new Map();
  recs.forEach((r) => {
    const uniq = [...new Set(r.institutions.map((i) => { info.set(i.id, i); return i.id; }))].sort();
    uniq.forEach((id) => works.set(id, (works.get(id) || 0) + 1));
    for (let i = 0; i < uniq.length; i++)
      for (let j = i + 1; j < uniq.length; j++)
        edge.set(`${uniq[i]}|${uniq[j]}`, (edge.get(`${uniq[i]}|${uniq[j]}`) || 0) + 1);
  });
  const topIds = new Set([...works.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_N_NODES).map((e) => e[0]));
  const located = [...topIds].filter((id) => GEO[id]);
  const maxW = Math.max(1, ...located.map((id) => works.get(id)));

  if (!lmap) {
    lmap = L.map("mapChart", { worldCopyJump: true, minZoom: 1, scrollWheelZoom: true })
      .setView([35, -30], 2);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd", maxZoom: 19,
    }).addTo(lmap);
    lmapLayer = L.layerGroup().addTo(lmap);
  }
  lmapLayer.clearLayers();

  // Ties first, so markers sit on top.
  let drawn = 0;
  edge.forEach((w, key) => {
    const [a, b] = key.split("|");
    if (w >= MIN_EDGE_WEIGHT && topIds.has(a) && topIds.has(b) && GEO[a] && GEO[b]) {
      L.polyline([GEO[a], GEO[b]], { color: "#1f7a63", weight: Math.max(0.5, Math.sqrt(w)), opacity: 0.16 })
        .addTo(lmapLayer);
      drawn++;
    }
  });

  // Institution markers, sized by output, coloured CA vs international.
  const pts = [];
  located.forEach((id) => {
    const it = info.get(id), isCA = it.country === "CA", w = works.get(id);
    pts.push(GEO[id]);
    L.circleMarker(GEO[id], {
      radius: 5 + 14 * Math.sqrt(w / maxW),
      color: isCA ? "#155c4a" : "#3f6b86", weight: 1,
      fillColor: isCA ? "#1f7a63" : "#7aa7c6", fillOpacity: 0.8,
    }).bindTooltip(`${escapeHtml(it.name)} · ${fmt(w)}`, { direction: "top" }).addTo(lmapLayer);
  });
  if (pts.length) lmap.fitBounds(pts, { padding: [30, 30], maxZoom: 5 });

  note.textContent = t("mapNote")
    .replace("{n}", located.length).replace("{N}", TOP_N_NODES).replace("{e}", drawn);
}

// ----------------------------------------------------------------------------
// CSV export of the filtered subset
// ----------------------------------------------------------------------------
function downloadCSV() {
  const rows = [t("csv.cols")];
  _filtered.forEach((r) => {
    const insts = r.institutions.map((i) => i.name).join("; ");
    const countries = [...new Set(r.institutions.map((i) => i.country).filter(Boolean))].join("; ");
    const vals = [r.id, r.title, r.year, r.type, r.language, r.cited_by_count,
      r.is_oa, r.oa_status, r.topic, r.field, insts, countries];
    rows.push(vals.map(csvCell).join(","));
  });
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `canadian-metaresearch_filtered_${_filtered.length}-works.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ----------------------------------------------------------------------------
// Search-string validation tool
// ----------------------------------------------------------------------------
function initValidation() {
  const filter = META.base_filter || "";
  const enc = encodeURIComponent(filter);
  document.getElementById("val-filter").textContent = filter;
  document.getElementById("val-api").href = `${OPENALEX}?filter=${enc}${MAILTO}`;
  document.getElementById("val-web").href = `https://openalex.org/works?filter=${enc}`;
  document.getElementById("btn-copy").onclick = copyFilter;
  document.getElementById("btn-verify").onclick = verifyLive;
  document.getElementById("btn-sample").onclick = fetchSample;
}

// Rebuild language-dependent bits and clear any prior live results.
function refreshValidation() {
  renderConcepts();
  renderSensitivity();
  document.getElementById("verify-result").innerHTML = "";
  document.getElementById("sample-result").innerHTML = "";
  document.getElementById("btn-sample").textContent = t("val.sampleBtn");
}

// Sensitivity of corpus size to the definition of "Canadian" (precomputed at build time).
function renderSensitivity() {
  const s = META.sensitivity;
  if (!s || !s.definitions) return;
  const defs = s.definitions;
  const primary = (defs.find((d) => d.primary) || defs[0]).count || 1;
  upsert("sensChart", {
    type: "bar",
    data: {
      labels: defs.map((d) => t("sens." + d.key)),
      datasets: [{ data: defs.map((d) => d.count), backgroundColor: defs.map((d) => (d.primary ? "#1f7a63" : "#7aa7c6")) }],
    },
    options: { indexAxis: "y", plugins: { legend: { display: false } } },
  });
  const rows = defs.map((d) =>
    `<tr><td>${t("sens." + d.key)}</td><td>${fmt(d.count)}</td><td>${Math.round((100 * d.count) / primary)}%</td></tr>`).join("");
  document.getElementById("sens-table").innerHTML =
    `<thead><tr><th>${t("val.sensColDef")}</th><th>${t("val.sensColN")}</th><th>${t("val.sensColPct")}</th></tr></thead><tbody>${rows}</tbody>`;
  document.getElementById("sens-corr-note").textContent =
    t("val.sensCorrNote").replace("{c}", fmt(s.corresponding_coverage)).replace("{n}", fmt(primary));
}

function renderConcepts() {
  const ul = document.getElementById("val-concepts");
  const topics = META.topics || {};
  let html = `<li class="concept-line"><code>institutions.country_code:ca</code> — ${t("val.country")}</li>`;
  html += `<li class="concept-head">${t("val.concepts")}:</li>`;
  Object.entries(topics).forEach(([id, name]) => {
    html += `<li><code>${id}</code> <a href="https://openalex.org/${id}" target="_blank" rel="noopener">${escapeHtml(name)}</a></li>`;
  });
  ul.innerHTML = html;
}

function copyFilter() {
  navigator.clipboard.writeText(META.base_filter || "").then(() => {
    const b = document.getElementById("btn-copy");
    b.textContent = t("val.copied");
    setTimeout(() => (b.textContent = t("val.copy")), 1500);
  });
}

async function verifyLive() {
  const box = document.getElementById("verify-result");
  box.innerHTML = `<span class="muted">${t("val.checking")}</span>`;
  try {
    const enc = encodeURIComponent(META.base_filter);
    const res = await fetch(`${OPENALEX}?filter=${enc}&per-page=1${MAILTO}`);
    if (!res.ok) throw new Error(res.status);
    const live = (await res.json()).meta.count;
    const snap = META.total_works;
    const d = Math.abs(live - snap);
    const pct = snap ? (d / snap) * 100 : 0;
    const verdict = d === 0
      ? `<p class="ok">✓ ${t("val.match")}</p>`
      : `<p class="warn">${t("val.close").replace("{d}", fmt(d)).replace("{p}", pct.toFixed(1))}</p>`;
    box.innerHTML = `<div class="verify-grid">
        <div><span class="vlabel">${t("val.snapshot")}</span><b>${fmt(snap)}</b></div>
        <div><span class="vlabel">${t("val.live")}</span><b>${fmt(live)}</b></div>
      </div>${verdict}`;
  } catch (e) {
    box.innerHTML = `<p class="warn">${t("val.error")}</p>`;
  }
}

async function fetchSample() {
  const box = document.getElementById("sample-result");
  box.innerHTML = `<span class="muted">${t("val.checking")}</span>`;
  try {
    const enc = encodeURIComponent(META.base_filter);
    const seed = Math.floor(Math.random() * 100000);
    const url = `${OPENALEX}?filter=${enc}&sample=8&seed=${seed}&per-page=8` +
      `&select=id,display_name,publication_year,type${MAILTO}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    const rows = (await res.json()).results || [];
    let html = `<p class="muted">${t("val.sampleNote").replace("{n}", rows.length)}</p><ol class="sample-list">`;
    rows.forEach((w) => {
      html += `<li><a href="${w.id}" target="_blank" rel="noopener">${escapeHtml(w.display_name || "—")}</a>` +
        ` <span class="muted">· ${w.publication_year || "?"} · ${escapeHtml(typeLabel(w.type || "unknown"))}</span></li>`;
    });
    html += `</ol>`;
    box.innerHTML = html;
    document.getElementById("btn-sample").textContent = t("val.sampleAgain");
  } catch (e) {
    box.innerHTML = `<p class="warn">${t("val.error")}</p>`;
  }
}

// ----------------------------------------------------------------------------
// Chart helpers
// ----------------------------------------------------------------------------
function doughnut(id, labels, values, colors) {
  upsert(id, {
    type: "doughnut",
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 1, borderColor: "#fff" }] },
    options: { plugins: { legend: { position: "right", labels: { boxWidth: 12 } } }, cutout: "55%" },
  });
}
function line(id, labels, values, opts = {}) {
  const color = opts.color || "#1f7a63";
  const y = { beginAtZero: true };
  if (opts.yMax) y.max = opts.yMax;
  if (opts.yPct) y.ticks = { callback: (v) => v + "%" };
  const tooltip = opts.suffix
    ? { callbacks: { label: (c) => `${c.parsed.y}${opts.suffix}` } }
    : {};
  upsert(id, {
    type: "line",
    data: { labels, datasets: [{ data: values, borderColor: color, backgroundColor: color + "22",
      fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2 }] },
    options: { plugins: { legend: { display: false }, tooltip }, scales: { x: { ticks: { maxTicksLimit: 12 } }, y } },
  });
}
function vbar(id, labels, values, colors, opts = {}) {
  const total = values.reduce((s, v) => s + v, 0);
  const y = { beginAtZero: true };
  if (opts.yMax) y.max = opts.yMax;
  // Reserve a fixed x-axis area so charts sharing a row line up at the y=0
  // baseline regardless of whether their category labels rotate.
  const x = {};
  if (opts.xAxisHeight) x.afterFit = (scale) => { scale.height = opts.xAxisHeight; };
  upsert(id, {
    type: "bar",
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }] },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => {
              const v = c.parsed.y;
              const pct = total ? Math.round((v / total) * 100) : 0;
              return `${fmt(v)} (${pct}%)`;
            },
          },
        },
      },
      scales: { y, x },
    },
  });
}
// Round a value up to a clean axis ceiling for shared, tidy y-axes — fine enough
// steps that a small filtered corpus doesn't leave the chart mostly empty.
function niceMax(v) {
  if (!(v > 0)) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;   // 1 ≤ n < 10
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => n <= s);
  return step * pow;
}
function hbar(id, labels, values) {
  upsert(id, {
    type: "bar",
    data: { labels, datasets: [{ data: values, backgroundColor: "#7aa7c6" }] },
    options: { indexAxis: "y", plugins: { legend: { display: false } } },
  });
}
function upsert(id, config) {
  if (charts[id]) { charts[id].destroy(); }
  charts[id] = new Chart(document.getElementById(id), config);
}

// ----------------------------------------------------------------------------
// Utils
// ----------------------------------------------------------------------------
function countBy(arr, keyFn) {
  const m = new Map();
  arr.forEach((x) => { const k = keyFn(x); m.set(k, (m.get(k) || 0) + 1); });
  return m;
}
const fmt = (n) => Number(n).toLocaleString(LANG === "fr" ? "fr-CA" : "en-CA");
const shortName = (s) => (s && s.length > 40 ? s.slice(0, 38) + "…" : s);
function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
