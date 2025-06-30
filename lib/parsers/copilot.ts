import type { Conversation } from '@/types/conversation';

/**
 * Extracts a Copilot share page into a structured Conversation.
 * This version expects the client to send a JSON-encoded array of messages.
 *
 * Example format from client:
 * [
 *   { role: 'user', content: 'Hello' },
 *   { role: 'assistant', content: 'Hi there!' }
 * ]
 *
 * @param json - Raw JSON string representing extracted messages
 * @returns Promise resolving to a structured Conversation object
 */
export async function parseCopilot(json: string): Promise<Conversation> {
  let messages;
  try {
    messages = JSON.parse(json);
  } catch (err) {
    throw new Error('Invalid JSON content');
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('No messages found in Copilot content');
  }

  return {
    model: 'Copilot',
    content: JSON.stringify(messages, null, 2),
    scrapedAt: new Date().toISOString(),
    sourceHtmlBytes: Buffer.byteLength(json, 'utf-8'),
  };
}
