import type { Conversation } from '@/types/conversation';
import { JSDOM } from 'jsdom';

export async function parseCopilot(html: string): Promise<Conversation> {
  const htmlByteLength = Buffer.byteLength(html, 'utf-8');
  if (htmlByteLength <= 0) {
    throw new Error('HTML content is empty or invalid');
  }

  const dom = new JSDOM(html);
  const document = dom.window.document;

  const messageNodes = Array.from(
    document.querySelectorAll('[data-content="user-message"], [data-content="ai-message"]')
  );

  const htmlBlocks = messageNodes
    .map((node) => {
      const role = node.getAttribute('data-content') === 'user-message' ? 'User' : 'Copilot';
      const htmlContent = node.innerHTML.trim()
        .replace(/^<[^>]+>Copilot said<\/[^>]+>/i, '')
        .replace(/<[^>]*>Edit in a page<\/[^>]*>$/, '');
      return `<div class="message-block"><strong>${role}:</strong><div class="message">${htmlContent}</div></div>`;
    });

  return {
    model: 'Copilot',
    content: htmlBlocks.join('\n'),
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: htmlByteLength,
  };
}
