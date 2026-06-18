// Canadian Metaresearch Dashboard — pilot.
// Reads pre-computed aggregates (built by scripts/extraction/build_dashboard_data.py)
// and renders charts. No author-level data ships to the client.

const PALETTE = {
  gold: "#f5b301", green: "#2e9e5b", diamond: "#4aa3df", hybrid: "#9b59b6",
  bronze: "#cd7f32", closed: "#8a9aa8",
};
const SERIES = ["#c8102e", "#4aa3df", "#2e9e5b", "#f5b301", "#9b59b6", "#cd7f32",
  "#e67e22", "#1abc9c", "#34495e", "#e84393", "#00897b", "#7e57c2", "#d4a017",
  "#5d6d7e", "#16a085"];

Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
Chart.defaults.color = "#5c6b7a";

async function load() {
  let data;
  try {
    const res = await fetch("data/dashboard_data.json", { cache: "no-store" });
    if (!res.ok) throw new Error(res.statusText);
    data = await res.json();
  } catch (err) {
    document.getElementById("loading").innerHTML =
      `⚠️ Could not load <code>data/dashboard_data.json</code>.<br>` +
      `Serve this folder over HTTP (e.g. <code>python3 -m http.server</code>) ` +
      `and run the extraction script first. (${err.message})`;
    return;
  }
  render(data);
}

function render(d) {
  document.getElementById("loading").hidden = true;
  document.getElementById("content").hidden = false;

  // KPIs
  const totalOA = sumWhere(d.is_oa, (g) => g.key === "1" || g.name === "true");
  const oaPct = Math.round((totalOA / d.meta.total_works) * 100);
  const years = d.year.filter((y) => +y.key >= 1900);
  const kpis = [
    { value: fmt(d.meta.total_works), label: "Total works" },
    { value: oaPct + "%", label: "Open access" },
    { value: fmt(d.institutions.length ? topCount(d.institutions) : 0), label: "Works · top institution" },
    { value: `${years[0]?.key}–${years[years.length - 1]?.key}`, label: "Years covered" },
  ];
  document.getElementById("kpis").innerHTML = kpis
    .map((k) => `<div class="kpi"><div class="value">${k.value}</div><div class="label">${k.label}</div></div>`)
    .join("");

  // OA status doughnut
  doughnut("oaChart", d.oa_status.map((g) => g.name),
    d.oa_status.map((g) => g.count),
    d.oa_status.map((g) => PALETTE[g.key] || "#8a9aa8"));

  // is_oa
  const isOa = d.is_oa.map((g) => {
    const open = g.key === "1" || g.name === "true";
    return { name: open ? "Open" : "Closed", count: g.count, open };
  });
  doughnut("isOaChart", isOa.map((g) => g.name), isOa.map((g) => g.count),
    isOa.map((g) => (g.open ? "#2e9e5b" : "#8a9aa8")));

  // Year trend (line)
  line("yearChart", years.map((y) => y.key), years.map((y) => y.count));

  // Institutions (horizontal bar)
  hbar("instChart", d.institutions.map((g) => shortName(g.name)), d.institutions.map((g) => g.count));

  // Types
  doughnut("typeChart", d.type.map((g) => g.name), d.type.map((g) => g.count), SERIES);

  // Languages
  doughnut("langChart", d.languages.map((g) => g.name), d.languages.map((g) => g.count), SERIES);

  // Topics (horizontal bar)
  hbar("topicChart", d.topics.map((g) => shortName(g.name)), d.topics.map((g) => g.count));

  // Methods
  document.getElementById("methods-note").textContent = d.meta.note || "";
  document.getElementById("filter-str").textContent = d.meta.base_filter || "";
}

// --- chart helpers -----------------------------------------------------------
function doughnut(id, labels, values, colors) {
  new Chart(document.getElementById(id), {
    type: "doughnut",
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 1, borderColor: "#fff" }] },
    options: { plugins: { legend: { position: "right", labels: { boxWidth: 12 } } }, cutout: "55%" },
  });
}
function line(id, labels, values) {
  new Chart(document.getElementById(id), {
    type: "line",
    data: { labels, datasets: [{ data: values, borderColor: "#c8102e", backgroundColor: "rgba(200,16,46,.12)",
      fill: true, tension: 0.3, pointRadius: 0, borderWidth: 2 }] },
    options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { maxTicksLimit: 12 } } } },
  });
}
function hbar(id, labels, values) {
  new Chart(document.getElementById(id), {
    type: "bar",
    data: { labels, datasets: [{ data: values, backgroundColor: "#4aa3df" }] },
    options: { indexAxis: "y", plugins: { legend: { display: false } } },
  });
}

// --- utils -------------------------------------------------------------------
const fmt = (n) => n.toLocaleString("en-CA");
const sumWhere = (arr, pred) => (arr.find(pred) || { count: 0 }).count;
const topCount = (arr) => Math.max(...arr.map((g) => g.count));
const shortName = (s) => (s && s.length > 38 ? s.slice(0, 36) + "…" : s);

load();
