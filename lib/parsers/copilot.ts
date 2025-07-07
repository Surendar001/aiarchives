import type { Conversation } from '@/types/conversation';
import { JSDOM } from 'jsdom';

export async function parseCopilot(html: string): Promise<Conversation> {
  const htmlByteLength = Buffer.byteLength(html, 'utf-8');
  if (htmlByteLength <= 0) {
    throw new Error('HTML content is empty or invalid');
  }

  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Extract styles from <style> and <link rel="stylesheet">
const extractStyles = () => {
  const styleTags = Array.from(document.querySelectorAll('style')).map((el) => el.outerHTML);
  const linkTags = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(
    (el) => `<link rel="stylesheet" href="${(el as HTMLLinkElement).href}">`
  );
  return [...linkTags, ...styleTags].join('\n');
};


  // Extract conversation nodes, excluding any with interactive inputs
  const extractConversationHTML = () => {
    const containerSelector =
      'div.text-base.break-words.flex.flex-col.gap-4.whitespace-pre-wrap';

    const nodes = Array.from(document.querySelectorAll(containerSelector));

    const filteredNodes = nodes.filter(
      (node) =>
        !node.querySelector('input, textarea, select, button') && node.innerHTML.trim().length > 0
    );

    return filteredNodes.map((node) => node.outerHTML).join('<hr>\n');
  };

  const styles = extractStyles();
  const bodyContent = extractConversationHTML();

  if (!bodyContent) {
    throw new Error('Could not extract any message HTML content');
  }

  const fullHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>Copilot Conversation</title>
      ${styles}
    </head>
    <body style="background-color: #111; color: white; padding: 2em; font-family: sans-serif;">
      ${bodyContent}
    </body>
    </html>
  `.trim();

  return {
    model: 'Copilot',
    content: fullHTML,
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: htmlByteLength,
  };
}
