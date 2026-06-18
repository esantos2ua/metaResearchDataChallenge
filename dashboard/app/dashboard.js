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

Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
Chart.defaults.color = "#5c6b7a";

// ----------------------------------------------------------------------------
// State
// ----------------------------------------------------------------------------
let ALL = [];          // all records
let META = {};
const charts = {};     // id -> Chart instance
let network = null;    // vis.Network instance
let netData = null;    // {nodes, edges} DataSets

const filters = {
  yearMin: null, yearMax: null,
  oaStatus: new Set(OA_ORDER),
  language: "all",
  type: "all",
  oaOnly: false,
};

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
  apply();
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

  // OA status checkboxes
  const oaBox = document.getElementById("f-oa");
  const present = new Set(ALL.map((r) => r.oa_status));
  OA_ORDER.filter((s) => present.has(s)).forEach((s) => {
    const id = `oa-${s}`;
    const wrap = document.createElement("label");
    wrap.innerHTML = `<input type="checkbox" id="${id}" value="${s}" checked> ${s}`;
    oaBox.appendChild(wrap);
  });

  // Language
  const langSel = document.getElementById("f-language");
  langSel.appendChild(new Option("All languages", "all"));
  const langCounts = countBy(ALL, (r) => r.language);
  [...langCounts.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) =>
    langSel.appendChild(new Option(`${langLabel(k)} (${n})`, k)));

  // Type
  const typeSel = document.getElementById("f-type");
  typeSel.appendChild(new Option("All types", "all"));
  const typeCounts = countBy(ALL, (r) => r.type);
  [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) =>
    typeSel.appendChild(new Option(`${k} (${n})`, k)));
}

function wireUI() {
  document.getElementById("f-year-min").onchange = (e) => { filters.yearMin = +e.target.value; apply(); };
  document.getElementById("f-year-max").onchange = (e) => { filters.yearMax = +e.target.value; apply(); };
  document.getElementById("f-language").onchange = (e) => { filters.language = e.target.value; apply(); };
  document.getElementById("f-type").onchange = (e) => { filters.type = e.target.value; apply(); };
  document.getElementById("f-oa-only").onchange = (e) => { filters.oaOnly = e.target.checked; apply(); };
  document.getElementById("f-oa").addEventListener("change", (e) => {
    if (e.target.matches("input[type=checkbox]")) {
      e.target.checked ? filters.oaStatus.add(e.target.value) : filters.oaStatus.delete(e.target.value);
      apply();
    }
  });
  document.getElementById("btn-reset").onclick = resetFilters;
  document.getElementById("btn-download").onclick = downloadCSV;

  // Mobile sidebar toggle
  const sidebar = document.getElementById("sidebar");
  document.getElementById("filters-toggle").onclick = () => sidebar.classList.toggle("open");

  // Nav: smooth scroll + active state
  const navLinks = [...document.querySelectorAll(".nav a")];
  navLinks.forEach((a) => a.addEventListener("click", () => sidebar.classList.remove("open")));
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
  filters.language = "all"; filters.type = "all"; filters.oaOnly = false;
  document.getElementById("f-year-min").value = filters.yearMin;
  document.getElementById("f-year-max").value = filters.yearMax;
  document.getElementById("f-language").value = "all";
  document.getElementById("f-type").value = "all";
  document.getElementById("f-oa-only").checked = false;
  document.querySelectorAll("#f-oa input").forEach((c) => (c.checked = true));
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
    return true;
  });
}

let _filtered = [];
function apply() {
  _filtered = currentFiltered();
  const n = _filtered.length;
  document.getElementById("match-count").innerHTML = `<b>${fmt(n)}</b> of ${fmt(ALL.length)} works`;
  renderKpis(_filtered);
  renderCharts(_filtered);
  renderNetwork(_filtered);
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
    { value: fmt(recs.length), label: "Works (filtered)" },
    { value: oaPct + "%", label: "Open access" },
    { value: fmt(cites), label: "Total citations" },
    { value: span, label: "Years" },
  ];
  document.getElementById("kpis").innerHTML = kpis
    .map((k) => `<div class="kpi"><div class="value">${k.value}</div><div class="label">${k.label}</div></div>`)
    .join("");
}

function renderCharts(recs) {
  // OA status
  const oaCounts = countBy(recs, (r) => r.oa_status);
  const oaKeys = OA_ORDER.filter((k) => oaCounts.has(k));
  doughnut("oaChart", oaKeys, oaKeys.map((k) => oaCounts.get(k)), oaKeys.map((k) => OA_COLOR[k]));

  // Open vs closed
  const open = recs.filter((r) => r.is_oa).length;
  doughnut("isOaChart", ["Open", "Closed"], [open, recs.length - open], ["#2e9e5b", "#8a9aa8"]);

  // Year trend
  const byYear = countBy(recs, (r) => r.year);
  const years = [...byYear.keys()].filter((y) => y >= 1900).sort((a, b) => a - b);
  line("yearChart", years, years.map((y) => byYear.get(y)));

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
  const typeCounts = [...countBy(recs, (r) => r.type).entries()].sort((a, b) => b[1] - a[1]);
  doughnut("typeChart", typeCounts.map((e) => e[0]), typeCounts.map((e) => e[1]), SERIES);

  // Languages
  const langCounts = [...countBy(recs, (r) => r.language).entries()].sort((a, b) => b[1] - a[1]);
  doughnut("langChart", langCounts.map((e) => langLabel(e[0])), langCounts.map((e) => e[1]), SERIES);
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
  if (!network) {
    netData = { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) };
    network = new vis.Network(container, netData, {
      nodes: { shape: "dot", scaling: { min: 8, max: 42, label: { enabled: true, min: 11, max: 26 } } },
      edges: { scaling: { min: 0.5, max: 8 }, smooth: { type: "continuous" } },
      physics: {
        solver: "forceAtlas2Based",
        forceAtlas2Based: { gravitationalConstant: -45, springLength: 110, avoidOverlap: 0.6 },
        stabilization: { iterations: 200 },
      },
      interaction: { hover: true, tooltipDelay: 120 },
    });
    network.on("stabilizationIterationsDone", () => {
      network.setOptions({ physics: false });
      network.fit({ animation: { duration: 300 } });   // zoom to fit — fixes the "too narrow" view
    });
  } else {
    netData.nodes.clear(); netData.edges.clear();
    netData.nodes.add(nodes); netData.edges.add(edges);
    network.setOptions({ physics: { enabled: true, stabilization: { iterations: 200 } } });
  }

  document.getElementById("network-note").textContent =
    `${nodes.length} institutions shown (top ${TOP_N_NODES} by output), ${edges.length} ties ` +
    `with ≥ ${MIN_EDGE_WEIGHT} shared works. Drag nodes to explore; scroll to zoom.`;
}

// ----------------------------------------------------------------------------
// CSV export of the filtered subset
// ----------------------------------------------------------------------------
function downloadCSV() {
  const cols = ["id", "title", "year", "type", "language", "cited_by_count",
    "is_oa", "oa_status", "topic", "field", "institutions", "countries"];
  const rows = [cols.join(",")];
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
// Chart helpers
// ----------------------------------------------------------------------------
function doughnut(id, labels, values, colors) {
  upsert(id, {
    type: "doughnut",
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 1, borderColor: "#fff" }] },
    options: { plugins: { legend: { position: "right", labels: { boxWidth: 12 } } }, cutout: "55%" },
  });
}
function line(id, labels, values) {
  upsert(id, {
    type: "line",
    data: { labels, datasets: [{ data: values, borderColor: "#c8102e", backgroundColor: "rgba(200,16,46,.12)",
      fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2 }] },
    options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 12 } } } },
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
const fmt = (n) => Number(n).toLocaleString("en-CA");
const shortName = (s) => (s && s.length > 40 ? s.slice(0, 38) + "…" : s);
const LANGS = { en: "English", fr: "French", es: "Spanish", de: "German", pt: "Portuguese",
  ru: "Russian", it: "Italian", nl: "Dutch", unknown: "Unknown" };
const langLabel = (k) => LANGS[k] || (k || "Unknown");
function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
