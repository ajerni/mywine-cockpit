import { NextResponse } from 'next/server';
import ImageKit from 'imagekit';

const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
});

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET() {
  try {
    // Get all files in the wines folder
    const files = await imagekit.listFiles({
      path: '/wines',
      searchQuery: 'type = "file"'  // Only get files, not folders
    });

    // Wait 700ms before next request
    await delay(700);

    // Get all folders in the wines folder
    const folders = await imagekit.listFiles({
      path: '/wines',
      searchQuery: 'type = "folder"'
    });

    // Log folder names
    console.log('Folders found:', folders.map(folder => folder.name));
    const folderNames = folders.map(folder => folder.name);

    let totalFilesInFolders = 0;  // Initialize counter outside Promise.all

    // Count files in each folder with delay between requests
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

    return NextResponse.json({
      totalFolders: folders.length,
      totalFiles: totalFilesInFolders, 
      folderList: folderNames,
    });

  } catch (error) {
    console.error('Error fetching image stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image statistics' },
      { status: 500 }
    );
  }
} 