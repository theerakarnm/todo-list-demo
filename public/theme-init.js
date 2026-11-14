// Sets data-theme on <html> before the first paint, so the page never flashes the wrong theme.
// Loaded render-blocking from index.html. Same rules as src/client/theme/resolve-theme.ts
// (theme-init.test.ts checks that they agree).
(function () {
  var preference = null;
  try {
    preference = localStorage.getItem("jotlist-theme");
  } catch (error) {
    // Storage can be blocked (private mode); fall back to the system setting.
  }
  var systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  var isDark = preference === "dark" || (preference !== "light" && systemPrefersDark);
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
})();
