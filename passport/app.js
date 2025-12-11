// ====== HELPERS ======

function getPassportId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  return id;
}

function createList(items) {
  if (!items || !items.length) return "<p>No information available.</p>";
  return `<ul class="bullet-list">${items
    .map((i) => `<li>${i}</li>`)
    .join("")}</ul>`;
}

// ====== DEMO DATA (5 apostles) ======

const PASSPORTS = {
  DEMO001: {
    preferredName: "Peter",
    status: "Active",
    reviewDue: "12/09/2026",
    shortTag: "Epilepsy, diabetes, asthma",
    behaviourNotes: [
      "May shout when anxious – this is not aggression.",
      "May freeze and become non-verbal under pressure.",
      "May appear intoxicated when overwhelmed."
    ],
    approach: [
      "Speak slowly and clearly.",
      "Approach from the front, not behind.",
      "Allow 2–3 metres of personal space."
    ],
    triggers: [
      "Loud sudden noises",
      "Touch without warning",
      "Flashing lights",
      "Crowded environments"
    ],
    calming: [
      "Use reassurance: “You’re safe, we’re here to help.”",
      "Explain each action before you do it.",
      "Offer time and quiet if possible."
    ],
    medicalAlerts: [
      "Epilepsy (risk of seizure).",
      "Type 1 diabetes.",
      "Asthma.",
      "Allergy: Penicillin."
    ],
    contacts: [
      "Primary contact: Sarah (carer) – contact via duty team.",
      "Professional contact: Adult Social Care duty desk."
    ]
  },

  DEMO002: {
    preferredName: "John",
    status: "Active",
    reviewDue: "04/02/2027",
    shortTag: "Autism, sensory sensitivity",
    behaviourNotes: [
      "May cry or tremble when overwhelmed.",
      "May become non-verbal unexpectedly.",
      "Covers ears when distressed – not defiance."
    ],
    approach: [
      "Speak softly; avoid sudden movements.",
      "Allow extra time to answer questions.",
      "Avoid multiple people talking at once."
    ],
    triggers: [
      "Sirens and loud radios",
      "Rapid questioning",
      "Touch on shoulders or arms",
      "Bright flashing lights"
    ],
    calming: [
      "Move to a quieter space if possible.",
      "Use gentle reassurance: “You’re safe.”",
      "Offer written communication if struggling verbally."
    ],
    medicalAlerts: [
      "Anxiety disorder.",
      "Light sensitivity (migraine trigger).",
      "No known allergies."
    ],
    contacts: [
      "Primary: Supported Living (24/7 line).",
      "Professional: Community Mental Health Team (duty worker)."
    ]
  },

  DEMO003: {
    preferredName: "James",
    status: "Active",
    reviewDue: "18/06/2027",
    shortTag: "Substance history, trauma triggers",
    behaviourNotes: [
      "May appear intoxicated when exhausted or anxious.",
      "Loud voice is normal when stressed.",
      "May avoid eye contact – not evasive."
    ],
    approach: [
      "Explain who you are and why you're there.",
      "Keep hands visible; avoid crowding.",
      "Speak one step at a time."
    ],
    triggers: [
      "Raised voices",
      "Sudden touching",
      "Being backed into corners",
      "Blue flashing lights"
    ],
    calming: [
      "Use grounding phrases: “You’re not in trouble; we’re helping.”",
      "Allow slight walking for self-regulation.",
      "Move away from flashing lights if safe."
    ],
    medicalAlerts: [
      "History of alcohol withdrawal seizures.",
      "Currently prescribed antidepressants.",
      "Asthma."
    ],
    contacts: [
      "Primary: Key Worker (Recovery Service).",
      "Professional: Substance Misuse Team (Duty Clinician)."
    ]
  },

  DEMO004: {
    preferredName: "Andrew",
    status: "Active",
    reviewDue: "22/11/2026",
    shortTag: "Epilepsy, cardiac history",
    behaviourNotes: [
      "Struggles to process speech when scared.",
      "May drop to knees before seizure onset.",
      "May push away items near face – instinctive reflex."
    ],
    approach: [
      "Talk slowly with simple instructions.",
      "Stay in front where they can see you.",
      "Use yes/no questions if verbal communication stops."
    ],
    triggers: [
      "Flashing lights",
      "Overheating",
      "Stress or dehydration",
      "Loud conflicting noises"
    ],
    calming: [
      "Move to shade or quiet area.",
      "Offer water if safe.",
      "Avoid touching unless required for safety."
    ],
    medicalAlerts: [
      "Epilepsy – tonic–clonic possible.",
      "Allergic to codeine.",
      "History of arrhythmia."
    ],
    contacts: [
      "Primary: Brother (carer).",
      "Professional: Neurology Nurse Specialist."
    ]
  },

  DEMO005: {
    preferredName: "Philip",
    status: "Active",
    reviewDue: "01/03/2027",
    shortTag: "Learning disability, social anxiety",
    behaviourNotes: [
      "May run or walk away when frightened.",
      "May repeatedly apologise when overwhelmed.",
      "Struggles with complex instructions."
    ],
    approach: [
      "Use calm and friendly tone.",
      "Break instructions into single steps.",
      "Allow comfort item (keychain)."
    ],
    triggers: [
      "People shouting",
      "Being touched suddenly",
      "Unclear instructions",
      "Crowded environments"
    ],
    calming: [
      "Say name first: “Philip, you're OK.”",
      "Pause between sentences.",
      "Reassure he is not in trouble.",
      "Move to quieter space if possible."
    ],
    medicalAlerts: [
      "Mild asthma.",
      "No known allergies.",
      "No current medication."
    ],
    contacts: [
      "Primary: Supported Accommodation Staff.",
      "Professional: Adult Learning Disability Team."
    ]
  }
};

// For home menu labels
const DEMO_ORDER = [
  "DEMO001",
  "DEMO002",
  "DEMO003",
  "DEMO004",
  "DEMO005"
];

// ====== RENDERING ======

function renderPassport(passportId) {
  const data = PASSPORTS[passportId];
  const statusCard = document.getElementById("status-card");
  const quickView = document.getElementById("quick-view");

  if (!data) {
    statusCard.innerHTML = `
      <div class="status-row">
        <div>
          <div class="status-label">Passport ID</div>
          <div class="status-value">${passportId || "Unknown"}</div>
        </div>
      </div>
      <p>❌ No active passport found for this code.</p>
      <p style="font-size:0.8rem; opacity:0.8;">
        Check the code or contact your local social services / duty team.
      </p>
    `;
    quickView.innerHTML = "";
    return;
  }

  statusCard.innerHTML = `
    <div class="status-row">
      <div>
        <div class="status-label">Preferred name</div>
        <div class="status-value">${data.preferredName}</div>
      </div>
      <div>
        <span class="status-pill">
          <span>●</span>
          <span>${data.status}</span>
        </span>
      </div>
    </div>
    <div class="status-row">
      <div class="status-label">Review due</div>
      <div class="status-value">${data.reviewDue}</div>
    </div>
  `;

  quickView.innerHTML = `
    <h2>Emergency quick view</h2>

    <div class="field">
      <div class="field-label">How to approach</div>
      <div class="field-value">
        ${createList(data.approach)}
      </div>
    </div>

    <div class="field">
      <div class="field-label">Behaviour profile</div>
      <div class="field-value">
        ${createList(data.behaviourNotes)}
      </div>
    </div>

    <div class="field">
      <div class="field-label">Key triggers</div>
      <div class="field-value">
        ${createList(data.triggers)}
      </div>
    </div>

    <div class="field">
      <div class="field-label">Calming strategies</div>
      <div class="field-value">
        ${createList(data.calming)}
      </div>
    </div>

    <div class="field">
      <div class="field-label">Medical alerts</div>
      <div class="field-value">
        ${createList(data.medicalAlerts)}
      </div>
    </div>

    <div class="field">
      <div class="field-label">Emergency / professional contacts</div>
      <div class="field-value">
        ${createList(data.contacts)}
      </div>
    </div>
  `;

  renderProfessionalAppendix(passportId, data);
}

function renderProfessionalAppendix(passportId, data) {
  const container = document.getElementById("professional-content");
  if (!container || !data) return;

  container.innerHTML = `
    <p>
      Demo profile: <strong>${data.preferredName}</strong> (ID: ${passportId}).
      The details below are illustrative only.
    </p>

    <div class="prof-section">
      <div class="prof-section-title">Communication profile</div>
      <p>
        Prefers clear, calm language and step-by-step instructions. May need
        extra time to process information when distressed.
      </p>
    </div>

    <div class="prof-section">
      <div class="prof-section-title">Triggers & responses</div>
      ${createList(data.triggers)}
      <p style="font-size:0.8rem; opacity:0.8;">
        In a real system this would include severity ratings, history and
        agency-confirmed notes.
      </p>
    </div>

    <div class="prof-section">
      <div class="prof-section-title">Calming & stabilisation plan</div>
      ${createList(data.calming)}
    </div>

    <div class="prof-section">
      <div class="prof-section-title">Safeguarding & vulnerability</div>
      <p>
        Demo text only. In practice this section would hold concise, multi-agency
        agreed notes about risks to the person, risks from others, and any active
        safeguarding plans.
      </p>
    </div>

    <div class="prof-section">
      <div class="prof-section-title">Crisis response guidance</div>
      <p>
        Follow local policy. Use trauma-informed response, minimise force, and
        prioritise clear communication and de-escalation wherever possible.
      </p>
    </div>
  `;
}

function renderHomeMenu() {
  const list = document.getElementById("demo-list");
  if (!list) return;

  const baseUrl = window.location.origin + window.location.pathname.replace(/index\.html$/, "");
  list.innerHTML = DEMO_ORDER.map((id) => {
    const data = PASSPORTS[id];
    const url = `${baseUrl}?id=${id}`;
    return `
      <article class="demo-card">
        <div class="demo-card-main">
          <div>
            <div class="demo-name">${data.preferredName}</div>
            <div class="demo-tag">${data.shortTag}</div>
          </div>
          <a class="demo-link" href="${url}">Open quick view →</a>
        </div>
      </article>
    `;
  }).join("");
}

// ====== INIT ======

document.addEventListener("DOMContentLoaded", () => {
  const id = getPassportId();

  const splash = document.getElementById("splash-screen");
  const homeMenu = document.getElementById("home-menu");
  const quickWrapper = document.getElementById("quick-view-wrapper");
  const viewDemosBtn = document.getElementById("view-demos-btn");
  const profBtn = document.getElementById("professional-btn");
  const profPanel = document.getElementById("professional-panel");
  const qrCardsLink = document.getElementById("qr-cards-link");

  // Set QR cards link robustly
  if (qrCardsLink) {
    const basePath = window.location.pathname.replace(/index\.html$/, "");
    qrCardsLink.href = basePath + "qr.html";
  }

  if (id && PASSPORTS[id]) {
    // Quick view mode (after scanning QR)
    if (splash) splash.classList.add("hidden");
    if (homeMenu) homeMenu.classList.add("hidden");
    if (quickWrapper) quickWrapper.classList.remove("hidden");
    renderPassport(id);
  } else {
    // Home splash + demo menu
    if (splash) splash.classList.remove("hidden");
    if (homeMenu) homeMenu.classList.add("hidden");
    if (quickWrapper) quickWrapper.classList.add("hidden");
    renderHomeMenu();

    if (viewDemosBtn) {
      viewDemosBtn.addEventListener("click", () => {
        splash.classList.add("hidden");
        homeMenu.classList.remove("hidden");
      });
    }
  }

  if (profBtn && profPanel) {
    profBtn.addEventListener("click", () => {
      profPanel.classList.toggle("hidden");
    });
  }

  // Register service worker for PWA
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((err) => console.warn("SW registration failed:", err));
  }
});
