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

    // ✅ Step 1: Remove unwanted global UI elements
    document.querySelectorAll('svg.h-9.w-2').forEach(el => el.remove());
    document.querySelectorAll('button[data-testid="create-page"]').forEach(el => el.remove());

    // ✅ Step 2: Normalize HTML to UTF-8 to preserve emojis
    const encoder = new TextEncoder();
    const decoder = new TextDecoder('utf-8');
    const rawHtml = document.documentElement.outerHTML;
    const utf8Bytes = encoder.encode(rawHtml);
    const cleanHtml = decoder.decode(utf8Bytes);

    // ✅ Step 3: Extract and clean messages
    const messages = Array.from(
      document.querySelectorAll('div.text-base.break-words.flex.flex-col.gap-4.whitespace-pre-wrap')
    )
      .map(el => {
        const container = document.createElement('div');
        container.innerHTML = el.innerHTML.trim();

        const first = container.firstChild;
        if (
          first &&
          first.textContent &&
          /^Copilot said[:\-–]?\s*/i.test(first.textContent.trim())
        ) {
          // Remove the first node if it’s "Copilot said"
          container.removeChild(first);
        }

        return container.innerHTML.trim();
      })
      .filter(Boolean);

    // ✅ Step 4: Build styled HTML
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

    // ✅ Step 5: Upload to server
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
