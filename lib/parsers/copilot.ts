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

  const cleanedMessages = allMessageNodes
    .map((node) => {
      let content = node.textContent?.trim() || '';

      // Clean up Copilot artifacts
      content = content
        .replace(/^Copilot said\s*/i, '')
        .replace(/Edit in a page$/i, '')
        .replace(/\d+(en\.wikipedia|www\.)[^\s]*/gi, '')
        .trim();

      return content;
    })
    .filter(Boolean);

  if (!cleanedMessages.length) {
    throw new Error('No valid Copilot messages found');
  }

  return {
    model: 'Copilot',
    content: cleanedMessages.join('\n\n'), // 👈 return as plain text, not JSON
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: htmlByteLength,
  };
}
