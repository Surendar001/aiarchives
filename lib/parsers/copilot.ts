import type { Conversation } from '@/types/conversation';
import { JSDOM } from 'jsdom';

/**
 * Extracts a Copilot share page into a structured Conversation.
 * @param html - Raw HTML content from the Copilot share page
 * @returns Promise resolving to a structured Conversation object
 */
export async function parseCopilot(html: string): Promise<Conversation> {
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
    .filter(Boolean); // filters out null entries

  return {
    model: 'Copilot',
    content: JSON.stringify(messages, null, 2),
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: Buffer.byteLength(html, 'utf-8'), // more reliable than TextEncoder in Node
  };
}
