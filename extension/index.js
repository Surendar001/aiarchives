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

    const html = document.documentElement.outerHTML;

    const messages = [
      ...document.querySelectorAll('div.text-base.break-words.flex.flex-col.gap-4.whitespace-pre-wrap')
    ]
      .map(el => el.innerHTML.trim()) // ✅ preserve Copilot styles
      .filter(Boolean);

    const conversationHTML = messages.join('<hr>'); // ✅ rich HTML

    const formData = new FormData();
    formData.append('file', new Blob([html], { type: 'text/html' }));
    formData.append('model', currentModel);
    formData.append('content', conversationHTML); // ✅ only one content append

    fetch('https://aiarchives-suren.duckdns.org/api/conversation', {
      method: 'POST',
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('✅ Data sent:', data);
        sendResponse({ success: true });
      })
      .catch((err) => {
        console.error('❌ Error sending data:', err);
        sendResponse({ success: false });
      });

    return true; // async
  }
});
