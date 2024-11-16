import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(
  request: Request
) {
  try {
    const userId = request.url.split('/').slice(-2)[0];

    const result = await query(
      `UPDATE wine_users 
       SET has_proaccount = NOT has_proaccount 
       WHERE id = $1 
       RETURNING has_proaccount`,
      [userId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      isPro: result.rows[0].has_proaccount
    });

  } catch (error) {
    console.error('Failed to toggle pro status:', error);
    return NextResponse.json(
      { error: 'Failed to update user pro status' },
      { status: 500 }
    );
  }
} 