// Bilingual (English / French) strings for the Canadian Metaresearch Dashboard.
// Static UI text is keyed by data-i18n / data-i18n-html attributes in index.html;
// dynamic chart/KPI/category labels are looked up via t() in dashboard.js.

const I18N = {
  en: {
    // Sidebar / brand / nav
    "brand.title": "Metaresearch Dashboard",
    "brand.sub": "Canada · pilot",
    "nav.overview": "Overview",
    "nav.trends": "Publication trends",
    "nav.institutions": "Institutions",
    "nav.network": "Collaboration network",
    "nav.topics": "Topics & fields",
    "nav.about": "About & methods",
    // Filters
    "filters.title": "Filters",
    "filters.years": "Years",
    "filters.oa": "Open access status",
    "filters.language": "Language",
    "filters.type": "Output type",
    "filters.oaonly": "Open access only",
    "filters.reset": "Reset filters",
    "filters.allLanguages": "All languages",
    "filters.allTypes": "All types",
    // Actions
    "actions.download": "⬇ Download filtered CSV",
    "repo.link": "↗ Project on GitHub",
    // Header
    "header.title": "Canadian Metaresearch Dashboard",
    "header.subtitle": "An open, reproducible view of Canada's metaresearch landscape, built on " +
      "<a href=\"https://openalex.org/\" target=\"_blank\" rel=\"noopener\">OpenAlex</a> · " +
      "inspired by <a href=\"https://open.coki.ac/\" target=\"_blank\" rel=\"noopener\">COKI</a>.",
    "header.pilot": "PILOT · real OpenAlex data",
    "filtersToggle": "☰ Menu & filters",
    "loading": "Loading data…",
    // Section titles
    "sec.overview": "Overview",
    "sec.trends": "Publication trends",
    "sec.institutions": "Institutions",
    "sec.network": "Collaboration network",
    "sec.topics": "Topics & fields",
    "sec.about": "About & methods",
    // Cards
    "card.oa.title": "Open access status",
    "card.oa.desc": "How outputs are made open (gold, green, diamond, hybrid, bronze, closed).",
    "card.isoa.title": "Open vs. closed",
    "card.isoa.desc": "Share of the (filtered) corpus that is openly accessible.",
    "card.year.title": "Outputs per year",
    "card.year.desc": "Metaresearch outputs over time (filtered).",
    "card.inst.title": "Top institutions",
    "card.inst.desc": "Canadian institutions producing the most metaresearch (filtered).",
    "card.net.title": "Institutional co-authorship network",
    "card.net.desc": "Co-authorship ties between institutions. Node size = output; edge thickness = shared works.",
    "card.topic.title": "Top topics",
    "card.topic.desc": "Primary OpenAlex topics within the (filtered) corpus.",
    "card.type.title": "Output types",
    "card.lang.title": "Languages",
    // Legend
    "legend.ca": "Canadian",
    "legend.intl": "International",
    // About
    "about.filter": "Corpus filter (OpenAlex):",
    "about.body": "Pilot mock-up demonstrating the dashboard stack. The corpus definition " +
      "(concepts/keywords, \"Canadian\" criteria) is intentionally simple and will be refined per " +
      "<a href=\"https://github.com/esantos2ua/metaResearchDataChallenge/blob/main/docs/METHODOLOGY.md\" " +
      "target=\"_blank\" rel=\"noopener\">docs/METHODOLOGY.md</a>. " +
      "All charts, the network, and the CSV export update with the filters on the left. " +
      "Data & documentation: CC BY 4.0 · Code: MIT.",
    // KPIs
    "kpi.works": "Works (filtered)",
    "kpi.oa": "Open access",
    "kpi.citations": "Total citations",
    "kpi.years": "Years",
    // Dynamic phrases — {n}, {m}, {N}, {e}, {w} are substituted in code
    "matchCount": "<b>{n}</b> of {m} works",
    "networkNote": "{n} institutions shown (top {N} by output), {e} ties with ≥ {w} shared works. " +
      "Drag nodes to explore; scroll to zoom.",
    "chart.open": "Open",
    "chart.closed": "Closed",
    // Open-access status labels
    "oa.gold": "gold", "oa.green": "green", "oa.diamond": "diamond",
    "oa.hybrid": "hybrid", "oa.bronze": "bronze", "oa.closed": "closed", "oa.unknown": "unknown",
    // Output types
    "type.article": "article", "type.preprint": "preprint", "type.review": "review",
    "type.book-chapter": "book chapter", "type.editorial": "editorial", "type.report": "report",
    "type.book": "book", "type.dataset": "dataset", "type.dissertation": "dissertation",
    "type.paratext": "paratext", "type.letter": "letter", "type.other": "other", "type.unknown": "unknown",
    // Languages
    "lang.en": "English", "lang.fr": "French", "lang.es": "Spanish", "lang.de": "German",
    "lang.pt": "Portuguese", "lang.ru": "Russian", "lang.it": "Italian", "lang.nl": "Dutch",
    "lang.unknown": "Unknown",
    // CSV header
    "csv.cols": "id,title,year,type,language,cited_by_count,is_oa,oa_status,topic,field,institutions,countries",
  },

  fr: {
    "brand.title": "Tableau de la métarecherche",
    "brand.sub": "Canada · pilote",
    "nav.overview": "Aperçu",
    "nav.trends": "Tendances de publication",
    "nav.institutions": "Établissements",
    "nav.network": "Réseau de collaboration",
    "nav.topics": "Sujets et domaines",
    "nav.about": "À propos et méthodes",
    "filters.title": "Filtres",
    "filters.years": "Années",
    "filters.oa": "Statut de libre accès",
    "filters.language": "Langue",
    "filters.type": "Type de production",
    "filters.oaonly": "Libre accès seulement",
    "filters.reset": "Réinitialiser les filtres",
    "filters.allLanguages": "Toutes les langues",
    "filters.allTypes": "Tous les types",
    "actions.download": "⬇ Télécharger le CSV filtré",
    "repo.link": "↗ Projet sur GitHub",
    "header.title": "Tableau de bord de la métarecherche canadienne",
    "header.subtitle": "Une vue ouverte et reproductible du paysage de la métarecherche au Canada, " +
      "à partir d'<a href=\"https://openalex.org/\" target=\"_blank\" rel=\"noopener\">OpenAlex</a> · " +
      "inspiré de <a href=\"https://open.coki.ac/\" target=\"_blank\" rel=\"noopener\">COKI</a>.",
    "header.pilot": "PILOTE · données réelles OpenAlex",
    "filtersToggle": "☰ Menu et filtres",
    "loading": "Chargement des données…",
    "sec.overview": "Aperçu",
    "sec.trends": "Tendances de publication",
    "sec.institutions": "Établissements",
    "sec.network": "Réseau de collaboration",
    "sec.topics": "Sujets et domaines",
    "sec.about": "À propos et méthodes",
    "card.oa.title": "Statut de libre accès",
    "card.oa.desc": "Comment les productions sont rendues ouvertes (doré, vert, diamant, hybride, bronze, fermé).",
    "card.isoa.title": "Ouvert ou restreint",
    "card.isoa.desc": "Part du corpus (filtré) en libre accès.",
    "card.year.title": "Productions par année",
    "card.year.desc": "Productions de métarecherche dans le temps (filtré).",
    "card.inst.title": "Principaux établissements",
    "card.inst.desc": "Établissements canadiens produisant le plus de métarecherche (filtré).",
    "card.net.title": "Réseau de copublication entre établissements",
    "card.net.desc": "Liens de coécriture entre établissements. Taille du nœud = production; épaisseur du lien = travaux partagés.",
    "card.topic.title": "Principaux sujets",
    "card.topic.desc": "Sujets principaux OpenAlex au sein du corpus (filtré).",
    "card.type.title": "Types de production",
    "card.lang.title": "Langues",
    "legend.ca": "Canadien",
    "legend.intl": "International",
    "about.filter": "Filtre du corpus (OpenAlex) :",
    "about.body": "Maquette pilote illustrant la plateforme du tableau de bord. La définition du corpus " +
      "(concepts/mots-clés, critères « canadien ») est volontairement simple et sera affinée selon " +
      "<a href=\"https://github.com/esantos2ua/metaResearchDataChallenge/blob/main/docs/METHODOLOGY.md\" " +
      "target=\"_blank\" rel=\"noopener\">docs/METHODOLOGY.md</a>. " +
      "Tous les graphiques, le réseau et l'export CSV se mettent à jour avec les filtres à gauche. " +
      "Données et documentation : CC BY 4.0 · Code : MIT.",
    "kpi.works": "Travaux (filtrés)",
    "kpi.oa": "Libre accès",
    "kpi.citations": "Citations totales",
    "kpi.years": "Années",
    "matchCount": "<b>{n}</b> sur {m} travaux",
    "networkNote": "{n} établissements affichés (les {N} plus productifs), {e} liens avec ≥ {w} travaux partagés. " +
      "Glissez les nœuds pour explorer; défilez pour zoomer.",
    "chart.open": "Ouvert",
    "chart.closed": "Restreint",
    "oa.gold": "doré", "oa.green": "vert", "oa.diamond": "diamant",
    "oa.hybrid": "hybride", "oa.bronze": "bronze", "oa.closed": "fermé", "oa.unknown": "inconnu",
    "type.article": "article", "type.preprint": "prépublication", "type.review": "synthèse",
    "type.book-chapter": "chapitre de livre", "type.editorial": "éditorial", "type.report": "rapport",
    "type.book": "livre", "type.dataset": "jeu de données", "type.dissertation": "thèse",
    "type.paratext": "paratexte", "type.letter": "lettre", "type.other": "autre", "type.unknown": "inconnu",
    "lang.en": "Anglais", "lang.fr": "Français", "lang.es": "Espagnol", "lang.de": "Allemand",
    "lang.pt": "Portugais", "lang.ru": "Russe", "lang.it": "Italien", "lang.nl": "Néerlandais",
    "lang.unknown": "Inconnu",
    "csv.cols": "id,titre,annee,type,langue,nombre_citations,libre_acces,statut_la,sujet,domaine,etablissements,pays",
  },
};
