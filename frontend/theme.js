// theme.js — shared dark/light toggle, used on every page.
// Include this AFTER theme.css and after any button with id="themeToggle".
(function () {
  const STORAGE_KEY = 'wellness-theme';
  const root = document.documentElement;

  function getSavedTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    // keep any legacy data-theme on #app in sync too (older pages used this)
    const appEl = document.getElementById('app');
    if (appEl) appEl.setAttribute('data-theme', theme);

    document.querySelectorAll('#themeToggle, .icon-btn[data-role="theme-toggle"]').forEach((btn) => {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
  }

  function toggleTheme() {
    const current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  // apply immediately on load
  applyTheme(getSavedTheme());

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#themeToggle, .icon-btn[data-role="theme-toggle"]').forEach((btn) => {
      btn.addEventListener('click', toggleTheme);
    });
    // re-apply so the icon text is correct once the button exists in the DOM
    applyTheme(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  });
})();
