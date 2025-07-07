import type { Conversation } from '@/types/conversation';
import { JSDOM } from 'jsdom';

// Helper: Clean up all inner text content
function cleanInnerHtml(rawHtml: string): string {
  const container = new JSDOM(`<div>${rawHtml}</div>`).window.document.body;
  const walker = container.ownerDocument.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    node.nodeValue = node.nodeValue
      ?.replace(/^Copilot said[:\-–]?\s*/i, '')                                // Remove "Copilot said"
      .replace(/\b\d+[a-z]+\.[a-z]{2,}(?:[\/\w.-]*)?/gi, '')                  // Remove numbered URLs
      .replace(/\[\d+\]/g, '')                                               // Remove bracketed refs
      .replace(/[‘’]/g, `'`)
      .replace(/[“”]/g, `"`)
      .replace(/â€™/g, `'`)
      .replace(/â€œ/g, `"`)
      .replace(/â€/g, `"`)
      .replace(/â€“/g, '–')
      .replace(/â€”/g, '—')
      .replace(/â€¦/g, '…')
      .replace(/\s{2,}/g, ' ')
      .trim() ?? '';
  }
  return container.innerHTML.trim();
}

export async function parseCopilot(html: string): Promise<Conversation> {
  const htmlByteLength = Buffer.byteLength(html, 'utf-8');
  if (htmlByteLength <= 0) {
    throw new Error('HTML content is empty or invalid');
  }

  const dom = new JSDOM(html, { contentType: 'text/html; charset=UTF-8' });
  const document = dom.window.document;

  const messageNodes = Array.from(
    document.querySelectorAll('[data-content="user-message"], [data-content="ai-message"]')
  );

  if (!messageNodes.length) {
    throw new Error('Could not extract any message HTML content');
  }

const filteredMessages = messageNodes
  .map((el) => {
    try {
      if (!el || !(el instanceof dom.window.HTMLElement)) return null;
      if (el.querySelector('input, textarea')) return null;
      const html = el.innerHTML?.trim();
      return html ? cleanInnerHtml(html) : null;
    } catch (e) {
      console.warn('Failed to process element:', e);
      return null;
    }
  })
  .filter(Boolean);

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
