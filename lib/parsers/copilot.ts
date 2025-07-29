import type { Conversation } from '@/types/conversation';
import { JSDOM } from 'jsdom';

export async function parseCopilot(html: string): Promise<Conversation> {
  const htmlByteLength = Buffer.byteLength(html, 'utf-8');
  if (htmlByteLength <= 0) {
    throw new Error('HTML content is empty or invalid');
  }

  const dom = new JSDOM(html, { contentType: 'text/html; charset=UTF-8' });
  const document = dom.window.document;

  // Select message blocks (user + AI)
  const messageNodes = Array.from(
    document.querySelectorAll('[data-content="user-message"], [data-content="ai-message"]')
  );

  if (!messageNodes.length) {
    throw new Error('Could not extract any message HTML content');
  }

  const filteredMessages = messageNodes
    .map((el) => {
      if (el.querySelector('input, textarea')) return null;
      return el.innerHTML.trim(); // No need for manual emoji fixes anymore
    })
    .filter(Boolean);

  // Minimal embedded styling
  const embeddedStyle = `
    <style>
      body { font-family: system-ui, sans-serif; padding: 1em; background: #fff; color: #111; }
      .conversation-block { margin-bottom: 1.5em; }
      hr { border: none; border-top: 1px solid #ccc; margin: 1.5em 0; }
    </style>
  `;

  const styledHtml =
    embeddedStyle +
    '<div class="copilot-conversation">' +
    filteredMessages.map(m => `<div class="conversation-block">${m}</div>`).join('<hr>') +
    '</div>';

  return {
    model: 'Copilot',
    content: styledHtml,
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: htmlByteLength,
  };
}
