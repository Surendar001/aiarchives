import type { Conversation } from '@/types/conversation';

/**
 * Extracts a Copilot share page into a structured Conversation.
 * @param html - Raw HTML content from the Copilot share page
 * @returns Promise resolving to a structured Conversation object
 */
export async function parseHtmlToConversation(html: string, model: string) {
  const dom = new DOMParser().parseFromString(html, 'text/html');

  const messages = Array.from(
    dom.querySelectorAll('[data-content="user-message"], [data-content="ai-message"]')
  )
    .sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    )
    .map(node => {
      const role = node.getAttribute('data-content') === 'user-message' ? 'user' : 'assistant';
      const content = node.textContent?.trim() || '';
      return { role, content };
    });

  return {
    model,
    content: JSON.stringify(messages, null, 2),
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: new TextEncoder().encode(html).length,
  };
}

