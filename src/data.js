import { deepClone, uid } from "./utils.js";

const profileCandidateTemplate = [
  {
    key: "displayName",
    category: "Nombre",
    proposedValue: "Tu nombre",
    sourceLabel: "Se completa en este dispositivo",
    confidence: "REVISAR"
  },
  {
    key: "productInstance",
    category: "Nombre de tu espacio",
    proposedValue: "Mi Bitácora",
    sourceLabel: "Configuración personal",
    confidence: "REVISAR"
  },
  {
    key: "locationGeneral",
    category: "Ubicación general",
    proposedValue: "Capturar en este dispositivo",
    sourceLabel: "No se publica ni se sincroniza",
    confidence: "REVISAR"
  },
  {
    key: "languages",
    category: "Idiomas",
    proposedValue: ["Capturar en este dispositivo"],
    sourceLabel: "Preferencias personales",
    confidence: "REVISAR"
  },
  {
    key: "currentWork",
    category: "Trabajo o actividad principal",
    proposedValue: "Capturar en este dispositivo",
    sourceLabel: "Contexto opcional",
    confidence: "REVISAR"
  },
  {
    key: "builderProfile",
    category: "Fortalezas",
    proposedValue: "Organización, aprendizaje y ejecución",
    sourceLabel: "Ejemplo editable",
    confidence: "REVISAR"
  },
  {
    key: "ecosystemRole",
    category: "Rol personal",
    proposedValue: "Dirigir mi vida y mis proyectos",
    sourceLabel: "Ejemplo editable",
    confidence: "REVISAR"
  },
  {
    key: "goals",
    category: "Objetivos",
    proposedValue: [
      "Organizar mis prioridades",
      "Terminar lo importante",
      "Proteger mi tiempo y energía"
    ],
    sourceLabel: "Ejemplos editables",
    confidence: "REVISAR"
  },
  {
    key: "principles",
    category: "Principios",
    proposedValue: [
      "Máximo tres prioridades activas",
      "Todo avance deja evidencia",
      "Primero ejecutar; después automatizar"
    ],
    sourceLabel: "Principios sugeridos",
    confidence: "REVISAR"
  },
  {
    key: "preferences",
    category: "Preferencias de Bitácora",
    proposedValue: [
      "Mobile-first",
      "Datos locales",
      "Diseño por puertas",
      "Respaldo manual"
    ],
    sourceLabel: "Configuración recomendada",
    confidence: "REVISAR"
  },
  {
    key: "ecosystem",
    category: "Áreas de mi vida",
    proposedValue: ["Vida", "Trabajo", "Finanzas", "Proyectos", "Aprendizaje"],
    sourceLabel: "Áreas sugeridas",
    confidence: "REVISAR"
  }
];

export function createProfileCandidates() {
  return deepClone(profileCandidateTemplate).map(candidate => ({
    ...candidate,
    decision: "pending",
    editedValue: undefined
  }));
}

export function createDefaultState() {
  const createdAt = new Date().toISOString();
  return {
    meta: {
      schemaVersion: 1,
      edition: "bitacora-personal",
      createdAt,
      updatedAt: createdAt,
      runtimeMode: "personal-local-first"
    },
    profile: {
      displayName: "Tu nombre",
      productName: "Bitácora Personal",
      instanceName: "Mi Bitácora",
      locationGeneral: "",
      languages: [],
      currentWork: "",
      builderProfile: "",
      ecosystemRole: "",
      photoUrl: null,
      energy: 6,
      focus: 6,
      focusOfDay: "Elige tu resultado decisivo",
      priorityAction: "Completa Conocerme y define tu siguiente acción física",
      goals: [],
      principles: [],
      preferences: [],
      ecosystem: []
    },
    discovery: {
      receipt: null,
      candidates: createProfileCandidates()
    },
    alarms: [],
    events: [],
    lifeCheckins: [],
    quickCaptures: [],
    projects: [
      {
        id: "project-first",
        name: "Mi primer proyecto",
        category: "Proyecto personal",
        status: "EN REVISIÓN",
        objective: "Convertir una meta en un resultado verificable.",
        nextAction: "Define una acción que puedas terminar en menos de 60 minutos.",
        blocker: "Falta personalizar el objetivo y la evidencia de cierre.",
        owner: "Tú",
        sourceOfTruth: "Esta Bitácora",
        needsOwner: true,
        gates: [
          { id: uid("gate"), code: "OBJ", title: "Objetivo definido", status: "PENDING", evidenceUrl: "" },
          { id: uid("gate"), code: "ACT", title: "Siguiente acción definida", status: "PENDING", evidenceUrl: "" },
          { id: uid("gate"), code: "EVI", title: "Evidencia producida", status: "PENDING", evidenceUrl: "" }
        ]
      }
    ],
    attentionItems: [
      {
        id: uid("attention"),
        projectId: "project-first",
        area: "Configuración",
        title: "Completar Conocerme",
        reason: "Bitácora necesita únicamente la información que tú decidas aprobar.",
        impact: "Personaliza el nombre, las áreas y los objetivos de tu espacio.",
        urgency: "medium",
        status: "open",
        sourceUrl: "local://profile-discovery",
        createdAt
      }
    ],
    finance: {
      liquidityStatus: "Sin registrar",
      obligationsCount: 0,
      projectCapitalStatus: "Sin registrar",
      alerts: ["Registra solo la información financiera que quieras conservar en este dispositivo."]
    },
    activityEvents: [
      {
        id: uid("activity"),
        projectId: "project-first",
        source: "system",
        type: "START",
        title: "Bitácora Personal creada",
        summary: "Espacio local listo para personalizar.",
        sourceUrl: "local://welcome",
        occurredAt: createdAt
      }
    ],
    connections: [
      { id: "local", provider: "Almacenamiento del dispositivo", status: "ready", lastSyncAt: createdAt, lastError: "" },
      { id: "calendar", provider: "Calendario del dispositivo", status: "manual-export", lastSyncAt: null, lastError: "" },
      { id: "cloud", provider: "Sincronización privada", status: "future", lastSyncAt: null, lastError: "" }
    ]
  };
}
