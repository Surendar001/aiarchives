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

    // 🧹 Remove any standalone "Copilot said" elements
    document.querySelectorAll('*').forEach((el) => {
      const text = el.textContent?.trim();
      if (/^Copilot said[:\-–]?$/i.test(text)) {
        el.remove();
      }
    });

    // ✅ Use TextEncoder/TextDecoder to ensure clean UTF-8
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8');

    const rawHtml = document.documentElement.outerHTML;
    const utf8Bytes = encoder.encode(rawHtml);
    const cleanHtml = decoder.decode(utf8Bytes);

    // ✅ Upload only clean HTML and model
    const formData = new FormData();
    formData.append('htmlDoc', new Blob([cleanHtml], { type: 'text/html' })); // ✅ matches backend field name
    formData.append('model', currentModel);

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
