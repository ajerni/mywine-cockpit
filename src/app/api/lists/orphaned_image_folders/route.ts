import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import ImageKit from 'imagekit';

const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
});

export async function POST(request: Request) {
  try {
    // Get all folders from ImageKit
    const folders = await imagekit.listFiles({
      path: '/wines',
      searchQuery: 'type = "folder"'
    });

    // Get all wine IDs from database
    const wineResult = await query(
      'SELECT id FROM wine_table'
    );
    const wineIds = new Set(wineResult.rows.map(row => row.id.toString()));

    // Find folders that don't have corresponding wine IDs
    const orphanedFolders = folders.filter(folder => !wineIds.has(folder.name));

    // Format the response
    const formattedFolders = orphanedFolders.map(folder => ({
      folder_name: folder.name,
      created_at: folder.createdAt
    }));

    return NextResponse.json({
      data: formattedFolders,
      total: formattedFolders.length,
      page: 1,
      pageSize: formattedFolders.length
    });

  } catch (error) {
    console.error('Error fetching orphaned folders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orphaned folders' },
      { status: 500 }
    );
  }
} 