import { Pool, QueryResult, QueryResultRow } from 'pg';

// Create a single pool instance that can be reused
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' 
    ? {
        rejectUnauthorized: false
      }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

// Add error handling for the pool itself
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

async function query<T extends QueryResultRow>(
  queryText: string, 
  values: any[] = [], 
  retries = 3
): Promise<QueryResult<T>> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    const client = await pool.connect();
    
    try {
      console.log(`Executing query (attempt ${attempt}/${retries}):`, {
        text: queryText,
        values: values.map(v => typeof v === 'string' ? v.substring(0, 50) : v)
      });

      const result = await client.query<T>(queryText, values);
      console.log('Query completed successfully, rows:', result.rows.length);
      return result;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`Database query error (attempt ${attempt}/${retries}):`, {
        error: lastError.message,
        stack: lastError.stack,
        query: queryText,
        values: values.map(v => typeof v === 'string' ? v.substring(0, 50) : v)
      });

      // If this isn't the last attempt, wait before retrying
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }

    } finally {
      client.release();
    }
  }

  // If we get here, all retries failed
  throw new Error(`Database query failed after ${retries} attempts: ${lastError?.message}`);
}

// Function to close the pool (useful for testing or cleanup)
async function closePool(): Promise<void> {
  await pool.end();
}

export { query, closePool }; 