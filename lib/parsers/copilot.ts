import type { Conversation } from '@/types/conversation';
import { JSDOM } from 'jsdom';

export async function parseCopilot(html: string): Promise<Conversation> {
  const htmlByteLength = Buffer.byteLength(html, 'utf-8');
  if (htmlByteLength <= 0) {
    throw new Error('HTML content is empty or invalid');
  }

  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Select all message containers (user and assistant)
  const messageNodes = Array.from(
    document.querySelectorAll('[id$="-user-message"], [id$="-ai-message"]')
  );

  if (messageNodes.length === 0) {
    throw new Error('Could not extract any message HTML content');
  }

  // Remove input elements from each message node
  messageNodes.forEach(node => {
    node.querySelectorAll('input, textarea, button').forEach(el => el.remove());
  });

  // Extract inline HTML content of each message
  const messageHTML = messageNodes
    .map(node => node.innerHTML.trim())
    .filter(Boolean)
    .join('<hr>');

  // Optional: Extract style tag content from <head> if you want inline CSS
  const styleTags = Array.from(document.querySelectorAll('style'))
    .map(style => style.textContent)
    .filter(Boolean)
    .join('\n');

  const combinedHTML = `
    <html>
      <head>
        <style>${styleTags}</style>
      </head>
      <body>
        ${messageHTML}
      </body>
    </html>
  `.trim();

  return {
    model: 'Copilot',
    content: combinedHTML,
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: htmlByteLength,
  };
}
