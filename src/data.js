import { addDays, addHours, deepClone, uid } from "./utils.js";

const profileCandidateTemplate = [
  { key: "displayName", category: "Identidad", proposedValue: "Don Orlando López", sourceLabel: "Configuración visible de la instancia", confidence: "CONFIRMADO" },
  { key: "productInstance", category: "Identidad", proposedValue: "Bitácora — Don Orlando López", sourceLabel: "Configuración del producto", confidence: "CONFIRMADO" },
  { key: "locationGeneral", category: "Ubicación", proposedValue: "Capturar en este dispositivo", sourceLabel: "No incluida en la vista pública", confidence: "REVISAR" },
  { key: "languages", category: "Idiomas", proposedValue: ["Capturar en este dispositivo"], sourceLabel: "No incluidos en la vista pública", confidence: "REVISAR" },
  { key: "currentWork", category: "Trabajo", proposedValue: "Capturar en este dispositivo", sourceLabel: "No incluido en la vista pública", confidence: "REVISAR" },
  { key: "builderProfile", category: "Capacidades", proposedValue: "Software, organización y automatización", sourceLabel: "Descripción general sanitizada", confidence: "PROBABLE" },
  { key: "ecosystemRole", category: "Ecosistema", proposedValue: "Dirección y seguimiento de proyectos", sourceLabel: "Descripción general sanitizada", confidence: "PROBABLE" },
  {
    key: "goals",
    category: "Objetivos",
    proposedValue: ["Organizar prioridades", "Registrar evidencia", "Recuperar tiempo", "Construir sistemas útiles"],
    sourceLabel: "Objetivos demo sanitizados",
    confidence: "REVISAR"
  },
  {
    key: "principles",
    category: "Principios",
    proposedValue: ["Máximo tres prioridades activas", "No declarar progreso sin evidencia", "Proteger sistemas que funcionan"],
    sourceLabel: "Principios operativos sanitizados",
    confidence: "PROBABLE"
  },
  {
    key: "preferences",
    category: "Preferencias de Bitácora",
    proposedValue: ["Mobile-first", "Sin scroll global", "Diseño por puertas", "Progreso por gates"],
    sourceLabel: "Especificación pública de la interfaz",
    confidence: "CONFIRMADO"
  },
  {
    key: "ecosystem",
    category: "Proyectos y áreas",
    proposedValue: ["Bitácora", "ORVA", "ORCE", "ACABEX", "OPOS", "QUADRUM"],
    sourceLabel: "Puertas visibles del prototipo",
    confidence: "CONFIRMADO"
  }
];

export function createProfileCandidates() {
  return deepClone(profileCandidateTemplate).map(candidate => ({ ...candidate, decision: "pending", editedValue: undefined }));
}

export function createDefaultState() {
  const createdAt = new Date().toISOString();
  return {
    meta: { schemaVersion: 1, createdAt, updatedAt: createdAt, runtimeMode: "public-preview" },
    profile: {
      displayName: "Don Orlando López",
      productName: "Bitácora",
      instanceName: "Bitácora — Don Orlando López",
      locationGeneral: "",
      languages: [],
      currentWork: "",
      builderProfile: "",
      ecosystemRole: "",
      photoUrl: null,
      energy: 6,
      focus: 7,
      focusOfDay: "Validar Bitácora desde el teléfono",
      priorityAction: "Revisar la experiencia móvil sin ingresar datos sensibles",
      goals: [],
      principles: [],
      preferences: [],
      ecosystem: []
    },
    discovery: { receipt: null, candidates: createProfileCandidates() },
    alarms: [{
      id: uid("alarm"), title: "Revisar la vista móvil", scheduledAt: addHours(2), recurrence: "none",
      area: "Bitácora", projectId: "project-bitacora", status: "active", createdAt
    }],
    events: [{
      id: uid("event"), title: "Prueba móvil de Bitácora", startsAt: addDays(1, 19, 0), endsAt: addDays(1, 19, 30),
      type: "Revisión", area: "Bitácora", projectId: "project-bitacora", priority: "high",
      notes: "Vista pública temporal con datos demo.", status: "scheduled", createdAt
    }],
    lifeCheckins: [],
    projects: [
      {
        id: "project-bitacora", name: "Bitácora", category: "Producto personal", status: "ACTIVO",
        objective: "Validar el centro de mando móvil.",
        nextAction: "Revisar navegación, puertas y PWA en el teléfono.", blocker: "Datos remotos y autenticación fuera de U1.",
        owner: "Don Orlando / Code-Codex", sourceOfTruth: "GitHub PR #1", needsOwner: true,
        gates: [
          { id: uid("gate"), code: "U0", title: "Contexto y auditoría", status: "PASS", evidenceUrl: "" },
          { id: uid("gate"), code: "U1A", title: "Conocerme", status: "PASS", evidenceUrl: "" },
          { id: uid("gate"), code: "U1B", title: "Shell local", status: "PASS", evidenceUrl: "" },
          { id: uid("gate"), code: "U1M", title: "Validación móvil", status: "PENDING", evidenceUrl: "" }
        ]
      },
      {
        id: "project-opos", name: "OPOS POS", category: "Producto independiente", status: "OPERACIÓN",
        objective: "Mostrar estado informativo sin tocar producción.",
        nextAction: "Integración read-only futura.", blocker: "Fuera del alcance U1.",
        owner: "Proyecto independiente", sourceOfTruth: "Repositorio independiente", needsOwner: false,
        gates: [{ id: uid("gate"), code: "ISO", title: "Aislamiento", status: "PASS", evidenceUrl: "" }]
      }
    ],
    attentionItems: [{
      id: uid("attention"), projectId: "project-bitacora", area: "Bitácora", title: "Revisar la experiencia móvil",
      reason: "La validación visual depende del propietario.", impact: "Define las correcciones de U1.",
      urgency: "medium", status: "open", sourceUrl: "local://mobile-review", createdAt
    }],
    finance: {
      liquidityStatus: "No disponible en preview", obligationsCount: 0, projectCapitalStatus: "No disponible en preview",
      alerts: ["No ingreses saldos ni datos financieros en esta vista pública temporal."]
    },
    activityEvents: [{
      id: uid("activity"), projectId: "project-bitacora", source: "system", type: "PREVIEW",
      title: "Vista móvil temporal", summary: "Build sanitizado para validar diseño y PWA sin información sensible.",
      sourceUrl: "preview://runtime", occurredAt: createdAt
    }],
    connections: [
      { id: "local", provider: "Almacenamiento del navegador", status: "ready", lastSyncAt: createdAt, lastError: "" },
      { id: "github", provider: "GitHub", status: "planned", lastSyncAt: null, lastError: "" },
      { id: "drive", provider: "Google Drive", status: "planned", lastSyncAt: null, lastError: "" },
      { id: "calendar", provider: "Google Calendar", status: "planned", lastSyncAt: null, lastError: "" }
    ]
  };
}
