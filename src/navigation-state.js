const root = document.querySelector("#app");

function synchronizeSecondaryNavigation() {
  const nav = root?.querySelector(".bottom-nav");
  if (!nav) return;

  const active = nav.querySelector(".nav-button.active");
  if (active) return;

  const more = nav.querySelector('[data-action="nav"][data-door="more"]');
  if (!more) return;

  more.classList.add("active");
  more.setAttribute("aria-current", "page");
}

if (root) {
  const observer = new MutationObserver(synchronizeSecondaryNavigation);
  observer.observe(root, { childList: true, subtree: true });
  synchronizeSecondaryNavigation();
}
