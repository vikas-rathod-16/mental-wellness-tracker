// chat.js — Wellness Chat
const BASE_URL = (window.APP_CONFIG && window.APP_CONFIG.BACKEND_URL !== undefined) ? window.APP_CONFIG.BACKEND_URL : "http://localhost:4000";

(function () {
  const chatBox = document.getElementById('chatBox');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const chatStatus = document.getElementById('chatStatus');

  function append(who, text) {
    const el = document.createElement('div');
    el.className = 'msg ' + (who === 'user' ? 'user-msg' : 'bot-msg');
    el.textContent = text;
    chatBox.appendChild(el);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  async function sendMessage(text) {
    append('user', text);
    chatStatus.textContent = 'Thinking…';
    try {
      const res = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      if (!res.ok) throw new Error('Network error');
      const body = await res.json();
      append('bot', body.reply ?? 'Sorry — no reply.');
      chatStatus.textContent = '';
    } catch (err) {
      console.error(err);
      append('bot', 'Error connecting to chat backend.');
      chatStatus.textContent = 'Error connecting to backend';
    }
  }

  sendBtn.addEventListener('click', () => {
    const txt = (chatInput.value || '').trim();
    if (!txt) return;
    chatInput.value = '';
    sendMessage(txt);
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  // initial greeting
  append('bot', 'Hi — I am CalmMind. How are you feeling today?');
})();
