import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { wineId: string } }
) {
  try {
    const wineId = params.wineId;

    const result = await query(
      `SELECT 
        name, 
        producer, 
        grapes, 
        country, 
        region, 
        year, 
        price, 
        quantity 
      FROM wine_table 
      WHERE id = $1`,
      [wineId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Wine not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to fetch wine details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wine details' },
      { status: 500 }
    );
  }
} 