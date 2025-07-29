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

    // ✅ Step 1: Remove unwanted UI and label noise
    document.querySelectorAll('svg.h-9.w-2').forEach(el => el.remove());
    document.querySelectorAll('button[data-testid="create-page"]').forEach(el => el.remove());
    document.querySelectorAll('h2[aria-label="Copilot said"]').forEach(el => el.remove());

    // ✅ Step 2: Normalize HTML (emoji-safe)
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

        // Traverse and clean all text nodes
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          node.nodeValue = node.nodeValue
            .replace(/^Copilot said[:\-–]?\s*/i, '')                     // Remove Copilot said
            .replace(/\b\d+[a-z]+\.[a-z]{2,}(?:[\/\w.-]*)?/gi, '')      // Remove trailing links
            .replace(/\[\d+\]/g, '')                                    // Remove [1], [2]
            .replace(/[\u2018\u2019]/g, "'")                            // Normalize apostrophes
            .replace(/[\u201C\u201D]/g, '"')                            // Normalize quotes
            .replace(/â€™/g, "'")
            .replace(/â€œ/g, '"')
            .replace(/â€<9d>/g, '"')
            .replace(/â€“/g, '–')
            .replace(/â€”/g, '—')
            .replace(/â€¦/g, '…')
            .replace(/\s{2,}/g, ' ')                                    // Collapse spaces
            .trim();
        }

        return container.innerHTML.trim();
      })
      .filter(Boolean);
  // ✅ Step 4: Add styling and wrap in HTML
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

    // ✅ Step 5: Send to API
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

    return true; // keep async response channel open
  }
});
                                                   