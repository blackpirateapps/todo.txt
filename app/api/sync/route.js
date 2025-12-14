import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const APP_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD;

export async function POST(req) {
  try {
    const { password, content, clientTimestamp } = await req.json();

    // 1. Security Check
    if (password !== APP_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const docId = 'main'; // Single user mode
    const now = Date.now();

    // 2. Fetch current server state
    const result = await db.execute({
      sql: 'SELECT content, updated_at FROM todos WHERE id = ?',
      args: [docId]
    });

    const serverRow = result.rows[0];

    // 3. Logic: First Write
    if (!serverRow) {
      await db.execute({
        sql: 'INSERT INTO todos (id, content, updated_at) VALUES (?, ?, ?)',
        args: [docId, content, now]
      });
      return NextResponse.json({ status: 'synced', timestamp: now });
    }

    const serverTimestamp = serverRow.updated_at;

    // 4. Logic: Client is newer (or equal) -> Update Server
    // We allow a small drift or if client specifically pushed a change
    if (clientTimestamp > serverTimestamp) {
      
      // Save history first
      await db.execute({
        sql: 'INSERT INTO history (parent_id, content, created_at) VALUES (?, ?, ?)',
        args: [docId, serverRow.content, serverTimestamp] // Archive old content
      });

      // Update main
      await db.execute({
        sql: 'UPDATE todos SET content = ?, updated_at = ? WHERE id = ?',
        args: [content, clientTimestamp, docId]
      });

      return NextResponse.json({ status: 'synced', timestamp: clientTimestamp });
    }

    // 5. Logic: Server is newer -> Client is outdated
    // Return the server content so client can update
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