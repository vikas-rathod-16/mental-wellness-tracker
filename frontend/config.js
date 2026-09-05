// config.js — Environment-aware API URL resolver for CalmMind
// Works seamlessly both during local dev (Live Server on 5500, 5501, etc.) and live in production on Render/Railway.

(function () {
  const isLocalDev =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.protocol === 'file:';

  // If opening via a frontend dev server (like VS Code Live Server on port 5500, 5501, etc.)
  // route directly to the local backend (4000) and local AI service (8001).
  const isSeparateFrontendServer = isLocalDev && window.location.port !== '4000';

  window.APP_CONFIG = {
    BACKEND_URL: isSeparateFrontendServer ? 'http://127.0.0.1:4000' : '',
    AI_URL: isSeparateFrontendServer ? 'http://127.0.0.1:8001' : '/ai',
  };
})();
