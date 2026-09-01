export const THEME_STORAGE_KEY = "easybook-theme";
export const DARK_THEME_QUERY = "(prefers-color-scheme: dark)";

export function getPreferredTheme() {
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  return window.matchMedia(DARK_THEME_QUERY).matches ? "dark" : "light";
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function initializeTheme() {
  const theme = getPreferredTheme();
  applyTheme(theme);
  return theme;
}
