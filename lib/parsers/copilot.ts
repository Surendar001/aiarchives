import type { Conversation } from '@/types/conversation';
import { JSDOM } from 'jsdom';

/**
 * Parses a Copilot HTML document and extracts the conversation as HTML.
 * @param html - The raw HTML of the page
 * @returns A Conversation object
 */
export async function parseCopilot(html: string): Promise<Conversation> {
  const htmlByteLength = Buffer.byteLength(html, 'utf-8');
  if (htmlByteLength <= 0) {
    throw new Error('HTML content is empty or invalid');
  }

  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Select Copilot chat message blocks
  const messageNodes = Array.from(
    document.querySelectorAll('div.text-base.break-words.flex.flex-col.gap-4.whitespace-pre-wrap')
  );

  const messagesHtml = messageNodes
    .map((el) => el.innerHTML.trim())
    .filter(Boolean)
    .join('<hr>'); // Optional separator

  if (!messagesHtml || messagesHtml.trim().length === 0) {
    throw new Error('Could not extract any message HTML content');
  }

  return {
    model: 'Copilot',
    content: messagesHtml, // ✅ Keep HTML for S3
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: Buffer.byteLength(messagesHtml, 'utf-8'),
  };
}
