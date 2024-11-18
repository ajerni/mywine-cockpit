import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { sql } = await request.json();
    
    // For now, just return a mock message
    return NextResponse.json({
      columns: ['result'],
      rows: [{ result: `Mockup return for: ${sql}` }]
    });
  } catch (error) {
    console.error('SQL execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute SQL' },
      { status: 500 }
    );
  }
}
