import { NextRequest, NextResponse } from 'next/server';
import { parseHtmlToConversation } from '@/lib/parsers';
import { dbClient } from '@/lib/db/client';
import { s3Client } from '@/lib/storage/s3';
// import { CreateConversationInput } from '@/lib/db/types';
// import { createConversationRecord } from '@/lib/db/conversations';
// import { randomUUID } from 'crypto';
import { loadConfig } from '@/lib/config';

let isInitialized = false;

async function ensureInitialized() {
  if (!isInitialized) {
    const config = loadConfig();
    await dbClient.initialize(config.database);
    s3Client.initialize(config.s3);
    isInitialized = true;
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

    // const conversationId = randomUUID();
    // const contentKey = await s3Client.storeConversation(conversationId, conversation.content);

    // const dbInput: CreateConversationInput = {
    //   model: conversation.model,
    //   scrapedAt: new Date(conversation.scrapedAt),
    //   contentKey,
    // };

    // const record = await createConversationRecord(dbInput);
    // const permalink = `${process.env.NEXT_PUBLIC_BASE_URL}/c/${record.id}`;

    // return NextResponse.json({ url: permalink }, { status: 201, headers: corsHeaders });
  } catch (err) {
    console.error('Error processing conversation:', err);
    return NextResponse.json({ error: 'Internal error, see logs' }, { status: 500, headers: corsHeaders });
  }
}
