import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/middleware/auth';
import { inspectJwtToken } from '@/lib/jwt-utils';

async function generateWithRetry(url: URL, token: string, maxRetries = 3, delay = 1000) {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });

      const data = await response.json();

      if (response.ok) {
        return { response, data };
      }

      // If it's not a server error (5xx), don't retry
      if (response.status < 500) {
        return { response, data };
      }

      throw new Error(`Server error: ${response.status}`);

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.log(`Attempt ${attempt} failed:`, lastError.message);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

export const POST = authMiddleware(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json({ 
        error: 'Prompt is required' 
      }, { status: 400 });
    }
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Invalid authorization header' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    
    const tokenDetails = inspectJwtToken(token);
    console.log('Token being sent to FastAPI:', {
      header: tokenDetails.header,
      payload: tokenDetails.payload,
      signatureLength: tokenDetails.signature.length,
      fullToken: token.substring(0, 20) + '...'
    });

    // Create URL for the generate endpoint
    const url = new URL('https://fastapi.mywine.info/generate-sql');
    url.searchParams.append('prompt', prompt);

    // Use retry mechanism
    const { response, data } = await generateWithRetry(url, token);

    if (!response.ok) {
      // Better error handling for FastAPI validation errors
      if (Array.isArray(data)) {
        const errorMessage = data.map(err => `${err.msg} at ${err.loc.join('.')}`).join('; ');
        return NextResponse.json({ error: errorMessage }, { status: response.status });
      }
      
      const errorMessage = typeof data.detail === 'object' 
        ? JSON.stringify(data.detail) 
        : data.detail || 'Failed to generate SQL query';
      
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    return NextResponse.json({
      generated_sql: data.generated_sql
    });

  } catch (error) {
    console.error('SQL generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate SQL';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
