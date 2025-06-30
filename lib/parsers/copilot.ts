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
    document.querySelectorAll('div.text-base.break-words.flex.flex-col.gap-4.whitespace-pre-wrap')
  );

  const cleanedMessages = allMessageNodes.map(node => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = node.innerHTML;

    let html = wrapper.innerHTML;

    // ✅ Remove "User:", "Copilot:", "Copilot said" (wrapped or plain)
    html = html
      .replace(/<[^>]*>\s*(User:|Copilot:|Copilot said)\s*<\/[^>]*>/gi, '')
      .replace(/\b(User:|Copilot:|Copilot said)\b\s*/gi, '');

    // ✅ Remove duplicate numbered references like "1en.wikipedia.orgen.wikipedia.org"
    html = html.replace(/\d+\s*(https?:\/\/)?[^\s<]+?\1?[^\s<]*/g, '');

    // ✅ Remove trailing "1", "2", "3" style footnotes if alone
    html = html.replace(/\b\d+\b/g, '');

    wrapper.innerHTML = html;
    return wrapper.outerHTML;
  });

  const finalHTML = cleanedMessages.join('<hr>');

  return {
    model: 'Copilot',
    content: finalHTML,
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: htmlByteLength,
  };
}
