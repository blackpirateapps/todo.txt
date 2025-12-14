import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const APP_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD;

export async function POST(req) {
  try {
    const { password, content, clientTimestamp } = await req.json();

    if (password !== APP_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const docId = 'main';
    const now = Date.now();

    const result = await db.execute({
      sql: 'SELECT content, updated_at FROM todos WHERE id = ?',
      args: [docId]
    });

    const serverRow = result.rows[0];

    // Case 1: First Write
    if (!serverRow) {
      await db.execute({
        sql: 'INSERT INTO todos (id, content, updated_at) VALUES (?, ?, ?)',
        args: [docId, content, now]
      });
      return NextResponse.json({ status: 'synced', timestamp: now });
    }

    const serverTimestamp = serverRow.updated_at;

    // Case 2: Client is newer -> Update Server
    if (clientTimestamp > serverTimestamp) {
      // Archive history
      await db.execute({
        sql: 'INSERT INTO history (parent_id, content, created_at) VALUES (?, ?, ?)',
        args: [docId, serverRow.content, serverTimestamp]
      });

      // Update main
      await db.execute({
        sql: 'UPDATE todos SET content = ?, updated_at = ? WHERE id = ?',
        args: [content, clientTimestamp, docId]
      });

      return NextResponse.json({ status: 'synced', timestamp: clientTimestamp });
    }

    // Case 3: Timestamps match (Polling check) -> Do nothing, just confirm sync
    if (clientTimestamp === serverTimestamp) {
      return NextResponse.json({ status: 'synced', timestamp: serverTimestamp });
    }

    // Case 4: Server is newer -> Send update to client
    return NextResponse.json({ 
      status: 'conflict', 
      content: serverRow.content, 
      timestamp: serverTimestamp 
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}