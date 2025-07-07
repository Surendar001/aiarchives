'use strict';
let currentModel = 'Unknown';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'model') {
    currentModel = message.model;
    console.log('Model set to:', currentModel);
    sendResponse({ status: 'ok' });
  }

  if (message.action === 'scrape') {
    console.log('Scrape triggered from popup');

    // 🧹 Remove any full element that only says "Copilot said"
    document.querySelectorAll('*').forEach((el) => {
      const text = el.textContent?.trim();
      if (/^Copilot said[:\-–]?$/i.test(text)) {
        el.remove();
      }
    });

    // ✅ Step 1: Use TextEncoder/TextDecoder to ensure clean UTF-8
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8');

    const rawHtml = document.documentElement.outerHTML;
    const utf8Bytes = encoder.encode(rawHtml);
    const cleanHtml = decoder.decode(utf8Bytes);

    // ✅ Step 2: Extract messages from Copilot's DOM
    const messages = Array.from(
      document.querySelectorAll('div.text-base.break-words.flex.flex-col.gap-4.whitespace-pre-wrap')
    )
      .map(el => el.innerHTML.trim())
      .filter(Boolean);

    const conversationHTML = messages
      .map(msg => `<div class="conversation-block">${msg}</div>`)
      .join('<hr>');

    const embeddedStyle = `
      <style>
        body { font-family: system-ui, sans-serif; padding: 1em; background: #fff; color: #111; }
        .conversation-block { margin-bottom: 1.5em; }
        hr { border: none; border-top: 1px solid #ccc; margin: 1.5em 0; }
      </style>
    `;

    const styledHTML = embeddedStyle + `<div class="copilot-conversation">${conversationHTML}</div>`;

    // ✅ Step 3: Send correct field to backend (htmlDoc instead of file)
    const formData = new FormData();
    formData.append('htmlDoc', new Blob([cleanHtml], { type: 'text/html' })); // ✅ Correct field name
    formData.append('model', currentModel);
    formData.append('content', styledHTML);

    fetch('https://aiarchives-suren.duckdns.org/api/conversation', {
      method: 'POST',
      body: formData,
    })
      .then(res => res.json())
      .then(data => {
        console.log('✅ Data sent:', data);
        sendResponse({ success: true });
      })
      .catch(err => {
        console.error('❌ Error sending data:', err);
        sendResponse({ success: false });
      });

    return true;
  }
});
