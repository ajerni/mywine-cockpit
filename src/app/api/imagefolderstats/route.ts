import { NextResponse } from 'next/server';
import ImageKit from 'imagekit';

const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
});

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function POST(request: Request) {
  try {
    const { page, pageSize, sortBy, sortDirection } = await request.json();
    
    // Get all folders in the wines folder
    const folders = await imagekit.listFiles({
      path: '/wines',
      searchQuery: 'type = "folder"'
    });

    // Get file count for each folder with delay between requests
    const folderStats = await Promise.all(
      folders.map(async (folder, index) => {
        // Wait 700ms before each folder request (except first one)
        if (index > 0) {
          await delay(700);
        }
        
        // Get files only within this specific folder
        const folderFiles = await imagekit.listFiles({
          path: `/wines/${folder.name}`,  // Use folder name to get correct path
          searchQuery: 'type = "file"'    // Only get files, not subfolders
        });
        
        return {
          folder_name: folder.name,
          file_count: folderFiles.length,
          created_at: folder.createdAt
        };
      })
    );

    // Sort the results if requested
    if (sortBy) {
      folderStats.sort((a: any, b: any) => {
        const multiplier = sortDirection === 'desc' ? -1 : 1;
        if (sortBy === 'file_count') {
          // Numeric sort for file count
          return multiplier * (Number(a[sortBy]) - Number(b[sortBy]));
        }
        // String sort for other fields
        return multiplier * (String(a[sortBy]).localeCompare(String(b[sortBy])));
      });
    }

    // Apply pagination
    const start = (page - 1) * pageSize;
    const paginatedResults = folderStats.slice(start, start + pageSize);

    return NextResponse.json({
      data: paginatedResults,
      total: folderStats.length,
      page,
      pageSize
    });
  } catch (error) {
    console.error('Error fetching image folder stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image folder statistics' },
      { status: 500 }
    );
  }
} 