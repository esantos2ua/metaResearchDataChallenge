// Canadian Metaresearch Dashboard — interactive pilot.
// Loads a record-level dataset, filters client-side, re-aggregates every view
// (charts + collaboration network), and exports the filtered subset as CSV.

// ----------------------------------------------------------------------------
// Config
// ----------------------------------------------------------------------------
const OA_ORDER = ["gold", "green", "diamond", "hybrid", "bronze", "closed", "unknown"];
const OA_COLOR = {
  gold: "#f5b301", green: "#2e9e5b", diamond: "#4aa3df", hybrid: "#9b59b6",
  bronze: "#cd7f32", closed: "#8a9aa8", unknown: "#c4ccd4",
};
const SERIES = ["#c8102e", "#4aa3df", "#2e9e5b", "#f5b301", "#9b59b6", "#cd7f32",
  "#e67e22", "#1abc9c", "#34495e", "#e84393", "#00897b", "#7e57c2", "#d4a017",
  "#5d6d7e", "#16a085"];
const TOP_N_NODES = 60;
const MIN_EDGE_WEIGHT = 2;
const OPENALEX = "https://api.openalex.org/works";
const POLITE = "esantos2@ualberta.ca";   // OpenAlex polite-pool contact (already public in repo)

Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
Chart.defaults.color = "#5c6b7a";

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
  const langSel = document.getElementById("f-language");
  if (langSel && langSel.options.length) {
    langSel.options[0].text = t("filters.allLanguages");
    [...langSel.options].slice(1).forEach((o) => { o.text = `${langLabel(o.value)} (${langCounts.get(o.value)})`; });
  }
  const typeSel = document.getElementById("f-type");
  if (typeSel && typeSel.options.length) {
    typeSel.options[0].text = t("filters.allTypes");
    [...typeSel.options].slice(1).forEach((o) => { o.text = `${typeLabel(o.value)} (${typeCounts.get(o.value)})`; });
  }
  document.querySelectorAll("#f-oa .oa-name").forEach((s) => { s.textContent = oaLabel(s.dataset.k); });
  // Field/topic/institution values are not translated; only their "all" option is.
  const setAll = (id, key) => {
    const sel = document.getElementById(id);
    if (sel && sel.options.length) sel.options[0].text = t(key);
  };
  setAll("f-field", "filters.allFields");
  setAll("f-topic", "filters.allTopics");
  setAll("f-institution", "filters.allInstitutions");
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
  language: "all",
  type: "all",
  field: "all",
  topic: "all",
  institution: "all",   // OpenAlex institution id of a Canadian institution, or "all"
  concepts: new Set(),  // selected metaresearch concept ids (filled once data loads)
  oaOnly: false,
};
let ALL_CONCEPTS = [];   // all corpus-defining concept ids (for reset)

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

  // Language (counts cached for re-labelling on language switch)
  const langSel = document.getElementById("f-language");
  langSel.appendChild(new Option(t("filters.allLanguages"), "all"));
  langCounts = countBy(ALL, (r) => r.language);
  [...langCounts.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) =>
    langSel.appendChild(new Option(`${langLabel(k)} (${n})`, k)));

  // Type
  const typeSel = document.getElementById("f-type");
  typeSel.appendChild(new Option(t("filters.allTypes"), "all"));
  typeCounts = countBy(ALL, (r) => r.type);
  [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) =>
    typeSel.appendChild(new Option(`${typeLabel(k)} (${n})`, k)));

  // Field (broad OpenAlex field of study) — values are not translated, only the "all" option.
  const fieldSel = document.getElementById("f-field");
  fieldSel.appendChild(new Option(t("filters.allFields"), "all"));
  [...countBy(ALL, (r) => r.field).entries()]
    .filter(([k]) => k)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, n]) => fieldSel.appendChild(new Option(`${k} (${n})`, k)));

  // Topic (primary OpenAlex topic)
  const topicSel = document.getElementById("f-topic");
  topicSel.appendChild(new Option(t("filters.allTopics"), "all"));
  [...countBy(ALL, (r) => r.topic).entries()]
    .filter(([k]) => k)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, n]) => topicSel.appendChild(new Option(`${shortName(k)} (${n})`, k)));

  // Canadian institution — drill into one institution's KPIs and network.
  const instSel = document.getElementById("f-institution");
  instSel.appendChild(new Option(t("filters.allInstitutions"), "all"));
  const instWorks = new Map(), instName = new Map();
  ALL.forEach((r) => {
    const seen = new Set();
    r.institutions.forEach((i) => {
      if (i.country !== "CA" || seen.has(i.id)) return;
      seen.add(i.id);
      instName.set(i.id, i.name);
      instWorks.set(i.id, (instWorks.get(i.id) || 0) + 1);
    });
  });
  [...instWorks.entries()].sort((a, b) => b[1] - a[1]).forEach(([id, n]) =>
    instSel.appendChild(new Option(`${shortName(instName.get(id))} (${n})`, id)));

  // Metaresearch concepts (checkbox group) — a work may carry several.
  const conceptBox = document.getElementById("f-concepts");
  const conceptNames = META.concepts || {};
  const conceptCounts = new Map();
  ALL.forEach((r) => (r.concepts || []).forEach((c) => conceptCounts.set(c, (conceptCounts.get(c) || 0) + 1)));
  ALL_CONCEPTS = Object.keys(conceptNames);
  filters.concepts = new Set(ALL_CONCEPTS);
  ALL_CONCEPTS
    .sort((a, b) => (conceptCounts.get(b) || 0) - (conceptCounts.get(a) || 0))
    .forEach((id) => {
      const wrap = document.createElement("label");
      wrap.innerHTML = `<input type="checkbox" value="${id}" checked> ` +
        `<span>${escapeHtml(conceptNames[id])} (${conceptCounts.get(id) || 0})</span>`;
      conceptBox.appendChild(wrap);
    });
}

function wireUI() {
  document.getElementById("f-year-min").onchange = (e) => { filters.yearMin = +e.target.value; apply(); };
  document.getElementById("f-year-max").onchange = (e) => { filters.yearMax = +e.target.value; apply(); };
  document.getElementById("f-language").onchange = (e) => { filters.language = e.target.value; apply(); };
  document.getElementById("f-type").onchange = (e) => { filters.type = e.target.value; apply(); };
  document.getElementById("f-field").onchange = (e) => { filters.field = e.target.value; apply(); };
  document.getElementById("f-topic").onchange = (e) => { filters.topic = e.target.value; apply(); };
  document.getElementById("f-institution").onchange = (e) => { filters.institution = e.target.value; apply(); };
  document.getElementById("f-concepts").addEventListener("change", (e) => {
    if (e.target.matches("input[type=checkbox]")) {
      e.target.checked ? filters.concepts.add(e.target.value) : filters.concepts.delete(e.target.value);
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

  // Mobile sidebar toggle
  const sidebar = document.getElementById("sidebar");
  document.getElementById("filters-toggle").onclick = () => sidebar.classList.toggle("open");

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
  filters.language = "all"; filters.type = "all";
  filters.field = "all"; filters.topic = "all"; filters.institution = "all";
  filters.concepts = new Set(ALL_CONCEPTS);
  filters.oaOnly = false;
  document.getElementById("f-year-min").value = filters.yearMin;
  document.getElementById("f-year-max").value = filters.yearMax;
  document.getElementById("f-language").value = "all";
  document.getElementById("f-type").value = "all";
  document.getElementById("f-field").value = "all";
  document.getElementById("f-topic").value = "all";
  document.getElementById("f-institution").value = "all";
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
    if (filters.language !== "all" && r.language !== filters.language) return false;
    if (filters.type !== "all" && r.type !== filters.type) return false;
    if (filters.field !== "all" && r.field !== filters.field) return false;
    if (filters.topic !== "all" && r.topic !== filters.topic) return false;
    if (filters.institution !== "all" &&
        !r.institutions.some((i) => i.id === filters.institution)) return false;
    if (filters.concepts.size < ALL_CONCEPTS.length &&
        !(r.concepts || []).some((c) => filters.concepts.has(c))) return false;
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
  // Only re-layout the network when it's actually on screen; otherwise defer
  // (avoids re-running physics — "spinning" — while on the Records view).
  if (viewMode === "dashboard") renderNetwork(_filtered);
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
      <p class="finding-q">${escapeHtml(f.q)}</p>
      <div class="finding-stat">${escapeHtml(f.stat)}</div>
      <p class="finding-text">${escapeHtml(f.text)}</p>
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
  else if (networkStale) { renderNetwork(_filtered); networkStale = false; }
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
  doughnut("oaChart", oaKeys.map(oaLabel), oaKeys.map((k) => oaCounts.get(k)), oaKeys.map((k) => OA_COLOR[k]));

  // Open vs closed
  const open = recs.filter((r) => r.is_oa).length;
  doughnut("isOaChart", [t("chart.open"), t("chart.closed")], [open, recs.length - open], ["#2e9e5b", "#8a9aa8"]);

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
  }), { color: "#4aa3df" });

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
      color: { background: isCA ? "#c8102e" : "#4aa3df", border: isCA ? "#8c0a20" : "#2c7bb6" },
      font: { size: 12 + 14 * (w / maxW), color: "#1b2733" },
    };
  });
  const edges = [];
  edge.forEach((w, key) => {
    const [a, b] = key.split("|");
    if (w >= MIN_EDGE_WEIGHT && topIds.has(a) && topIds.has(b))
      edges.push({ from: a, to: b, value: w, title: `${w} shared works`,
        color: { color: "rgba(120,135,150,0.35)", highlight: "#c8102e" } });
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
  document.getElementById("val-api").href = `${OPENALEX}?filter=${enc}&mailto=${POLITE}`;
  document.getElementById("val-web").href = `https://openalex.org/works?filter=${enc}`;
  document.getElementById("btn-copy").onclick = copyFilter;
  document.getElementById("btn-verify").onclick = verifyLive;
  document.getElementById("btn-sample").onclick = fetchSample;
}

// Rebuild language-dependent bits and clear any prior live results.
function refreshValidation() {
  renderConcepts();
  document.getElementById("verify-result").innerHTML = "";
  document.getElementById("sample-result").innerHTML = "";
  document.getElementById("btn-sample").textContent = t("val.sampleBtn");
}

function renderConcepts() {
  const ul = document.getElementById("val-concepts");
  const concepts = META.concepts || {};
  let html = `<li class="concept-line"><code>institutions.country_code:ca</code> — ${t("val.country")}</li>`;
  html += `<li class="concept-head">${t("val.concepts")}:</li>`;
  Object.entries(concepts).forEach(([id, name]) => {
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
    const res = await fetch(`${OPENALEX}?filter=${enc}&per-page=1&mailto=${POLITE}`);
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
      `&select=id,display_name,publication_year,type&mailto=${POLITE}`;
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
  const color = opts.color || "#c8102e";
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
function hbar(id, labels, values) {
  upsert(id, {
    type: "bar",
    data: { labels, datasets: [{ data: values, backgroundColor: "#4aa3df" }] },
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
