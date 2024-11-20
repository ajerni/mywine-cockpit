import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const stats = await Promise.all([
      // You can add your SQL queries here as we go along
      // Example structure:
      getUserStats(),
      getImageStats(),
      getWineCount(),
      getNotesCount(),
      getAISummaryCount(),
      getMessageCount(),
    ]);

    const [userStats, imageStats, wineCount, notesCount, aiSummaryCount, messageCount] = stats;

    return NextResponse.json({
      users: userStats,
      images: imageStats,
      wines: wineCount,
      notes: notesCount,
      ai_summaries: aiSummaryCount,
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

interface UserStats {
  total_users: number;
  pro_users: number;
}

async function getUserStats(): Promise<{ total: number; pro: number }> {
  const result = await query<UserStats>(
    `SELECT 
      COUNT(*) AS total_users,
      COUNT(CASE WHEN has_proaccount = true THEN 1 END) AS pro_users
    FROM 
      wine_users`
  );
  
  return {
    total: Number(result.rows[0]?.total_users) || 0,
    pro: Number(result.rows[0]?.pro_users) || 0
  };
}

interface ImageStats {
  folders: number;
  total: number;
  folderList: string[];
}

async function getImageStats(): Promise<ImageStats> {
  try {
    // Ensure NEXTAUTH_URL is available and properly formatted
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/imagestats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add cache: 'no-store' to prevent caching
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error('Failed to fetch image stats:', response.status, response.statusText);
      return { folders: 0, total: 0, folderList: [] };
    }

    const data = await response.json();
    
    // Add more detailed logging
    console.log('Image stats response:', data);
    
    return {
      folders: data.totalFolders || 0,
      total: data.totalFiles || 0,
      folderList: data.folderList || [],
    };
  } catch (error) {
    console.error('Error in getImageStats:', error);
    return { folders: 0, total: 0, folderList: [] };
  }
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

interface NotesCount {
    total_notes_entries: number;
  }
  
  async function getNotesCount(): Promise<number> {
    const result = await query<NotesCount>(
      `select
        count(*) as total_notes_entries
      from
        wine_notes`
    );
    
    return Number(result.rows[0]?.total_notes_entries) || 0;
  }


  interface AISummaryCount {
    total_ai_summary_entries: number;
  }
  
  async function getAISummaryCount(): Promise<number> {
    const result = await query<AISummaryCount>(
      `select
        count(*) as total_ai_summary_entries
      from
        wine_aisummaries`
    );
    
    return Number(result.rows[0]?.total_ai_summary_entries) || 0;
  }


interface MessageCount {
  total_contact_entries: number;
}

async function getMessageCount(): Promise<number> {
  const result = await query<MessageCount>(
    `select
      count(*) as total_contact_entries
    from
      wine_contact`
  );
  
  return Number(result.rows[0]?.total_contact_entries) || 0;
} 