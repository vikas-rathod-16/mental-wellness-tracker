// config.js — Environment-aware API URL resolver for CalmMind
// Works seamlessly both during local dev (Live Server) and live in production on Render/Railway.

(function () {
  const isLocalDev =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.protocol === 'file:';

  const isLiveServer = isLocalDev && window.location.port === '5501';

  window.APP_CONFIG = {
    // If running via VS Code Live Server on 5501, route to local backend on 4000.
    // If served by the Express backend or in production, relative '' routes directly to the current origin!
    BACKEND_URL: isLiveServer ? 'http://127.0.0.1:4000' : '',

    // If running via Live Server, hit local AI FastAPI on 8001 directly.
    // In production, the backend proxies /ai directly to the Python AI service!
    AI_URL: isLiveServer ? 'http://127.0.0.1:8001' : '/ai',
  };
})();
