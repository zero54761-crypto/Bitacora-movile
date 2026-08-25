const NOTICE_KEY = "bitacora.personal.privacy-notice.v1";

function patchLocalBadge() {
  const badge = document.querySelector(".local-badge");
  if (!badge) return;
  if (badge.textContent !== "Local") badge.textContent = "Local";
  badge.title = "Tus datos se guardan en este dispositivo.";
}

function showPrivacyNoticeOnce() {
  if (sessionStorage.getItem(NOTICE_KEY) === "shown") return;
  sessionStorage.setItem(NOTICE_KEY, "shown");

  const style = document.createElement("style");
  style.textContent = `
    .personal-runtime-banner {
      position: fixed;
      z-index: 300;
      left: 50%;
      bottom: calc(72px + env(safe-area-inset-bottom, 0px));
      transform: translateX(-50%);
      width: min(92vw, 460px);
      padding: 9px 12px;
      border: 1px solid rgba(146, 119, 255, .32);
      border-radius: 14px;
      background: rgba(13, 15, 24, .96);
      color: #f0ecff;
      box-shadow: 0 16px 40px rgba(0,0,0,.38);
      font: 700 .72rem/1.35 system-ui, sans-serif;
      text-align: center;
      pointer-events: none;
    }
    @media (min-width: 720px) {
      .personal-runtime-banner { bottom: 18px; }
    }
  `;
  document.head.append(style);

  const banner = document.createElement("div");
  banner.className = "personal-runtime-banner";
  banner.textContent = "Bitácora Personal · tus datos se guardan localmente en este dispositivo";
  document.body.append(banner);
  window.setTimeout(() => banner.remove(), 6500);
}

window.addEventListener("DOMContentLoaded", () => {
  patchLocalBadge();
  showPrivacyNoticeOnce();
});

const root = document.querySelector("#app");
if (root) {
  const observer = new MutationObserver(patchLocalBadge);
  observer.observe(root, { childList: true, subtree: true });
}
