const THEME_KEY = "aldo-theme";

function applyTheme(isDark, persist) {
  const body = document.body;
  const icon = document.getElementById("icon");
  const checkbox = document.getElementById("flexSwitchCheckDefault");

  body.classList.toggle("dark-mode", isDark);

  if (checkbox) checkbox.checked = isDark;

  if (icon) {
    icon.classList.toggle("fa-sun", !isDark);
    icon.classList.toggle("fa-moon", isDark);
  }

  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
    } catch (error) {
      /* Storage can be unavailable in private browsing. */
    }
  }
}

function toggleIcon() {
  const checkbox = document.getElementById("flexSwitchCheckDefault");
  applyTheme(Boolean(checkbox && checkbox.checked), true);
}

(function initTheme() {
  let savedTheme = null;

  try {
    savedTheme = localStorage.getItem(THEME_KEY);
  } catch (error) {
    savedTheme = null;
  }

  applyTheme(savedTheme === "dark", false);
})();
