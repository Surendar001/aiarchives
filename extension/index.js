'use strict';

let currentModel = 'Copilot'; // default

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'model') {
    currentModel = message.model;
    console.log('Model set to:', currentModel);
    sendResponse({ status: 'ok' });
  }

  if (message.action === 'scrape') {
    console.log('Scrape triggered from popup');

    const messageNodes = document.querySelectorAll(
      'div.text-base.break-words.flex.flex-col.gap-4.whitespace-pre-wrap'
    );

    const messages = Array.from(messageNodes).map(el => el.innerText.trim()).filter(Boolean);

    const cleanedText = messages.join('\n\n');

    const formData = new FormData();
    formData.append('file', new Blob([cleanedText], { type: 'text/plain' }));
    formData.append('model', currentModel);

    fetch('https://aiarchives-suren.duckdns.org/api/conversation', {
      method: 'POST',
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('✅ Conversation data sent:', data);
        sendResponse({ success: true });
      })
      .catch((err) => {
        console.error('❌ Error sending data:', err);
        sendResponse({ success: false });
      });

    return true; // For async sendResponse
  }
});


// Extract user and assistant messages from Copilot page
function extractCopilotConversation() {
  const messages = [];

  const allMessageNodes = [
    ...document.querySelectorAll('[data-content="user-message"], [data-content="ai-message"]')
  ].sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  );

  for (const node of allMessageNodes) {
    const role = node.getAttribute('data-content') === 'user-message' ? 'user' : 'assistant';
    const content = node.innerText.trim();
    if (content) {
      messages.push({ role, content });
    }
  }

  return messages;
}

