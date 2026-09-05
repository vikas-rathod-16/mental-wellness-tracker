// stress.js — Sentiment & Stress Check
const AI_URL = (window.APP_CONFIG && window.APP_CONFIG.AI_URL) || "http://127.0.0.1:8001";
const BACKEND_URL = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL !== undefined) ? window.APP_CONFIG.BACKEND_URL : "http://127.0.0.1:4000";

(function () {
  const moodInput = document.getElementById('moodInput');
  const checkBtn = document.getElementById('checkBtn');
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('status');
  const result = document.getElementById('result');
  const resultCard = document.getElementById('resultCard');
  const stressValue = document.getElementById('stressValue');
  const sentimentText = document.getElementById('sentimentText');

  let lastResponse = null;

  function setLoading(loading) {
    checkBtn.disabled = loading;
    checkBtn.textContent = loading ? 'Checking…' : 'Check Stress';
  }

  function colorize(score) {
    resultCard.classList.remove('green', 'orange', 'red');
    if (score < 40) resultCard.classList.add('green');
    else if (score <= 70) resultCard.classList.add('orange');
    else resultCard.classList.add('red');
  }

  checkBtn.addEventListener('click', async () => {
    const text = (moodInput.value || '').trim();
    if (!text) { alert('Please enter how you feel'); moodInput.focus(); return; }

    setLoading(true);
    statusEl.textContent = 'Analyzing…';

    try {
      const res = await fetch(`${AI_URL}/analyze-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!res.ok) throw new Error('AI service error');

      const body = await res.json();
      // shape returned by ai-service: { emotion, stress, sentimentScore, source }
      lastResponse = { ...body, text };
      const s = Number(body.stress ?? 0);
      stressValue.textContent = s + '%';
      sentimentText.textContent = 'Sentiment score: ' + (body.sentimentScore ?? 'N/A');
      colorize(s);
      result.classList.remove('hidden');
      saveBtn.disabled = false;
      statusEl.textContent = 'Done';
    } catch (err) {
      console.error(err);
      statusEl.textContent = 'Error — cannot reach backend';
      alert('Unable to reach backend. Check console and ensure the server is running and CORS is enabled.');
    } finally {
      setLoading(false);
    }
  });

  saveBtn.addEventListener('click', async () => {
    if (!lastResponse) return alert('No result to save');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      const res = await fetch(`${BACKEND_URL}/stress/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lastResponse)
      });
      if (!res.ok) throw new Error('Save failed');
      const body = await res.json();
      alert('Saved ✓');
    } catch (err) {
      console.error(err);
      alert('Save failed — check backend');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Log';
    }
  });

  // keyboard shortcut to check: Ctrl/Cmd + Enter
  moodInput && moodInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') checkBtn.click();
  });
})();
