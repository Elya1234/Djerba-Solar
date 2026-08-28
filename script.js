/* =========================================================
   DJERBA SOLAR — script.js
   Vanilla JS. Aucune bibliothèque externe requise ; seul l'envoi
   d'email (optionnel, voir LEAD_EMAIL_ACCESS_KEY) appelle une API
   tierce (Web3Forms) directement depuis le navigateur.
   ========================================================= */

/* ---------------------------------------------------------
   0. CONFIGURATION
   --------------------------------------------------------- */

// Numéro WhatsApp de l'entreprise (format international sans "+").
// À REMPLACER par le vrai numéro avant mise en production.
const WHATSAPP_NUMBER = "216XXXXXXXX";

const DEFAULT_WHATSAPP_MESSAGE =
  "Bonjour Djerba Solar, je souhaite obtenir une estimation pour une installation solaire à Djerba.";

// Notification par email à chaque nouveau lead, via Web3Forms (service gratuit,
// sans backend à héberger). Pour l'activer :
//   1) Créez un compte gratuit sur https://web3forms.com
//   2) Récupérez votre "Access Key" et collez-le ci-dessous à la place du placeholder
//   3) Renseignez l'email qui doit recevoir les notifications
// Tant que la clé n'est pas renseignée, l'envoi d'email est simplement ignoré :
// le lead reste quand même enregistré dans le CRM local (admin.html) et le
// bouton WhatsApp de secours reste disponible pour le visiteur.
const LEAD_EMAIL_ACCESS_KEY = "43e99d6a-648f-49ef-ab6e-732bd6518ed2";
const LEAD_NOTIFICATION_EMAIL = "yy9795807@gmail.com";

/* ---------------------------------------------------------
   1. UTILITAIRES
   --------------------------------------------------------- */

/** Échappe le HTML pour éviter toute injection lors de l'affichage. */
function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateId() {
  return "lead_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function openWhatsApp(message) {
  const text = encodeURIComponent(message || DEFAULT_WHATSAPP_MESSAGE);
  const url = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + text;
  window.open(url, "_blank", "noopener");
}

/**
 * Envoie une notification par email pour un nouveau lead via Web3Forms.
 * N'échoue jamais bruyamment : si la clé n'est pas configurée ou si la
 * requête échoue (réseau, service indisponible), le lead reste de toute
 * façon enregistré dans le CRM local et le bouton WhatsApp reste disponible.
 */
async function sendLeadEmailNotification(lead) {
  if (!LEAD_EMAIL_ACCESS_KEY || LEAD_EMAIL_ACCESS_KEY === "YOUR_WEB3FORMS_ACCESS_KEY") {
    return { sent: false, reason: "not_configured" };
  }

  try {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: LEAD_EMAIL_ACCESS_KEY,
        email: LEAD_NOTIFICATION_EMAIL,
        from_name: "Site Djerba Solar",
        subject: "Nouveau lead Djerba Solar — " + lead.name,
        "Nom": lead.name,
        "Téléphone": lead.phone,
        "WhatsApp": lead.whatsapp,
        "Zone": lead.zone,
        "Type de bien": lead.propertyType,
        "Propriétaire ou locataire": lead.owner,
        "Facture STEG mensuelle (DT)": lead.monthlyBill,
        "Objectif": lead.objective,
        "Batterie souhaitée": lead.battery,
        "Délai du projet": lead.timeline,
        "Message": lead.message,
        "Score interne": lead.score,
        "Température": lead.temperature,
      }),
    });
    const data = await response.json();
    return { sent: Boolean(data && data.success), reason: data && data.message };
  } catch (err) {
    console.error("Envoi email lead échoué :", err);
    return { sent: false, reason: "network_error" };
  }
}

/* ---------------------------------------------------------
   2. LEAD STORE — couche de données (localStorage)
   ---------------------------------------------------------
   Prototype local. Pour la production, remplacer le contenu
   des fonctions ci-dessous par des appels à un vrai backend
   (Supabase, Firebase, ou Node.js + PostgreSQL) en conservant
   les mêmes signatures pour ne pas impacter le reste du code.
   --------------------------------------------------------- */

const LeadStore = (function () {
  const KEY = "djerbaSolarLeads";

  function getAll() {
    try {
      const raw = localStorage.getItem(KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      console.error("LeadStore.getAll: données corrompues, réinitialisation.", e);
      return [];
    }
  }

  function saveAll(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function add(lead) {
    const list = getAll();
    list.unshift(lead);
    saveAll(list);
    return lead;
  }

  function updateStatus(id, status) {
    const list = getAll();
    const item = list.find((l) => l.id === id);
    if (item) {
      item.status = status;
      saveAll(list);
    }
    return item;
  }

  function remove(id) {
    const list = getAll().filter((l) => l.id !== id);
    saveAll(list);
  }

  return { KEY, getAll, saveAll, add, updateStatus, remove };
})();

/* ---------------------------------------------------------
   3. SCORING / QUALIFICATION AUTOMATIQUE
   --------------------------------------------------------- */

const PRO_PROPERTY_TYPES = ["Commerce", "Restaurant", "Hôtel", "Maison d'hôtes", "Entreprise"];

function computeLeadScore(lead) {
  let score = 0;
  const bill = Number(lead.monthlyBill) || 0;

  if (bill > 300) score += 30;
  else if (bill > 150) score += 5;

  if (lead.battery === "oui") score += 20;
  if (lead.owner === "proprietaire") score += 20;
  if (lead.timeline === "maintenant") score += 15;
  if (PRO_PROPERTY_TYPES.includes(lead.propertyType)) score += 10;

  return Math.min(score, 100);
}

function classifyTemperature(score) {
  if (score >= 80) return { key: "hot", label: "LEAD TRÈS CHAUD", emoji: "🔥" };
  if (score >= 60) return { key: "warm", label: "LEAD CHAUD", emoji: "🟠" };
  if (score >= 40) return { key: "qualify", label: "LEAD À QUALIFIER", emoji: "🟡" };
  return { key: "cold", label: "LEAD FROID", emoji: "⚪" };
}

/* ---------------------------------------------------------
   4. SIMULATEUR SOLAIRE (estimation indicative)
   ---------------------------------------------------------
   Les pourcentages/paliers ci-dessous sont des hypothèses de
   simulation généralistes, pas des données tarifaires STEG
   officielles. Ils servent uniquement à donner un ordre de
   grandeur avant étude technique réelle.
   --------------------------------------------------------- */

function computeSimulation(inputs) {
  const bill = Math.max(0, Number(inputs.monthlyBill) || 0);

  // Fourchette d'économie indicative en % de la facture actuelle.
  let savingsMinPct = 0.4;
  let savingsMaxPct = 0.65;

  // Les gros consommateurs (commerces, hôtels) ont souvent un potentiel
  // de réduction plus élevé grâce à un fort ratio consommation diurne.
  if (["Commerce", "Restaurant", "Hôtel", "Maison d'hôtes", "Entreprise"].includes(inputs.propertyType)) {
    savingsMinPct = 0.45;
    savingsMaxPct = 0.7;
  }

  const monthlySavingsMin = Math.round(bill * savingsMinPct);
  const monthlySavingsMax = Math.round(bill * savingsMaxPct);
  const annualSavingsMin = monthlySavingsMin * 12;
  const annualSavingsMax = monthlySavingsMax * 12;

  // Puissance indicative par palier de facture (ordre de grandeur uniquement).
  let powerRange = "1.5 – 3 kWc";
  if (bill > 500) powerRange = "9 kWc et plus";
  else if (bill > 300) powerRange = "6 – 9 kWc";
  else if (bill > 150) powerRange = "3 – 6 kWc";

  // Recommandation batterie.
  let batteryRecommendation;
  if (inputs.battery === "oui") {
    batteryRecommendation =
      "Une solution avec batterie et backup sera étudiée pour sécuriser vos équipements prioritaires pendant les coupures.";
  } else if (inputs.battery === "non") {
    batteryRecommendation =
      "Une installation photovoltaïque seule (sans batterie) peut déjà réduire fortement votre facture STEG.";
  } else {
    batteryRecommendation =
      "Nous pouvons vous présenter les deux options (avec ou sans batterie) lors de l'étude technique pour vous aider à choisir.";
  }

  return {
    monthlySavingsMin,
    monthlySavingsMax,
    annualSavingsMin,
    annualSavingsMax,
    powerRange,
    batteryRecommendation,
  };
}

/* ---------------------------------------------------------
   5. NAVIGATION MOBILE
   --------------------------------------------------------- */

function initMobileNav() {
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("mainNav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.classList.toggle("open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---------------------------------------------------------
   6. WHATSAPP CTA (tous boutons data-wa-cta)
   --------------------------------------------------------- */

function initWhatsAppButtons() {
  document.querySelectorAll("[data-wa-cta]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openWhatsApp(DEFAULT_WHATSAPP_MESSAGE);
    });
  });
}

/* ---------------------------------------------------------
   7. SIMULATEUR — logique du formulaire
   --------------------------------------------------------- */

function initSimulator() {
  const form = document.getElementById("simulatorForm");
  const resultBox = document.getElementById("simResult");
  if (!form || !resultBox) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const monthlyBill = form.elements["simMonthlyBill"].value;
    const propertyType = form.elements["simPropertyType"].value;
    const consumption = form.elements["simConsumption"].value;
    const batteryEls = form.elements["simBattery"];
    let battery = "je_ne_sais_pas";
    for (const el of batteryEls) {
      if (el.checked) battery = el.value;
    }

    const billField = form.elements["simMonthlyBill"];
    const billFieldWrap = billField.closest(".field");
    const billValid = Boolean(monthlyBill) && Number(monthlyBill) > 0;
    if (billFieldWrap) billFieldWrap.classList.toggle("invalid", !billValid);

    if (!billValid) {
      billField.focus();
      return;
    }

    const result = computeSimulation({ monthlyBill, propertyType, consumption, battery });

    document.getElementById("simMonthlySavings").textContent =
      result.monthlySavingsMin + " – " + result.monthlySavingsMax + " DT";
    document.getElementById("simAnnualSavings").textContent =
      result.annualSavingsMin + " – " + result.annualSavingsMax + " DT";
    document.getElementById("simPower").textContent = result.powerRange;
    document.getElementById("simBatteryReco").textContent = result.batteryRecommendation;

    resultBox.classList.add("show");
    resultBox.scrollIntoView({ behavior: "smooth", block: "center" });

    // Pré-remplit le formulaire de contact pour fluidifier le parcours.
    const leadForm = document.getElementById("leadForm");
    if (leadForm) {
      if (leadForm.elements["monthlyBill"]) leadForm.elements["monthlyBill"].value = monthlyBill;
      if (leadForm.elements["propertyType"] && propertyType) leadForm.elements["propertyType"].value = propertyType;
      if (battery !== "je_ne_sais_pas" && leadForm.elements["battery"]) {
        leadForm.elements["battery"].value = battery;
      }
    }
  });
}

/* ---------------------------------------------------------
   8. FORMULAIRE DE LEAD — validation + scoring + stockage
   --------------------------------------------------------- */

function validateLeadForm(form) {
  let valid = true;
  const requiredFields = [
    "firstName",
    "lastName",
    "phone",
    "zone",
    "propertyType",
    "owner",
    "monthlyBill",
    "objective",
    "battery",
    "timeline",
  ];

  requiredFields.forEach((name) => {
    const el = form.elements[name];
    if (!el) return;
    const fieldWrap = el.closest(".field");
    const value = el.value.trim();
    let ok = value.length > 0;

    if (ok && name === "phone") {
      ok = /^[0-9+\s]{6,15}$/.test(value);
    }
    if (ok && name === "monthlyBill") {
      ok = Number(value) > 0;
    }

    if (fieldWrap) fieldWrap.classList.toggle("invalid", !ok);
    if (!ok) valid = false;
  });

  return valid;
}

function buildLeadFromForm(form) {
  const val = (name) => (form.elements[name] ? form.elements[name].value.trim() : "");

  return {
    id: generateId(),
    createdAt: new Date().toISOString(),
    name: (val("firstName") + " " + val("lastName")).trim(),
    phone: val("phone"),
    whatsapp: val("whatsapp") || val("phone"),
    zone: val("zone"),
    propertyType: val("propertyType"),
    owner: val("owner"),
    monthlyBill: val("monthlyBill"),
    objective: val("objective"),
    battery: val("battery"),
    timeline: val("timeline"),
    message: val("message"),
    status: "Nouveau",
  };
}

function initLeadForm() {
  const form = document.getElementById("leadForm");
  const successBox = document.getElementById("leadFormSuccess");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!validateLeadForm(form)) {
      const firstInvalid = form.querySelector(".field.invalid input, .field.invalid select");
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const lead = buildLeadFromForm(form);
    lead.score = computeLeadScore(lead);
    lead.temperature = classifyTemperature(lead.score).key;

    LeadStore.add(lead);
    sendLeadEmailNotification(lead); // envoi en arrière-plan, n'empêche pas l'affichage du succès

    form.reset();
    form.style.display = "none";
    if (successBox) {
      successBox.classList.add("show");

      const waBtn = document.getElementById("leadWaBtn");
      if (waBtn) {
        waBtn.onclick = (evt) => {
          evt.preventDefault();
          const recap =
            "Bonjour Djerba Solar, voici ma demande d'estimation :\n" +
            "Nom : " + lead.name + "\n" +
            "Zone : " + lead.zone + "\n" +
            "Type de bien : " + lead.propertyType + "\n" +
            "Facture STEG mensuelle : " + lead.monthlyBill + " DT\n" +
            "Objectif : " + lead.objective + "\n" +
            "Batterie souhaitée : " + lead.battery + "\n" +
            "Délai du projet : " + lead.timeline;
          openWhatsApp(recap);
        };
      }
    }
  });
}

/* ---------------------------------------------------------
   9. PILLULES RADIO (UI du simulateur)
   --------------------------------------------------------- */

function initRadioPills() {
  document.querySelectorAll(".radio-pill").forEach((pill) => {
    const input = pill.querySelector("input");
    if (!input) return;
    const sync = () => {
      const group = document.getElementsByName(input.name);
      group.forEach((i) => {
        const p = i.closest(".radio-pill");
        if (p) p.classList.toggle("active", i.checked);
      });
    };
    input.addEventListener("change", sync);
    sync();
  });
}

/* ---------------------------------------------------------
   10. INIT
   --------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  initMobileNav();
  initWhatsAppButtons();
  initRadioPills();
  initSimulator();
  initLeadForm();

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
