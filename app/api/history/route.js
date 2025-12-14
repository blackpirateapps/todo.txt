import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const APP_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD;

export async function POST(req) {
  try {
    const { password, action, id } = await req.json();

    // Security Check
    if (password !== APP_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const docId = 'main';

    // ACTION: List recent versions
    if (action === 'list') {
      const result = await db.execute({
        sql: 'SELECT id, created_at FROM history WHERE parent_id = ? ORDER BY created_at DESC LIMIT 50',
        args: [docId]
      });
      return NextResponse.json({ history: result.rows });
    }

    // ACTION: Get specific version content
    if (action === 'get' && id) {
      const result = await db.execute({
        sql: 'SELECT content FROM history WHERE id = ?',
        args: [id]
      });
      const row = result.rows[0];
      return NextResponse.json({ content: row ? row.content : '' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}