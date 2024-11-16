import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function DELETE(
  request: Request
) {
  try {
    // Extract messageId from URL
    const messageId = request.url.split('/').slice(-2)[0];

    const result = await query(
      'DELETE FROM wine_contact WHERE id = $1',
      [messageId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Failed to delete message:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
} 