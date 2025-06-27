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

  const messages = allMessageNodes
    .map((node) => {
      const role = node.getAttribute('data-content') === 'user-message' ? 'user' : 'assistant';
      const content = node.textContent?.trim();
      if (!content) return null;
      return { role, content };
    })
    .filter(Boolean);

  return {
    model: 'Copilot',
    content: JSON.stringify(messages, null, 2),
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: htmlByteLength,
  };
}
