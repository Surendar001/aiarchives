import { NextRequest, NextResponse } from 'next/server';
import { parseHtmlToConversation } from '@/lib/parsers';
import { dbClient } from '@/lib/db/client';
import { s3Client } from '@/lib/storage/s3';
import { CreateConversationInput } from '@/lib/db/types';
import { createConversationRecord, getAllConversationRecords } from '@/lib/db/conversations';
import { randomUUID } from 'crypto';
import { loadConfig } from '@/lib/config';


let isInitialized = false;
const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_ALLOWED_ORIGIN || '*';

async function ensureInitialized() {
  if (!isInitialized) {
    try {
      const config = loadConfig();
      await dbClient.initialize(config.database);
      s3Client.initialize(config.s3);
      isInitialized = true;
    } catch (error) {
      // If S3 client is already initialized, that's fine
      if (error instanceof Error && error.message.includes('already initialized')) {
        isInitialized = true;
      } else {
        throw error;
      }
    }
  }
}

//  Set CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(req: NextRequest) {
  try {
    await ensureInitialized();

    const formData = await req.formData();
    const file = formData.get('htmlDoc') || formData.get('file'); // support both names
    const model = formData.get('model')?.toString() ?? 'ChatGPT';

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: '`htmlDoc` must be a file field' }, { status: 400, headers: corsHeaders });
    }

  const html = await file.text();
 const conversation = await parseHtmlToConversation(html, model);

    console.log('\n📋 conversation =>', conversation.model, conversation.content);
    console.log('\n📄 HTML snapshot (truncated):');
    console.log(html.substring(0, 300) + '...');

    const conversationId = randomUUID();
    const contentKey = await s3Client.storeConversation(conversationId, conversation.content);

    // Create the database record with metadata
      const dbInput: CreateConversationInput = {
      model: conversation.model,
      scrapedAt: new Date(conversation.scrapedAt),
      sourceHtmlBytes: conversation.sourceHtmlBytes,
      views: 0,
      contentKey,
    };

    const record = await createConversationRecord(dbInput);

    // Generate the permalink using the database-generated ID
    const permalink = `${process.env.NEXT_PUBLIC_BASE_URL}/conversation/${record.id}`;

    return NextResponse.json(
      { url: permalink },
      {
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        },
      }
    );
  } catch (err) {
    console.error('Error processing conversation:', err);
    return NextResponse.json({ error: 'Internal error, see logs' }, { status: 500 });
  }
}
/**
 * GET /api/conversation
 *
 * Retrieves a list of all conversations with pagination
 *
 * Query parameters:
 * - limit: number (optional) - Maximum number of records to return (default: 50)
 * - offset: number (optional) - Number of records to skip (default: 0)
 *
 * Response:
 * - 200: { conversations: ConversationRecord[] } - Array of conversation records
 * - 400: { error: string } - Invalid request parameters
 * - 500: { error: string } - Server error
 */
export async function GET(req: NextRequest) {
  try {
    // Initialize services on first request
    await ensureInitialized();

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    // Parse and validate query parameters
    const limit = limitParam ? parseInt(limitParam, 10) : 50;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;
 if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Invalid limit parameter. Must be between 1 and 100.' }, { status: 400 });
    }

    if (isNaN(offset) || offset < 0) {
      return NextResponse.json({ error: 'Invalid offset parameter. Must be non-negative.' }, { status: 400 });
    }

    // Retrieve conversations from database
    const conversations = await getAllConversationRecords(limit, offset);

    return NextResponse.json(
      { conversations },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        },
      }
    );
  } catch (err) {
    console.error('Error retrieving conversations:', err);
    return NextResponse.json({ error: 'Internal error, see logs' }, { status: 500 });
  }
}
          