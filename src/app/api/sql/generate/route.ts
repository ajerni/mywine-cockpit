import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/middleware/auth';
import { inspectJwtToken } from '@/lib/jwt-utils';

async function generateWithRetry(
  url: URL, 
  token: string, 
  maxRetries = 3, 
  delay = 1000,
  body?: any
) {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body)
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
    const { question } = body;

    if (!question) {
      return NextResponse.json({ 
        error: 'Question is required' 
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

    // Create URL for the generate endpoint with question as query parameter
    const url = new URL('https://fastapi.mywine.info/generate-sql');
    url.searchParams.append('question', question);
    
    // Send the request without a body since we're using query parameters
    const { response, data } = await generateWithRetry(
      url, 
      token, 
      3, 
      1000
    );

    if (!response.ok) {
      // Better error handling for FastAPI validation errors
      if (typeof data === 'string') {
        try {
          const parsedErrors = JSON.parse(data);
          if (Array.isArray(parsedErrors)) {
            const errorMessage = parsedErrors.map(err => 
              `${err.msg} at ${err.loc.join('.')}`
            ).join('; ');
            return NextResponse.json({ error: errorMessage }, { status: response.status });
          }
        } catch (e) {
          // If parsing fails, use the original error
        }
      }
      
      const errorMessage = typeof data.detail === 'object' 
        ? JSON.stringify(data.detail) 
        : data.detail || 'Failed to generate SQL query';
      
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    // Add semicolon to the SQL if it doesn't already end with one
    const sqlQuery = data.generated_sql?.trim() || '';
    const formattedSql = sqlQuery.endsWith(';') ? sqlQuery : `${sqlQuery};`;

    return NextResponse.json({
      sql: formattedSql
    });

  } catch (error) {
    console.error('SQL generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate SQL';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});
