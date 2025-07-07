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

    // Extract full HTML of the page (saves raw Copilot structure)
    const fullHtml = document.documentElement.outerHTML;

    // Cleaning and normalization function
    const normalize = (str) =>
      str
        .replace(/ðŸš€/g, '🚀')
        .replace(/ðŸŒ/g, '🌐')
        .replace(/ðŸ§/g, '🧠')
        .replace(/ðŸŽ®/g, '🎮')
        .replace(/ðŸ“±/g, '📱')
        .replace(/ðŸ§‘â€ðŸ«/g, '🧑‍🏫')
        .replace(/âš–ï¸/g, '⚠️')
        .replace(/[‘’]/g, `'`)
        .replace(/[“”]/g, `"`)
        .replace(/â€™/g, `'`)
        .replace(/â€œ/g, `"`)
        .replace(/â€/g, `"`)
        .replace(/â€“/g, '–')
        .replace(/â€”/g, '—')
        .replace(/â€¦/g, '…')
        .replace(/Copilot said[:\-–]?\s*/gi, '')           // remove "Copilot said"
        .replace(/\d+(?:[a-z]+\.[a-z]+)+(?:\d+)?/gi, '')   // remove links like 1ed.stanford.edu
        .replace(/\[\d+\]/g, '')                           // remove bracketed refs like [1]
        .replace(/\s{2,}/g, ' ')                           // collapse multiple spaces
        .trim();

    // Extract relevant messages (user + AI) — same selector
    const messages = Array.from(
      document.querySelectorAll('div.text-base.break-words.flex.flex-col.gap-4.whitespace-pre-wrap')
    )
      .map(el => normalize(el.innerHTML.trim()))
      .filter(Boolean);

    // Wrap each message and join with <hr>
    const conversationHTML = messages
      .map(msg => `<div class="conversation-block">${msg}</div>`)
      .join('<hr>');

    // Optional embedded style for nicer formatting
    const embeddedStyle = `
      <style>
        body { font-family: system-ui, sans-serif; padding: 1em; background: #fff; color: #111; }
        .conversation-block { margin-bottom: 1.5em; }
        hr { border: none; border-top: 1px solid #ccc; margin: 1.5em 0; }
      </style>
    `;

    const styledHTML = embeddedStyle + `<div class="copilot-conversation">${conversationHTML}</div>`;

    // Prepare data to send to your backend
    const formData = new FormData();
    formData.append('file', new Blob([fullHtml], { type: 'text/html' })); // raw HTML
    formData.append('model', currentModel);                                // model from popup
    formData.append('content', styledHTML);                                // cleaned + styled content

    // Upload to backend API
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

    return true; // keep message channel open for async response
  }
});
