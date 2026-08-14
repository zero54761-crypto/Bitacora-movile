const privateHosts = ["127.0.0.1", "localhost", "appassets.androidplatform.net"];
const isPrivateRuntime = privateHosts.includes(window.location.hostname);

if (!isPrivateRuntime) {
  const style = document.createElement("style");
  style.textContent = `
    .preview-mobile-banner {
      position: fixed;
      z-index: 300;
      left: 50%;
      bottom: calc(72px + env(safe-area-inset-bottom, 0px));
      transform: translateX(-50%);
      width: min(92vw, 460px);
      padding: 9px 12px;
      border: 1px solid rgba(255, 203, 103, .3);
      border-radius: 14px;
      background: rgba(13, 15, 24, .96);
      color: #ffe6b5;
      box-shadow: 0 16px 40px rgba(0,0,0,.38);
      font: 700 .72rem/1.35 system-ui, sans-serif;
      text-align: center;
      pointer-events: none;
    }
    @media (min-width: 720px) {
      .preview-mobile-banner { bottom: 18px; }
    }
  `;
  document.head.append(style);

  window.addEventListener("DOMContentLoaded", () => {
    const badge = document.querySelector(".local-badge");
    if (badge) {
      badge.textContent = "Preview móvil";
      badge.title = "Vista temporal por HTTPS. No ingreses información sensible.";
    }

    const banner = document.createElement("div");
    banner.className = "preview-mobile-banner";
    banner.textContent = "Vista temporal móvil · No ingreses contraseñas, saldos, documentos ni datos sensibles";
    document.body.append(banner);
    window.setTimeout(() => banner.remove(), 9000);
  });
}
