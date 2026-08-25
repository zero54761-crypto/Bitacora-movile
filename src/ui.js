import { candidateDisplayValue, hasMinimumDecisions } from "./discovery.js";
import { escapeHtml, formatDate, formatDateTime, formatTime, serializeCandidateValue, sortByDate, toDateTimeLocal, todayKey } from "./utils.js";

const doorMeta = {
  today: { label: "Hoy", icon: "◉" },
  projects: { label: "Proyectos", icon: "▦" },
  attention: { label: "Decisiones", icon: "!" },
  calendar: { label: "Calendario", icon: "◇" },
  more: { label: "Más", icon: "•••" }
};

const defaultAreas = ["Vida", "Trabajo", "Finanzas", "Proyectos", "Aprendizaje"];

function badge(text, kind = "info") {
  return `<span class="badge ${escapeHtml(kind.toLowerCase())}">${escapeHtml(text)}</span>`;
}
function emptyState(title, detail = "") {
  return `<div class="empty-state"><div><strong>${escapeHtml(title)}</strong>${detail ? `<p>${escapeHtml(detail)}</p>` : ""}</div></div>`;
}
function doorHeader(title, subtitle, action = "") {
  return `<div class="door-header"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div>${action}</div>`;
}
function navButton(key, current) {
  const meta = doorMeta[key];
  return `<button class="nav-button ${current === key ? "active" : ""}" data-action="nav" data-door="${key}" aria-current="${current === key ? "page" : "false"}"><span class="nav-icon" aria-hidden="true">${meta.icon}</span><span>${meta.label}</span></button>`;
}
function initials(name) {
  const parts = String(name || "B").trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map(part => part[0]?.toUpperCase()).join("") || "B";
}
function profileAreas(state) {
  const areas = Array.isArray(state.profile.ecosystem) ? state.profile.ecosystem.filter(Boolean) : [];
  return areas.length ? areas : defaultAreas;
}

export function renderApp(state, ui) {
  const profile = state.profile;
  return `
    <div class="app-shell">
      <header class="topbar">
        <div class="identity"><div class="avatar" aria-label="Iniciales del perfil">${escapeHtml(initials(profile.displayName))}</div><div class="identity-copy"><p class="eyebrow">${escapeHtml(profile.productName)}</p><h1>${escapeHtml(profile.displayName)}</h1></div></div>
        <span class="local-badge" title="Tus datos se guardan en este dispositivo">Local</span>
      </header>
      <main class="app-main" id="main-content">${renderDoor(state, ui)}</main>
      <nav class="bottom-nav" aria-label="Navegación principal">${navButton("today", ui.currentDoor)}${navButton("projects", ui.currentDoor)}${navButton("attention", ui.currentDoor)}${navButton("calendar", ui.currentDoor)}${navButton("more", ui.currentDoor)}</nav>
    </div>
    ${!state.discovery.receipt && ui.discoveryOpen ? renderOnboarding(state, ui) : ""}
    ${ui.modal ? renderModal(state, ui) : ""}
    ${ui.toast ? `<div class="toast-region" role="status"><div class="toast">${escapeHtml(ui.toast)}</div></div>` : ""}`;
}

function renderDoor(state, ui) {
  switch (ui.currentDoor) {
    case "today": return renderToday(state);
    case "projects": return renderProjects(state);
    case "attention": return renderAttention(state);
    case "calendar": return renderCalendar(state);
    case "life": return renderLife(state);
    case "finance": return renderFinance(state);
    case "ecosystem": return renderEcosystem(state);
    case "activity": return renderActivity(state);
    case "settings": return renderSettings(state);
    case "more": return renderMore();
    default: return renderToday(state);
  }
}

function renderToday(state) {
  const activeAlarms = sortByDate(state.alarms.filter(item => item.status !== "inactive"), "scheduledAt");
  const upcomingEvents = sortByDate(state.events.filter(item => item.status !== "cancelled" && new Date(item.startsAt).getTime() >= Date.now() - 3600000), "startsAt");
  const attention = state.attentionItems.filter(item => item.status === "open");
  const firstAlarm = activeAlarms[0];
  const firstEvent = upcomingEvents[0];
  const activeProject = state.projects.find(project => project.status === "ACTIVO") ?? state.projects[0];
  const areas = profileAreas(state).slice(0, 5).join(" · ");
  return `<section class="door-view today-layout" aria-labelledby="today-title">
    <div class="hero-card"><div><span class="focus-label">Foco de hoy</span><h2 id="today-title">${escapeHtml(state.profile.focusOfDay)}</h2><p>${escapeHtml(state.profile.priorityAction)}</p></div><div class="energy-orb" title="Energía actual">${escapeHtml(state.profile.energy)}/10</div></div>
    <div class="quick-row" aria-label="Acciones rápidas"><button class="quick-button" data-action="open-modal" data-modal="life">＋ Check-in</button><button class="quick-button" data-action="open-modal" data-modal="alarm">＋ Alarma</button><button class="quick-button" data-action="open-modal" data-modal="event">＋ Evento</button></div>
    <div class="today-grid">
      <button class="door-button attention" data-action="open-door" data-door="attention"><strong>Necesita de mí · ${attention.length}</strong><span>${attention[0] ? escapeHtml(attention[0].title) : "Sin decisiones pendientes"}</span></button>
      <button class="door-button" data-action="open-door" data-door="projects"><strong>${escapeHtml(activeProject?.name ?? "Proyectos")}</strong><span>${escapeHtml(activeProject?.nextAction ?? "Abrir proyectos")}</span></button>
      <button class="door-button" data-action="open-door" data-door="calendar"><strong>${firstEvent ? formatTime(firstEvent.startsAt) : "Sin evento"}</strong><span>${firstEvent ? escapeHtml(firstEvent.title) : "Calendario libre"}</span></button>
      <button class="door-button" data-action="open-door" data-door="calendar"><strong>${firstAlarm ? formatTime(firstAlarm.scheduledAt) : "Sin alarma"}</strong><span>${firstAlarm ? escapeHtml(firstAlarm.title) : "No hay alarmas activas"}</span></button>
      <button class="door-button" data-action="open-door" data-door="life"><strong>Vida · ${state.profile.focus}/10 foco</strong><span>${state.lifeCheckins.length ? "Último check-in registrado" : "Registrar estado personal"}</span></button>
      <button class="door-button" data-action="open-door" data-door="ecosystem"><strong>Áreas</strong><span>${escapeHtml(areas)}</span></button>
    </div>
  </section>`;
}

function projectStatusKind(status) {
  if (status === "ACTIVO" || status === "OPERACIÓN") return "active";
  if (status === "BLOQUEADO") return "blocked";
  if (status === "EN REVISIÓN") return "review";
  return "info";
}
function gateKind(status) {
  if (status === "PASS") return "pass";
  if (status === "FAIL") return "fail";
  if (status === "BLOCKED") return "blocked";
  return "pending";
}

function renderProjects(state) {
  const cards = state.projects.map(project => `<article class="list-card">
    <div class="list-card-top"><div><h3>${escapeHtml(project.name)}</h3><p>${escapeHtml(project.category)}</p></div>${badge(project.status, projectStatusKind(project.status))}</div>
    <p><strong>Objetivo:</strong> ${escapeHtml(project.objective)}</p><p><strong>Siguiente:</strong> ${escapeHtml(project.nextAction)}</p><p><strong>Bloqueo:</strong> ${escapeHtml(project.blocker)}</p>
    <div class="gates" aria-label="Gates del proyecto">${project.gates.map(gate => badge(`${gate.code} · ${gate.status}`, gateKind(gate.status))).join("")}</div>
    <div class="actions"><button class="button ghost" data-action="show-project" data-id="${escapeHtml(project.id)}">Ver ficha</button></div>
  </article>`).join("");
  return `<section class="door-view">${doorHeader("Proyectos", "Objetivo, siguiente acción, bloqueo y evidencia de cierre.")}<div class="panel-scroll"><div class="notice">Registra solo proyectos que realmente quieras dirigir desde esta Bitácora.</div><div class="section-title">Proyectos registrados</div><div class="list">${cards}</div></div></section>`;
}

function urgencyKind(urgency) { return urgency === "high" ? "urgent" : urgency === "medium" ? "pending" : "info"; }
function renderAttention(state) {
  const open = state.attentionItems.filter(item => item.status === "open");
  const resolved = state.attentionItems.filter(item => item.status === "resolved");
  const openCards = open.map(item => `<article class="list-card"><div class="list-card-top"><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.area)}</p></div>${badge(item.urgency === "high" ? "Urgente" : item.urgency === "medium" ? "Importante" : "Normal", urgencyKind(item.urgency))}</div><p><strong>Por qué:</strong> ${escapeHtml(item.reason)}</p><p><strong>Impacto:</strong> ${escapeHtml(item.impact)}</p><div class="actions">${item.sourceUrl === "local://profile-discovery" ? `<button class="button primary" data-action="rerun-discovery">Revisar mi perfil</button>` : ""}<button class="button" data-action="resolve-attention" data-id="${escapeHtml(item.id)}">Marcar resuelto</button></div></article>`).join("");
  const resolvedCards = resolved.slice(0, 5).map(item => `<article class="list-card"><div class="list-card-top"><h4>${escapeHtml(item.title)}</h4>${badge("Resuelto", "resolved")}</div><p>${escapeHtml(item.area)}</p></article>`).join("");
  return `<section class="door-view">${doorHeader("Necesita de mí", "Solo decisiones y acciones que realmente dependen de ti.")}<div class="panel-scroll">${open.length ? `<div class="list">${openCards}</div>` : emptyState("Nada requiere tu intervención", "Bitácora mostrará aquí solo dependencias reales.")}${resolved.length ? `<div class="section-title">Resueltos recientemente</div><div class="list">${resolvedCards}</div>` : ""}</div></section>`;
}

function renderAlarmCard(alarm) {
  return `<article class="list-card"><div class="list-card-top"><div><h4>${escapeHtml(alarm.title)}</h4><p>${formatDateTime(alarm.scheduledAt)} · ${escapeHtml(alarm.area)}</p></div>${badge(alarm.status === "active" ? "Activa" : alarm.status === "snoozed" ? "Pospuesta" : "Inactiva", alarm.status)}</div><div class="actions"><button class="button" data-action="edit-alarm" data-id="${escapeHtml(alarm.id)}">Editar</button><button class="button" data-action="toggle-alarm" data-id="${escapeHtml(alarm.id)}">${alarm.status === "inactive" ? "Activar" : "Desactivar"}</button><button class="button" data-action="snooze-alarm" data-id="${escapeHtml(alarm.id)}">+10 min</button><button class="button danger" data-action="delete-alarm" data-id="${escapeHtml(alarm.id)}">Eliminar</button></div></article>`;
}
function renderEventCard(event) {
  return `<article class="list-card"><div class="list-card-top"><div><h4>${escapeHtml(event.title)}</h4><p>${formatDateTime(event.startsAt)} · ${escapeHtml(event.area)}</p></div>${badge(event.priority === "high" ? "Alta" : event.priority === "low" ? "Baja" : "Media", event.priority === "high" ? "urgent" : "info")}</div>${event.notes ? `<p>${escapeHtml(event.notes)}</p>` : ""}<div class="actions"><button class="button" data-action="edit-event" data-id="${escapeHtml(event.id)}">Editar</button><button class="button danger" data-action="delete-event" data-id="${escapeHtml(event.id)}">Eliminar</button></div></article>`;
}
function renderCalendar(state) {
  const today = todayKey();
  const alarms = sortByDate(state.alarms, "scheduledAt");
  const events = sortByDate(state.events, "startsAt");
  const todayEvents = events.filter(event => todayKey(event.startsAt) === today);
  const futureEvents = events.filter(event => todayKey(event.startsAt) !== today);
  return `<section class="door-view">${doorHeader("Calendario y alarmas", "Datos guardados únicamente en este dispositivo.", `<div class="actions"><button class="icon-button" data-action="open-modal" data-modal="alarm" aria-label="Nueva alarma">⏰</button><button class="icon-button" data-action="open-modal" data-modal="event" aria-label="Nuevo evento">＋</button></div>`)}<div class="panel-scroll"><div class="notice warning">Las alarmas viven dentro de Bitácora. Los eventos se pueden exportar al calendario del teléfono.</div><div class="section-title">Hoy</div>${todayEvents.length ? `<div class="list">${todayEvents.map(renderEventCard).join("")}</div>` : emptyState("Sin eventos para hoy")}<div class="section-title">Próximos eventos</div>${futureEvents.length ? `<div class="list">${futureEvents.map(renderEventCard).join("")}</div>` : emptyState("Sin eventos próximos")}<div class="section-title">Alarmas</div>${alarms.length ? `<div class="list">${alarms.map(renderAlarmCard).join("")}</div>` : emptyState("Sin alarmas")}</div></section>`;
}

function renderLife(state) {
  const latest = state.lifeCheckins[0];
  const recent = state.lifeCheckins.slice(0, 7).map(checkin => `<article class="list-card"><div class="list-card-top"><h4>${formatDate(checkin.date, { includeYear: true })}</h4>${badge(`Energía ${checkin.energy}/10`, "info")}</div><p>Foco ${checkin.focus}/10 · Sueño ${checkin.sleep}/10 · Disciplina ${checkin.discipline}/10</p>${checkin.personalPriority ? `<p><strong>Prioridad:</strong> ${escapeHtml(checkin.personalPriority)}</p>` : ""}${checkin.note ? `<p>${escapeHtml(checkin.note)}</p>` : ""}</article>`).join("");
  return `<section class="door-view">${doorHeader("Vida", "Pocos indicadores accionables, no métricas infinitas.", `<button class="button primary" data-action="open-modal" data-modal="life">Nuevo check-in</button>`)}<div class="panel-scroll"><div class="metrics-grid"><div class="metric-card"><span>Energía</span><strong>${latest?.energy ?? state.profile.energy}/10</strong></div><div class="metric-card"><span>Foco</span><strong>${latest?.focus ?? state.profile.focus}/10</strong></div><div class="metric-card"><span>Sueño</span><strong>${latest?.sleep ?? "Sin dato"}</strong></div><div class="metric-card"><span>Movimiento</span><strong>${latest?.movement ?? "Sin dato"}</strong></div><div class="metric-card"><span>Disciplina</span><strong>${latest?.discipline ?? "Sin dato"}</strong></div><div class="metric-card"><span>Aprendizaje</span><strong>${latest?.learning ?? "Sin dato"}</strong></div></div><div class="section-title">Historial local</div>${recent ? `<div class="list">${recent}</div>` : emptyState("Aún no hay check-ins")}</div></section>`;
}

function renderFinance(state) {
  return `<section class="door-view">${doorHeader("Finanzas", "Control básico local; sin cuentas bancarias conectadas.")}<div class="panel-scroll"><div class="notice warning">Registra únicamente la información que quieras conservar en este dispositivo. No guardes contraseñas bancarias.</div><div class="metrics-grid" style="margin-top:10px"><div class="metric-card"><span>Liquidez</span><strong>${escapeHtml(state.finance.liquidityStatus)}</strong></div><div class="metric-card"><span>Obligaciones registradas</span><strong>${escapeHtml(state.finance.obligationsCount)}</strong></div><div class="metric-card"><span>Capital de proyectos</span><strong>${escapeHtml(state.finance.projectCapitalStatus)}</strong></div></div><div class="section-title">Alertas</div><div class="list">${state.finance.alerts.map(alert => `<div class="list-card"><p>${escapeHtml(alert)}</p></div>`).join("")}</div></div></section>`;
}

function renderEcosystem(state) {
  const areas = profileAreas(state).slice(0, 8);
  return `<section class="door-view">${doorHeader("Áreas", "Organiza las partes de tu vida sin mezclarlas.")}<div class="panel-scroll"><div class="notice">Cada área funciona como una puerta de contexto. Tú decides qué registrar y qué mantener fuera de Bitácora.</div><div class="ecosystem-grid" style="margin-top:10px">${areas.map((name, index) => `<article class="mini-card"><span>Área ${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(name)}</strong><p class="muted">Define prioridades, decisiones y evidencia de esta área.</p><button class="button ghost" data-action="ecosystem-placeholder" data-name="${escapeHtml(name)}">Abrir contexto</button></article>`).join("")}</div></div></section>`;
}
function renderActivity(state) {
  const events = [...state.activityEvents].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 30);
  return `<section class="door-view">${doorHeader("Actividad", "Evidencia local de decisiones, eventos y cambios de estado.")}<div class="panel-scroll">${events.length ? `<div class="list">${events.map(event => `<article class="list-card"><div class="list-card-top"><div><h4>${escapeHtml(event.title)}</h4><p>${formatDateTime(event.occurredAt)}</p></div>${badge(event.type, "info")}</div><p>${escapeHtml(event.summary)}</p><p>Fuente: ${escapeHtml(event.source)}</p></article>`).join("")}</div>` : emptyState("Sin actividad")}</div></section>`;
}
function renderMore() {
  const doors = [["life", "Vida", "Energía, foco, rutina y check-ins."], ["finance", "Finanzas", "Control básico sin contraseñas bancarias."], ["ecosystem", "Áreas", "Vida, trabajo, finanzas, proyectos y aprendizaje."], ["activity", "Actividad", "Timeline de evidencia y decisiones."], ["settings", "Configuración", "Privacidad, Conocerme, respaldo y datos locales."]];
  return `<section class="door-view">${doorHeader("Más", "Puertas secundarias de Bitácora Personal.")}<div class="panel-scroll"><div class="more-grid">${doors.map(([key, title, description]) => `<button class="door-button" data-action="open-door" data-door="${key}"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(description)}</span></button>`).join("")}</div></div></section>`;
}
function renderSettings(state) {
  const receipt = state.discovery.receipt;
  return `<section class="door-view">${doorHeader("Configuración", "Privacidad, perfil, respaldo y datos del dispositivo.")}<div class="panel-scroll"><div class="card"><h3>Datos locales</h3><p>Bitácora guarda la información en este navegador y puede funcionar sin una cuenta remota.</p><div class="gates">${badge("Solo este dispositivo", "pass")}${badge("Sin cuenta obligatoria", "pass")}${badge("PWA instalable", "pass")}</div></div><div class="card"><h3>Conocerme</h3><p>${receipt ? `Configuración personal completada el ${formatDateTime(receipt.completedAt)}. Puedes repetirla manualmente.` : "La configuración inicial está pendiente."}</p><div class="actions"><button class="button primary" data-action="rerun-discovery">${receipt ? "Editar mi perfil" : "Conocerme"}</button></div></div><div class="card"><h3>Restablecer</h3><p>Restablecer elimina alarmas, eventos, proyectos, check-ins y preferencias de este navegador.</p><div class="actions"><button class="button danger" data-action="reset-app">Restablecer Bitácora local</button></div></div><div class="card"><h3>Sincronización futura</h3><p>Una edición posterior podrá añadir cuentas y sincronización privada sin cambiar la base local-first.</p></div></div></section>`;
}

function renderOnboarding(state, ui) {
  const step = ui.discoveryStep;
  const index = step === "welcome" ? 1 : step === "consent" ? 2 : step === "review" ? 3 : 4;
  const steps = [1, 2, 3, 4].map(number => `<span class="${number <= index ? "active" : ""}"></span>`).join("");
  let body = "";
  let footer = "";
  if (step === "welcome") {
    body = `<div class="onboarding-logo">B</div><p class="eyebrow">Primera configuración</p><h2>Crea una Bitácora que se adapte a ti.</h2><p class="muted">Revisa ejemplos editables y decide qué información quieres guardar en este dispositivo.</p><div class="notice">No se consulta ninguna cuenta externa. Solo se guardará lo que tú apruebes.</div>`;
    footer = `<button class="button ghost" data-action="discovery-manual">Configuración mínima</button><button class="button primary" data-action="discovery-next" data-step="consent">Conocerme</button>`;
  } else if (step === "consent") {
    body = `<h2>Autoriza las categorías</h2><p class="muted">Bitácora propondrá únicamente ejemplos útiles para personalizar tu espacio.</p><div class="card"><h3>Puedes guardar</h3><p>Nombre, ubicación general, idiomas, trabajo, fortalezas, objetivos, principios, preferencias y áreas de vida.</p></div><div class="card"><h3>No debes guardar aquí</h3><p>Contraseñas, tokens, credenciales bancarias, documentos de identidad, direcciones exactas ni datos sensibles de terceros.</p></div><label class="notice"><input type="checkbox" id="discovery-consent" ${ui.discoveryConsent ? "checked" : ""} /> Autorizo esta configuración local y entiendo que nada se guardará sin mi confirmación.</label>`;
    footer = `<button class="button ghost" data-action="discovery-next" data-step="welcome">Atrás</button><button class="button primary" data-action="discovery-next" data-step="review" ${ui.discoveryConsent ? "" : "disabled"}>Continuar</button>`;
  } else if (step === "review") {
    const candidates = state.discovery.candidates;
    body = `<h2>Revisa cada propuesta</h2><p class="muted">Selecciona aceptar, editar o rechazar. Solo se guardará lo aprobado.</p><div class="notice">Los valores son ejemplos editables; no provienen de cuentas externas.</div><div class="candidate-list" style="margin-top:10px">${candidates.map(candidate => `<article class="candidate ${candidate.decision}"><div class="candidate-top"><div><h3>${escapeHtml(candidate.category)}</h3><p>${escapeHtml(candidate.sourceLabel)}</p></div>${badge(candidate.confidence, candidate.confidence === "CONFIRMADO" ? "pass" : candidate.confidence === "REVISAR" ? "pending" : "info")}</div><p class="candidate-value">${escapeHtml(candidateDisplayValue(candidate))}</p>${candidate.decision === "edited" ? `<div class="field" style="margin-top:8px"><label for="candidate-${escapeHtml(candidate.key)}">Valor editado</label><input id="candidate-${escapeHtml(candidate.key)}" data-candidate-input="${escapeHtml(candidate.key)}" value="${escapeHtml(serializeCandidateValue(candidate.editedValue))}" /></div>` : ""}<div class="candidate-actions"><button data-action="candidate-decision" data-key="${escapeHtml(candidate.key)}" data-decision="accepted">Aceptar</button><button data-action="candidate-decision" data-key="${escapeHtml(candidate.key)}" data-decision="edited">Editar</button><button data-action="candidate-decision" data-key="${escapeHtml(candidate.key)}" data-decision="rejected">Rechazar</button></div></article>`).join("")}</div>`;
    footer = `<button class="button ghost" data-action="discovery-next" data-step="consent">Atrás</button><button class="button primary" data-action="discovery-next" data-step="confirm" ${hasMinimumDecisions(candidates) ? "" : "disabled"}>Revisar guardado</button>`;
  } else {
    const accepted = state.discovery.candidates.filter(candidate => candidate.decision === "accepted" || candidate.decision === "edited");
    const rejected = state.discovery.candidates.filter(candidate => candidate.decision === "rejected");
    const pending = state.discovery.candidates.filter(candidate => candidate.decision === "pending");
    body = `<h2>Confirma tu perfil</h2><p class="muted">Bitácora guardará solo los ${accepted.length} campos aprobados.</p><div class="metrics-grid"><div class="metric-card"><span>Aceptados/editados</span><strong>${accepted.length}</strong></div><div class="metric-card"><span>Rechazados</span><strong>${rejected.length}</strong></div><div class="metric-card"><span>Pendientes omitidos</span><strong>${pending.length}</strong></div></div><div class="section-title">Se guardará</div><div class="list">${accepted.map(candidate => `<div class="list-card"><strong>${escapeHtml(candidate.category)}</strong><p>${escapeHtml(candidateDisplayValue(candidate))}</p></div>`).join("")}</div>`;
    footer = `<button class="button ghost" data-action="discovery-next" data-step="review">Atrás</button><button class="button gold" data-action="discovery-confirm">Confirmar mi perfil</button>`;
  }
  return `<div class="onboarding-backdrop" role="dialog" aria-modal="true" aria-labelledby="onboarding-title"><section class="onboarding"><header class="onboarding-header"><p class="eyebrow">Bitácora Personal</p><div class="stepper" aria-hidden="true">${steps}</div></header><div class="onboarding-body" id="onboarding-title">${body}</div><footer class="onboarding-footer">${footer}</footer></section></div>`;
}

function renderModal(state, ui) {
  if (ui.modal.type === "alarm") return renderAlarmModal(state, ui.modal.id);
  if (ui.modal.type === "event") return renderEventModal(state, ui.modal.id);
  if (ui.modal.type === "life") return renderLifeModal();
  if (ui.modal.type === "project") return renderProjectModal(state, ui.modal.id);
  return "";
}
function modalShell(title, body, footer = "") {
  return `<div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title"><section class="modal"><header class="modal-header"><div class="list-card-top"><h2 id="modal-title">${escapeHtml(title)}</h2><button class="icon-button" data-action="close-modal" aria-label="Cerrar">×</button></div></header><div class="modal-body">${body}</div>${footer ? `<footer class="modal-footer">${footer}</footer>` : ""}</section></div>`;
}
function projectOptions(state, selectedId) {
  return `<option value="">Sin proyecto</option>${state.projects.map(project => `<option value="${escapeHtml(project.id)}" ${project.id === selectedId ? "selected" : ""}>${escapeHtml(project.name)}</option>`).join("")}`;
}
function renderAlarmModal(state, id) {
  const alarm = state.alarms.find(item => item.id === id);
  const body = `<form id="alarm-form" class="form-grid"><input type="hidden" name="id" value="${escapeHtml(alarm?.id ?? "")}" /><div class="field"><label for="alarm-title">Título</label><input id="alarm-title" name="title" required maxlength="90" value="${escapeHtml(alarm?.title ?? "")}" /></div><div class="field"><label for="alarm-time">Fecha y hora</label><input id="alarm-time" type="datetime-local" name="scheduledAt" required value="${escapeHtml(toDateTimeLocal(alarm?.scheduledAt))}" /></div><div class="field"><label for="alarm-recurrence">Repetición</label><select id="alarm-recurrence" name="recurrence"><option value="none" ${alarm?.recurrence === "none" ? "selected" : ""}>No repetir</option><option value="daily" ${alarm?.recurrence === "daily" ? "selected" : ""}>Diaria</option><option value="weekly" ${alarm?.recurrence === "weekly" ? "selected" : ""}>Semanal</option></select></div><div class="field"><label for="alarm-area">Área</label><input id="alarm-area" name="area" maxlength="60" value="${escapeHtml(alarm?.area ?? "Personal")}" /></div><div class="field"><label for="alarm-project">Proyecto</label><select id="alarm-project" name="projectId">${projectOptions(state, alarm?.projectId)}</select></div></form>`;
  return modalShell(alarm ? "Editar alarma" : "Nueva alarma", body, `<button class="button ghost" data-action="close-modal">Cancelar</button><button class="button primary" data-action="submit-form" data-form="alarm-form">Guardar alarma</button>`);
}
function renderEventModal(state, id) {
  const event = state.events.find(item => item.id === id);
  const body = `<form id="event-form" class="form-grid"><input type="hidden" name="id" value="${escapeHtml(event?.id ?? "")}" /><div class="field"><label for="event-title">Título</label><input id="event-title" name="title" required maxlength="100" value="${escapeHtml(event?.title ?? "")}" /></div><div class="field"><label for="event-start">Inicio</label><input id="event-start" type="datetime-local" name="startsAt" required value="${escapeHtml(toDateTimeLocal(event?.startsAt))}" /></div><div class="field"><label for="event-end">Fin opcional</label><input id="event-end" type="datetime-local" name="endsAt" value="${event?.endsAt ? escapeHtml(toDateTimeLocal(event.endsAt)) : ""}" /></div><div class="field"><label for="event-type">Tipo</label><input id="event-type" name="type" maxlength="50" value="${escapeHtml(event?.type ?? "Evento")}" /></div><div class="field"><label for="event-area">Área</label><input id="event-area" name="area" maxlength="60" value="${escapeHtml(event?.area ?? "Personal")}" /></div><div class="field"><label for="event-project">Proyecto</label><select id="event-project" name="projectId">${projectOptions(state, event?.projectId)}</select></div><div class="field"><label for="event-priority">Prioridad</label><select id="event-priority" name="priority"><option value="low" ${event?.priority === "low" ? "selected" : ""}>Baja</option><option value="medium" ${!event || event?.priority === "medium" ? "selected" : ""}>Media</option><option value="high" ${event?.priority === "high" ? "selected" : ""}>Alta</option></select></div><div class="field"><label for="event-notes">Notas</label><textarea id="event-notes" name="notes" maxlength="500">${escapeHtml(event?.notes ?? "")}</textarea></div></form>`;
  return modalShell(event ? "Editar evento" : "Nuevo evento", body, `<button class="button ghost" data-action="close-modal">Cancelar</button><button class="button primary" data-action="submit-form" data-form="event-form">Guardar evento</button>`);
}
function rangeField(name, label, value) {
  return `<div class="range-row"><label for="life-${name}">${escapeHtml(label)}</label><input id="life-${name}" type="range" name="${name}" min="1" max="10" value="${value}" data-range-output="${name}" /><output id="out-${name}">${value}</output></div>`;
}
function renderLifeModal() {
  const body = `<form id="life-form" class="form-grid">${rangeField("energy", "Energía", 6)}${rangeField("focus", "Foco", 7)}${rangeField("sleep", "Sueño", 6)}${rangeField("movement", "Movimiento", 5)}${rangeField("discipline", "Disciplina", 7)}${rangeField("learning", "Aprendizaje", 6)}<div class="field"><label for="life-priority">Prioridad personal</label><input id="life-priority" name="personalPriority" maxlength="120" placeholder="¿Qué importa más hoy?" /></div><div class="field"><label for="life-note">Nota</label><textarea id="life-note" name="note" maxlength="500" placeholder="Algo que deba recordar"></textarea></div></form>`;
  return modalShell("Check-in de vida", body, `<button class="button ghost" data-action="close-modal">Cancelar</button><button class="button primary" data-action="submit-form" data-form="life-form">Guardar check-in</button>`);
}
function renderProjectModal(state, id) {
  const project = state.projects.find(item => item.id === id);
  if (!project) return "";
  const body = `<div class="card"><p class="eyebrow">${escapeHtml(project.category)}</p><h3>${escapeHtml(project.name)}</h3><p><strong>Estado:</strong> ${escapeHtml(project.status)}</p><p><strong>Objetivo:</strong> ${escapeHtml(project.objective)}</p><p><strong>Siguiente acción:</strong> ${escapeHtml(project.nextAction)}</p><p><strong>Bloqueo:</strong> ${escapeHtml(project.blocker)}</p><p><strong>Responsable:</strong> ${escapeHtml(project.owner)}</p><p><strong>Fuente:</strong> ${escapeHtml(project.sourceOfTruth)}</p><div class="section-title">Gates</div><div class="list">${project.gates.map(gate => `<div class="list-card"><div class="list-card-top"><strong>${escapeHtml(gate.code)} · ${escapeHtml(gate.title)}</strong>${badge(gate.status, gateKind(gate.status))}</div></div>`).join("")}</div></div>`;
  return modalShell(project.name, body, `<button class="button primary" data-action="close-modal">Cerrar</button>`);
}
