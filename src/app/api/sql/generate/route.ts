import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // For now, just return a test message
    return NextResponse.json({ sql: "Test click worked!" });
  } catch (error) {
    console.error('SQL generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate SQL' },
      { status: 500 }
    );
  }
}
