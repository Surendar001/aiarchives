import type { Conversation } from '@/types/conversation';
import { JSDOM } from 'jsdom';

export async function parseCopilot(html: string): Promise<Conversation> {
  const htmlByteLength = Buffer.byteLength(html, 'utf-8');
  if (htmlByteLength <= 0) {
    throw new Error('HTML content is empty or invalid');
  }

  const dom = new JSDOM(html);
  const document = dom.window.document;

  // More flexible selector for capturing Copilot message containers
  const messageNodes = Array.from(
    document.querySelectorAll(
      '[data-content="user-message"], [data-content="ai-message"], div.text-base.break-words'
    )
  );

  const messagesHtml = messageNodes
    .map((el) => el.innerHTML.trim())
    .filter(Boolean)
    .join('<hr>');

  if (!messagesHtml || messagesHtml.trim().length === 0) {
    throw new Error('Could not extract any message HTML content');
  }

  return {
    model: 'Copilot',
    content: messagesHtml,
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: Buffer.byteLength(messagesHtml, 'utf-8'),
  };
}
