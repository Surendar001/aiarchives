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

    // ✅ Step 1: Ensure UTF-8 consistency
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8');
    const rawHtml = document.documentElement.outerHTML;
    const utf8Bytes = encoder.encode(rawHtml);
    const cleanHtml = decoder.decode(utf8Bytes);

    // ✅ Step 2: Select and clean up messages
    const messages = Array.from(
      document.querySelectorAll('div.text-base.break-words.flex.flex-col.gap-4.whitespace-pre-wrap')
    )
      .filter(el => {
        // ❌ Filter out vertical bar svg and "Edit in a page" buttons
        return !el.querySelector('svg') && !el.querySelector('[data-testid="create-page"]');
      })
      .map(el => {
        let html = el.innerHTML.trim();

        // 🧹 Remove "Copilot said" if it appears at the start
        html = html.replace(/^Copilot said[:\-–]?\s*/i, '');

        return html;
      })
      .filter(Boolean);

    // ✅ Step 3: Wrap in styled HTML
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

    // ✅ Step 4: Upload to backend
    const formData = new FormData();
    formData.append('file', new Blob([cleanHtml], { type: 'text/html' }));
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

    return true; // Keeps message channel open
  }
});
