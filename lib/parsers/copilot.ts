import type { Conversation } from '@/types/conversation';

export async function parseCopilot(html: string): Promise<Conversation> {
  const byteLength = Buffer.byteLength(html, 'utf-8');
  if (byteLength <= 0) {
    throw new Error('HTML content is empty or invalid');
  }

  return {
    model: 'Copilot',
    content: html, // ✅ preserve rich HTML
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: byteLength,
  };
}
