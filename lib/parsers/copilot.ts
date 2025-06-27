import type { Conversation } from '@/types/conversation';

/**
 * Extracts a Copilot share page into a structured Conversation.
 * @param html - Raw HTML content from the Copilot share page
 * @returns Promise resolving to a structured Conversation object
 */
export async function parseCopilot(html: string): Promise<Conversation> {
  const dom = new DOMParser().parseFromString(html, 'text/html');

  const allMessageNodes = Array.from(
    dom.querySelectorAll('[data-content="user-message"], [data-content="ai-message"]')
  );

  const messages = allMessageNodes.map((node) => {
    const role = node.getAttribute('data-content') === 'user-message' ? 'user' : 'assistant';
    const content = node.textContent?.trim() ?? '';
    return { role, content };
  });

  return {
    model: 'Copilot',
    content: JSON.stringify(messages, null, 2),
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: new TextEncoder().encode(html).length,
  };
}
