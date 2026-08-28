/* =========================================================
   DJERBA SOLAR — admin.js
   Dashboard CRM (prototype localStorage).
   Dépend de script.js (LeadStore, computeLeadScore,
   classifyTemperature, escapeHTML, openWhatsApp).
   ========================================================= */

const STATUS_OPTIONS = [
  "Nouveau",
  "Contacté",
  "Rendez-vous",
  "Devis envoyé",
  "Négociation",
  "Gagné",
  "Perdu",
];

/* ---------------------------------------------------------
   Estimation de valeur commerciale (usage interne CRM uniquement)
   --------------------------------------------------------- */
function estimateLeadValueRange(lead) {
  const isPro = ["Commerce", "Restaurant"].includes(lead.propertyType);
  const isBig = ["Hôtel", "Maison d'hôtes", "Entreprise"].includes(lead.propertyType);

  if (isBig) return "Étude sur mesure";
  if (isPro) return "15 000 – 50 000 DT (indicatif)";
  if (lead.battery === "oui") return "18 000 – 25 000 DT (indicatif)";
  return "8 000 – 15 000 DT (indicatif)";
}

/* ---------------------------------------------------------
   État de l'UI (filtres / tri)
   --------------------------------------------------------- */
const uiState = {
  search: "",
  status: "",
  temperature: "",
  sort: "date-desc",
};

function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2200);
}

function getFilteredLeads() {
  let leads = LeadStore.getAll();

  if (uiState.search) {
    const q = uiState.search.toLowerCase();
    leads = leads.filter((l) =>
      (l.name || "").toLowerCase().includes(q) ||
      (l.phone || "").toLowerCase().includes(q) ||
      (l.zone || "").toLowerCase().includes(q)
    );
  }
  if (uiState.status) {
    leads = leads.filter((l) => l.status === uiState.status);
  }
  if (uiState.temperature) {
    leads = leads.filter((l) => l.temperature === uiState.temperature);
  }

  leads.sort((a, b) => {
    const da = new Date(a.createdAt).getTime();
    const db = new Date(b.createdAt).getTime();
    return uiState.sort === "date-asc" ? da - db : db - da;
  });

  return leads;
}

/* ---------------------------------------------------------
   Statistiques
   --------------------------------------------------------- */
function renderStats() {
  const all = LeadStore.getAll();
  const todayStr = new Date().toDateString();

  const total = all.length;
  const today = all.filter((l) => new Date(l.createdAt).toDateString() === todayStr).length;
  const hot = all.filter((l) => l.temperature === "hot").length;

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statToday").textContent = today;
  document.getElementById("statHot").textContent = hot;

  // Valeur potentielle : somme des bornes basses/hautes des leads non perdus.
  let min = 0, max = 0, hasRange = false, customStudyCount = 0;
  all.filter((l) => l.status !== "Perdu").forEach((l) => {
    const range = estimateLeadValueRange(l);
    const match = range.match(/([\d\s]+)\s*–\s*([\d\s]+)/);
    if (match) {
      hasRange = true;
      min += parseInt(match[1].replace(/\s/g, ""), 10);
      max += parseInt(match[2].replace(/\s/g, ""), 10);
    } else {
      customStudyCount += 1;
    }
  });

  let valueText;
  if (hasRange && customStudyCount > 0) {
    valueText = min.toLocaleString("fr-FR") + " – " + max.toLocaleString("fr-FR") + " DT + " + customStudyCount + " étude(s) sur mesure";
  } else if (hasRange) {
    valueText = min.toLocaleString("fr-FR") + " – " + max.toLocaleString("fr-FR") + " DT";
  } else if (customStudyCount > 0) {
    valueText = customStudyCount + " étude(s) sur mesure";
  } else {
    valueText = "0 DT";
  }
  document.getElementById("statValue").textContent = valueText;
}

/* ---------------------------------------------------------
   Tableau
   --------------------------------------------------------- */
function renderTable() {
  const leads = getFilteredLeads();
  const tbody = document.getElementById("leadsTableBody");
  const emptyState = document.getElementById("emptyState");
  const tableWrap = document.getElementById("tableWrap");

  if (leads.length === 0) {
    tableWrap.style.display = "none";
    emptyState.style.display = "block";
    return;
  }
  tableWrap.style.display = "block";
  emptyState.style.display = "none";

  tbody.innerHTML = leads.map(rowTemplate).join("");

  tbody.querySelectorAll("select.status-select").forEach((sel) => {
    sel.addEventListener("change", (e) => {
      LeadStore.updateStatus(e.target.dataset.id, e.target.value);
      showToast("Statut mis à jour");
      renderStats();
    });
  });

  tbody.querySelectorAll(".icon-btn.danger").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm("Supprimer définitivement ce lead ?")) {
        LeadStore.remove(id);
        showToast("Lead supprimé");
        renderAll();
      }
    });
  });

  tbody.querySelectorAll(".icon-btn.wa-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.id;
      const lead = LeadStore.getAll().find((l) => l.id === id);
      if (!lead) return;
      const recap =
        "Rappel client Djerba Solar\n" +
        "Nom : " + lead.name + "\n" +
        "Téléphone : " + lead.phone + "\n" +
        "Zone : " + lead.zone + "\n" +
        "Type de bien : " + lead.propertyType + "\n" +
        "Facture STEG : " + lead.monthlyBill + " DT\n" +
        "Objectif : " + lead.objective + "\n" +
        "Batterie : " + lead.battery + "\n" +
        "Délai : " + lead.timeline + "\n" +
        "Score : " + lead.score + "/100";
      openWhatsApp(recap);
    });
  });
}

function rowTemplate(lead) {
  const temp = classifyTemperature(lead.score || 0);
  const date = new Date(lead.createdAt).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const statusOptions = STATUS_OPTIONS.map(
    (s) => `<option value="${escapeHTML(s)}" ${s === lead.status ? "selected" : ""}>${escapeHTML(s)}</option>`
  ).join("");

  return `
    <tr>
      <td>${escapeHTML(date)}</td>
      <td><strong>${escapeHTML(lead.name)}</strong></td>
      <td>${escapeHTML(lead.phone)}</td>
      <td>${escapeHTML(lead.zone)}</td>
      <td>${escapeHTML(lead.propertyType)}</td>
      <td>${escapeHTML(lead.monthlyBill)} DT</td>
      <td>${escapeHTML(lead.battery)}</td>
      <td><strong>${escapeHTML(String(lead.score ?? 0))}</strong></td>
      <td><span class="temp-pill ${temp.key}">${temp.emoji} ${escapeHTML(temp.label)}</span></td>
      <td><span class="value-tag">${escapeHTML(estimateLeadValueRange(lead))}</span></td>
      <td>
        <select class="status-select" data-id="${escapeHTML(lead.id)}">
          ${statusOptions}
        </select>
      </td>
      <td>
        <div class="row-actions">
          <button class="icon-btn wa-btn" data-id="${escapeHTML(lead.id)}" title="WhatsApp">💬</button>
          <button class="icon-btn danger" data-id="${escapeHTML(lead.id)}" title="Supprimer">🗑️</button>
        </div>
      </td>
    </tr>
  `;
}

/* ---------------------------------------------------------
   Export CSV
   --------------------------------------------------------- */
function exportCSV() {
  const leads = getFilteredLeads();
  if (leads.length === 0) {
    showToast("Aucun lead à exporter");
    return;
  }

  const headers = [
    "id", "createdAt", "name", "phone", "whatsapp", "zone", "propertyType",
    "owner", "monthlyBill", "objective", "battery", "timeline", "message",
    "score", "temperature", "status",
  ];

  const csvEscape = (val) => {
    const str = String(val ?? "");
    if (/[",\n;]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
    return str;
  };

  const rows = [headers.join(";")];
  leads.forEach((l) => {
    rows.push(headers.map((h) => csvEscape(l[h])).join(";"));
  });

  const csvContent = "﻿" + rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "djerba-solar-leads-" + new Date().toISOString().slice(0, 10) + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ---------------------------------------------------------
   Init
   --------------------------------------------------------- */
function renderAll() {
  renderStats();
  renderTable();
}

document.addEventListener("DOMContentLoaded", () => {
  renderAll();

  document.getElementById("searchInput").addEventListener("input", (e) => {
    uiState.search = e.target.value.trim();
    renderTable();
  });
  document.getElementById("statusFilter").addEventListener("change", (e) => {
    uiState.status = e.target.value;
    renderTable();
  });
  document.getElementById("temperatureFilter").addEventListener("change", (e) => {
    uiState.temperature = e.target.value;
    renderTable();
  });
  document.getElementById("sortSelect").addEventListener("change", (e) => {
    uiState.sort = e.target.value;
    renderTable();
  });
  document.getElementById("exportCsvBtn").addEventListener("click", exportCSV);
});
