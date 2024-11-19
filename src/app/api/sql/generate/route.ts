import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { question } = await request.json();
    
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const response = await fetch('https://fastapi.mywine.info/generate-sql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ question })
    });

    if (!response.ok) {
      throw new Error(`FastAPI returned status: ${response.status}`);
    }

    const data = await response.json();
    
    // Return only the SQL query from the FastAPI response
    return NextResponse.json({ sql: data.sql });

  } catch (error) {
    console.error('SQL generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate SQL' },
      { status: 500 }
    );
  }
}
