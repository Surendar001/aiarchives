'use strict';
let currentModel = 'Unknown'; // <- ✅ Define it once globally


// Function to extract only Copilot conversation (not full HTML)
function extractCopilotConversation() {
  const messages = [];

  const aiMessages = document.querySelectorAll('[data-content="ai-message"]');
  const userMessages = document.querySelectorAll('[data-content="user-message"]');

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

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'model') {
    currentModel = message.model;
    console.log('Model set to:', currentModel);
    sendResponse({ status: 'ok' });
  }

  if (message.action === 'scrape') {
    console.log('🟡 Scrape triggered from popup');

    const conversation = extractCopilotConversation();

    const formData = new FormData();
    formData.append('model', currentModel); // e.g., "Copilot"
    formData.append('content', JSON.stringify(conversation)); // ✅ only messages

    fetch('https://aiarchives-suren.duckdns.org/api/conversation', {
      method: 'POST',
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('✅ Data sent successfully:', data);
        sendResponse({ success: true });
      })
      .catch((err) => {
        console.error('❌ Error sending conversation:', err);
        sendResponse({ success: false });
      });

    return true; // Important for async sendResponse
  }
});