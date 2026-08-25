import { loadState } from "./state.js";

const DEFAULT_AREAS = ["Vida", "Trabajo", "Finanzas", "Proyectos", "Aprendizaje"];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setText(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}

function initials(name) {
  const parts = String(name || "B")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return parts.map(part => part[0]?.toUpperCase()).join("") || "B";
}

function patchHeader(state) {
  const avatar = document.querySelector("#app .avatar");
  setText(avatar, initials(state.profile.displayName));
  if (avatar) avatar.setAttribute("aria-label", "Iniciales del perfil");

  const badge = document.querySelector("#app .local-badge");
  setText(badge, "Local");
  if (badge) badge.title = "Tus datos se guardan en este dispositivo.";
}

function patchToday(state) {
  const button = document.querySelector('#app .door-button[data-door="ecosystem"]');
  if (!button) return;
  setText(button.querySelector("strong"), "Áreas");
  const areas = state.profile.ecosystem?.filter(Boolean) || [];
  setText(button.querySelector("span"), (areas.length ? areas : DEFAULT_AREAS).slice(0, 5).join(" · "));
}

function patchHeaders() {
  const header = document.querySelector("#app .door-header");
  const title = header?.querySelector("h2")?.textContent?.trim();
  const subtitle = header?.querySelector("p");

  if (title === "Necesita de mí") {
    setText(subtitle, "Solo decisiones y acciones que realmente dependen de ti.");
  }
  if (title === "Proyectos") {
    const notice = document.querySelector("#app .panel-scroll .notice");
    setText(notice, "Cada proyecto conserva objetivo, siguiente acción, bloqueo y evidencia de cierre.");
  }
  if (title === "Calendario y alarmas") {
    const notice = document.querySelector("#app .panel-scroll .notice.warning");
    setText(notice, "Los eventos y alarmas se guardan localmente. Puedes exportar eventos al calendario del teléfono.");
  }
  if (title === "Finanzas") {
    const notice = document.querySelector("#app .panel-scroll .notice.warning");
    setText(notice, "Registra únicamente la información que quieras conservar en este dispositivo. No guardes contraseñas bancarias.");
  }
}

function patchAreas(state) {
  const header = document.querySelector("#app .door-header");
  if (header?.querySelector("h2")?.textContent?.trim() !== "Ecosistema") return;

  setText(header.querySelector("h2"), "Áreas");
  setText(header.querySelector("p"), "Organiza las partes de tu vida sin mezclarlas.");

  const notice = document.querySelector("#app .panel-scroll .notice");
  setText(notice, "Cada área funciona como una puerta de contexto. Tú decides qué registrar y qué mantener fuera de Bitácora.");

  const areas = (state.profile.ecosystem?.filter(Boolean).length
    ? state.profile.ecosystem.filter(Boolean)
    : DEFAULT_AREAS).slice(0, 8);
  const grid = document.querySelector("#app .ecosystem-grid");
  if (!grid) return;

  const signature = areas.join("|");
  if (grid.dataset.personalSignature === signature) return;
  grid.dataset.personalSignature = signature;
  grid.innerHTML = areas.map((name, index) => `
    <article class="mini-card">
      <span>Área ${String(index + 1).padStart(2, "0")}</span>
      <strong>${escapeHtml(name)}</strong>
      <p class="muted">Define prioridades, decisiones y evidencia de esta área.</p>
      <button class="button ghost" data-action="ecosystem-placeholder" data-name="${escapeHtml(name)}">Abrir contexto</button>
    </article>
  `).join("");
}

function patchMore() {
  const buttons = [...document.querySelectorAll('#app .door-button[data-door="ecosystem"]')];
  buttons.forEach(button => {
    setText(button.querySelector("strong"), "Áreas");
    setText(button.querySelector("span"), "Vida, trabajo, finanzas, proyectos y aprendizaje.");
  });
}

function patchSettings() {
  const header = document.querySelector("#app .door-header");
  if (header?.querySelector("h2")?.textContent?.trim() !== "Configuración") return;
  setText(header.querySelector("p"), "Privacidad, perfil, respaldo y datos del dispositivo.");

  const cards = [...document.querySelectorAll("#app .panel-scroll .card")];
  cards.forEach(card => {
    const title = card.querySelector("h3")?.textContent?.trim();
    const paragraph = card.querySelector("p");
    if (title === "Ejecución local") {
      setText(paragraph, "Bitácora guarda la información en este navegador y puede funcionar sin una cuenta remota.");
    }
    if (title === "Datos locales") {
      setText(paragraph, "Restablecer elimina alarmas, eventos, proyectos, check-ins y preferencias de este navegador.");
    }
    if (title === "Despliegue futuro") {
      setText(card.querySelector("h3"), "Sincronización futura");
      setText(paragraph, "Una edición posterior podrá añadir cuentas y sincronización privada sin cambiar la base local-first.");
    }
  });
}

function patchOnboarding() {
  const onboarding = document.querySelector(".onboarding");
  if (!onboarding) return;
  setText(onboarding.querySelector(".onboarding-header .eyebrow"), "Bitácora Personal");

  const heading = onboarding.querySelector(".onboarding-body h2");
  if (heading?.textContent?.includes("conocerte")) {
    setText(heading, "Crea una Bitácora que se adapte a ti.");
    setText(
      onboarding.querySelector(".onboarding-body .muted"),
      "Revisa ejemplos editables y decide qué información quieres guardar en este dispositivo."
    );
    setText(
      onboarding.querySelector(".onboarding-body .notice"),
      "No se consulta ninguna cuenta externa. Solo se guardará lo que tú apruebes."
    );
  }

  const reviewNotice = [...onboarding.querySelectorAll(".notice")]
    .find(node => node.textContent?.includes("Contexto inicial"));
  setText(reviewNotice, "Los valores son ejemplos editables; no provienen de cuentas externas.");
}

function patchInterface() {
  const state = loadState();
  patchHeader(state);
  patchToday(state);
  patchHeaders();
  patchAreas(state);
  patchMore();
  patchSettings();
  patchOnboarding();
}

const root = document.querySelector("#app");
if (root) {
  const observer = new MutationObserver(patchInterface);
  observer.observe(root, { childList: true, subtree: true });
}

queueMicrotask(patchInterface);
window.addEventListener("focus", patchInterface);
