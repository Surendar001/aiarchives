'use strict';

let currentModel = 'Unknown'; // Default model

// ✅ Extract only the conversation from Copilot DOM
function extractCopilotConversation() {
  const messages = [];

  const aiMessages = document.querySelectorAll('[data-content="ai-message"]');
  const userMessages = document.querySelectorAll('[data-content="user-message"]');

  // Sort by DOM position
  const allNodes = [...aiMessages, ...userMessages].sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  );

  for (const node of allNodes) {
    const role = node.getAttribute('data-content') === 'ai-message' ? 'assistant' : 'user';
    const content = node.innerText.trim();
    if (content) messages.push({ role, content });
  }

  return messages;
}

// ✅ Main listener for extension popup trigger
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'model') {
    currentModel = message.model;
    console.log('✅ Model set to:', currentModel);
    sendResponse({ status: 'ok' });
  }

  if (message.action === 'scrape') {
    console.log('🔍 Scrape triggered from popup');

    const conversation = extractCopilotConversation();

    const formData = new FormData();
    formData.append('model', currentModel);
    formData.append('content', JSON.stringify(conversation)); // ✅ Send only structured conversation

    fetch('https://aiarchives-suren.duckdns.org/api/conversation', {
      method: 'POST',
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('✅ Successfully sent conversation:', data);
        sendResponse({ success: true, url: data.url });
      })
      .catch((err) => {
        console.error('❌ Error sending conversation:', err);
        sendResponse({ success: false });
      });

    return true; // for async response
  }
});
