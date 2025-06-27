'use strict';

let currentModel = 'Unknown'; // Default model

// Handle incoming messages from the extension popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'model') {
    currentModel = message.model;
    console.log('✅ Model set to:', currentModel);
    sendResponse({ status: 'ok' });
  }

  if (message.action === 'scrape') {
    console.log('📥 Scrape triggered from popup');

    // ✅ Extract only relevant conversation messages
    const messages = extractCopilotConversation();

    const formData = new FormData();
    formData.append('model', currentModel); // e.g. "Copilot"
    formData.append('content', JSON.stringify(messages)); // Only messages

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
        console.error('❌ Error sending conversation:', err);
        sendResponse({ success: false });
      });

    return true; // Keeps the sendResponse channel open for async
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
