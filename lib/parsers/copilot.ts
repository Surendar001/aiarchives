import type { Conversation } from '@/types/conversation';
import { JSDOM } from 'jsdom';

export async function parseCopilot(html: string): Promise<Conversation> {
  const htmlByteLength = Buffer.byteLength(html, 'utf-8');
  if (htmlByteLength <= 0) {
    throw new Error('HTML content is empty or invalid');
  }

  const dom = new JSDOM(html);
  const document = dom.window.document;

  const allMessageNodes = Array.from(
    document.querySelectorAll('[data-content="user-message"], [data-content="ai-message"]')
  );

  const htmlMessages = allMessageNodes
    .map((node) => {
      const role = node.getAttribute('data-content') === 'user-message' ? 'User' : 'Copilot';
      const rawHtml = node.innerHTML
        .replace(/^<[^>]+>Copilot said<\/[^>]+>/i, '') // remove "Copilot said"
        .replace(/<[^>]*>Edit in a page<\/[^>]*>$/, ''); // remove "Edit in a page"

      return `<div class="message-block"><strong>${role}:</strong><div class="message">${rawHtml}</div></div>`;
    })
    .filter(Boolean);

  return {
    model: 'Copilot',
    content: htmlMessages.join('\n'), // return styled HTML
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: htmlByteLength,
  };
}
