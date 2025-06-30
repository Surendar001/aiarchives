import { JSDOM } from 'jsdom';
import type { Conversation } from '@/types/conversation';

/**
 * Extracts a Copilot page's raw HTML and returns only conversation messages.
 */
export async function parseHtmlToConversation(html: string, model: string): Promise<Conversation> {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const allMessageNodes = Array.from(
    document.querySelectorAll('[data-content="user-message"], [data-content="ai-message"]')
  );

  const messages = allMessageNodes.map((node) => {
    const role = node.getAttribute('data-content') === 'user-message' ? 'user' : 'assistant';
    const content = node.textContent?.trim() ?? '';
    return { role, content };
  });

  const serialized = JSON.stringify(messages, null, 2);

  return {
    model,
    content: serialized,
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: Buffer.byteLength(html, 'utf-8'), // satisfies DB constraint
  };
}
