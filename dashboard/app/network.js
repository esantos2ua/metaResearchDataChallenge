// Institutional collaboration network — pilot.
// Renders the co-authorship graph built by scripts/extraction/build_network_data.py
// using vis-network (force-directed layout).

(async function () {
  const container = document.getElementById("networkChart");
  if (!container || typeof vis === "undefined") return;

  let d;
  try {
    const res = await fetch("data/network_data.json", { cache: "no-store" });
    if (!res.ok) throw new Error(res.statusText);
    d = await res.json();
  } catch (err) {
    container.innerHTML = `<p class="muted">⚠️ Could not load network_data.json (${err.message}). ` +
      `Run <code>build_network_data.py</code> first.</p>`;
    return;
  }

  const CA = "#c8102e", INTL = "#4aa3df";
  const maxWorks = Math.max(...d.nodes.map((n) => n.works));
  const maxWeight = Math.max(...d.edges.map((e) => e.weight));

  const nodes = d.nodes.map((n) => {
    const isCA = n.country === "CA";
    return {
      id: n.id,
      label: n.name,
      title: `${n.name}\n${n.works} works`,
      value: n.works,                                  // scaled to size
      color: { background: isCA ? CA : INTL, border: isCA ? "#8c0a20" : "#2c7bb6" },
      font: { size: 12 + 14 * (n.works / maxWorks), color: "#1b2733" },
    };
  });

  const edges = d.edges.map((e) => ({
    from: e.source,
    to: e.target,
    value: e.weight,
    title: `${e.weight} shared works`,
    color: { color: "rgba(120,135,150,0.35)", highlight: "#c8102e" },
  }));

  const network = new vis.Network(
    container,
    { nodes: new vis.DataSet(nodes), edges: new vis.DataSet(edges) },
    {
      nodes: { shape: "dot", scaling: { min: 8, max: 42, label: { enabled: true, min: 11, max: 26 } } },
      edges: { scaling: { min: 0.5, max: 8 }, smooth: { type: "continuous" } },
      physics: {
        solver: "forceAtlas2Based",
        forceAtlas2Based: { gravitationalConstant: -45, springLength: 110, avoidOverlap: 0.6 },
        stabilization: { iterations: 250 },
      },
      interaction: { hover: true, tooltipDelay: 120 },
      layout: { improvedLayout: true },
    }
  );

  // Stop physics once settled so the graph is calm and cheap.
  network.on("stabilizationIterationsDone", () => network.setOptions({ physics: false }));

  const m = d.meta;
  document.getElementById("network-note").textContent =
    `${m.nodes_shown} of ${m.total_institutions} institutions shown (top ${m.top_n_nodes} by output); ` +
    `${m.edges_shown} ties with ≥ ${m.min_edge_weight} shared works. Drag nodes to explore.`;
})();
