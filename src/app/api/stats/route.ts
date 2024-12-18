import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import ImageKit from 'imagekit';

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
    // Make a direct call to imagekit instead of going through another API endpoint
    const imagekit = new ImageKit({
      publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
      urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
    });

    // Get all files in the wines folder
    const files = await imagekit.listFiles({
      path: '/wines',
      searchQuery: 'type = "file"'  // Only get files, not folders
    });

    // Get all folders in the wines folder
    const folders = await imagekit.listFiles({
      path: '/wines',
      searchQuery: 'type = "folder"'
    });

    const folderNames = folders.map(folder => folder.name);

    let totalFilesInFolders = 0;

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const folderStats = await Promise.all(
      folders.map(async (folder, index) => {
        // Wait 700ms before each folder request (except first one)
        if (index > 0) {
          await delay(700);
        }
        
        const folderFiles = await imagekit.listFiles({
          path: folder.filePath,
          searchQuery: 'type = "file"'
        });
        
        totalFilesInFolders = folderFiles.length;  
        
        return {
          name: folder.name,
          folderList: folderNames,
          fileCount: folderFiles.length
        };
      })
    );
    
    return {
      folders: folders.length,
      total: totalFilesInFolders,
      folderList: folderNames
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