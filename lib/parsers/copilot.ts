import type { Conversation } from '@/types/conversation';
import { JSDOM } from 'jsdom';

// Text cleanup helper
function cleanTextOutput(raw: string): string {
  return raw
    // Remove "Copilot said" or similar lead-ins
    .replace(/^\s*Copilot said[:\-–]?\s*/i, '')

    // Strip trailing numbered links (e.g., 1ed.stanford.edu2www.forbes.com)
    .replace(/\d+(?:[a-z]+\.[a-z]+)+(?:\d+)?/gi, '')
    .replace(/\[\d+\]/g, '')

    // Fix emoji byte sequences (common misencodings)
    .replace(/ðŸš€/g, '🚀')
    .replace(/ðŸŒ/g, '🌐')
    .replace(/ðŸ§/g, '🧠')
    .replace(/ðŸŽ®/g, '🎮')
    .replace(/ðŸ“±/g, '📱')
    .replace(/ðŸ§‘â€ðŸ«/g, '🧑‍🏫')
    .replace(/âš–ï¸/g, '⚠️')

    // Normalize quotation marks and apostrophes
    .replace(/[‘’]/g, `'`)
    .replace(/[“”]/g, `"`)
    .replace(/â€™/g, `'`)
    .replace(/â€œ/g, `"`)
    .replace(/â€/g, `"`)
    .replace(/â€“/g, '–')
    .replace(/â€”/g, '—')
    .replace(/â€¦/g, '…')

    // Strip excessive whitespace
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Main parser
export async function parseCopilot(html: string): Promise<Conversation> {
  const htmlByteLength = Buffer.byteLength(html, 'utf-8');
  if (htmlByteLength <= 0) {
    throw new Error('HTML content is empty or invalid');
  }

  const dom = new JSDOM(html, { contentType: 'text/html; charset=UTF-8' });
  const document = dom.window.document;

  // Select user and AI messages
  const messageNodes = Array.from(
    document.querySelectorAll('[data-content="user-message"], [data-content="ai-message"]')
  );

    const cleanedMessages = messageNodes
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

  if (!messageNodes.length) {
    throw new Error('Could not extract any message HTML content');
  }

  // Extract, clean, and filter messages
  const filteredMessages = messageNodes
    .map((el) => {
      if (el.querySelector('input, textarea')) return null;
      const raw = el.innerHTML.trim();
      return cleanTextOutput(raw);
    })
    .filter(Boolean);

  // Embedded CSS
  const embeddedStyle = `
    <style>
      body { font-family: system-ui, sans-serif; padding: 1em; background: #fff; color: #111; }
      .conversation-block { margin-bottom: 1.5em; }
      hr { border: none; border-top: 1px solid #ccc; margin: 1.5em 0; }
    </style>
  `;

  // Construct final HTML
  const styledHtml =
    embeddedStyle +
    '<div class="copilot-conversation">' +
    filteredMessages.map(m => `<div class="conversation-block">${m}</div>`).join('<hr>') +
    '</div>';

  return {
    model: 'Copilot',
    content: styledHtml,
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: htmlByteLength,
  };
}
