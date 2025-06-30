'use strict';
let currentModel = 'Unknown'; // <- ✅ Define it once globally


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'model') {
    currentModel = message.model;
    console.log('Model set to:', currentModel);
    sendResponse({ status: 'ok' });
  }

  if (message.action === 'scrape') {
    console.log('Scrape triggered from popup');

    const html = document.documentElement.outerHTML;

    // ✅ Extract Copilot messages
   const messages = [
  ...document.querySelectorAll('div.text-base.break-words.flex.flex-col.gap-4.whitespace-pre-wrap')
]
  .map(el => el.innerHTML.trim())  // ⬅️ change from innerText to innerHTML
  .filter(Boolean)
  .join('<hr>'); // optional divider between messages


    const formData = new FormData();
   formData.append('file', new Blob([html], { type: 'text/html' }));
formData.append('model', currentModel);
formData.append('content', messages); // ⬅️ this is now rich HTML
const conversationHTML = messages.join('<hr>'); // optional separator
formData.append('content', conversationHTML);   // send rich HTML



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

    return true; // Important to keep this here for async sendResponse
  }
});

async function scrape() {
  const htmlDoc = document.documentElement.innerHTML;
  if (!htmlDoc || isRequesting) return;

  isRequesting = true;

  const apiUrl = `${window.EXTENSION_CONFIG.baseUrl}/api/conversation`;
  const body = new FormData();

  // raw HTML
  body.append('htmlDoc', new Blob([htmlDoc], { type: 'text/plain; charset=utf-8' }));
  // model
  body.append('model', currentModel);

  try {
    const res = await fetch(apiUrl, { method: 'POST', body });
    console.log('res =>', res, apiUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { url } = await res.json();
    window.open(url, '_blank'); // view the saved conversation
  } catch (err) {
    alert(`Error saving conversation: ${err.message}`);
  } finally {
    isRequesting = false;
  }
}
