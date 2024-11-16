import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // We'll collect all stats in parallel for better performance
    const stats = await Promise.all([
      // You can add your SQL queries here as we go along
      // Example structure:
      getUserStats(),
      getImageStats(),
      getWineCount(),
      getMessageCount(),
    ]);

    const [userStats, imageStats, wineCount, messageCount] = stats;

    return NextResponse.json({
      users: userStats,
      images: imageStats,
      wines: wineCount,
      messages: messageCount,
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

async function getUserStats() {
  // We'll add your SQL query here
  return { total: 0, pro: 0 };
}

async function getImageStats() {
  // We'll add your SQL query here
  return { folders: 0, total: 0 };
}

interface WineCount {
  total_wine_entries: number;
}

async function getWineCount(): Promise<number> {
  const result = await query<WineCount>(
    `select
      count(*) as total_wine_entries
    from
      wine_table`
  );
  
  return Number(result.rows[0]?.total_wine_entries) || 0;
}

async function getMessageCount() {
  // We'll add your SQL query here
  return 0;
} 