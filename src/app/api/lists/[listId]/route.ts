import { NextRequest, NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/db';
import { ListParams } from '@/types/lists';
import ImageKit from 'imagekit';
import { authMiddleware } from '@/middleware/auth';

const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
});

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Define allowed sort keys for folder stats
type FolderStatKeys = 'folder_name' | 'file_count' | 'created_at';

export const POST = authMiddleware(async (request: Request) => {
  try {
    // Get listId from URL
    const listId = request.url.split('/').pop();
    const body: ListParams = await request.json();

    // Special handling for image folders list
    if (listId === 'image_folders') {
      try {
        // Get all folders from ImageKit
        const folders = await imagekit.listFiles({
          path: '/wines',
          searchQuery: 'type = "folder"'
        });

        // Add delay to avoid rate limiting
        await delay(700);

        // Get file count for each folder
        const folderStats = await Promise.all(
          folders.map(async (folder, index) => {
            // Add delay between requests
            if (index > 0) {
              await delay(700);
            }

            const folderFiles = await imagekit.listFiles({
              path: `/wines/${folder.name}`,
              searchQuery: 'type = "file"'
            });

            return {
              folder_name: folder.name,
              file_count: folderFiles.length,
              created_at: folder.createdAt
            };
          })
        );

        // Apply sorting if requested
        if (body.sortBy) {
          folderStats.sort((a, b) => {
            const multiplier = body.sortDirection === 'desc' ? -1 : 1;
            
            // Type guard to ensure sortBy is a valid key
            const sortKey = body.sortBy as FolderStatKeys;
            
            if (sortKey === 'file_count') {
              return multiplier * (a.file_count - b.file_count);
            }
            
            // Type assertion since we know these properties exist
            const aValue = String(a[sortKey]);
            const bValue = String(b[sortKey]);
            return multiplier * aValue.localeCompare(bValue);
          });
        }

        // Apply pagination
        const start = (body.page - 1) * body.pageSize;
        const paginatedResults = folderStats.slice(start, start + body.pageSize);

        return NextResponse.json({
          data: paginatedResults,
          total: folderStats.length,
          page: body.page,
          pageSize: body.pageSize
        });
      } catch (error) {
        console.error('Image folders list error:', error);
        return NextResponse.json(
          { error: 'Failed to fetch image folder statistics' },
          { status: 500 }
        );
      }
    }

    // Here you'll implement the specific SQL queries for each list type
    let query = '';
    let countQuery = '';
    let values: any[] = [];

    // Define column mappings for all list types
    const columnMappings: Record<string, Record<string, string>> = {
      wines: {
        'wine_id': 'wt.id',
        'wine_name': 'wt.name',
        'year': 'wt.year',
        'user_id': 'wu.id',
        'username': 'wu.username'
      },
      users: {
        'id': 'id',
        'username': 'username',
        'email': 'email',
        'isPro': 'has_proaccount',
        'createdAt': 'created_at'
      },
      messages: {
        'id': 'id',
        'user_id': 'user_id',
        'first_name': 'first_name',
        'last_name': 'last_name',
        'email': 'email',
        'subject': 'subject',
        'message': 'message',
        'timestamp': 'timestamp'
      },
      users_wine_count: {
        'id': 'wu.id',
        'username': 'wu.username',
        'wine_count': 'wine_count'
      }
    };

    switch (listId) {
      case 'users':
        query = `SELECT 
          id, 
          username, 
          email, 
          has_proaccount as "isPro", 
          created_at as "createdAt" 
        FROM wine_users`;
        countQuery = `SELECT COUNT(*) as total FROM wine_users`;
        break;
      case 'wines':
        query = `SELECT 
          wt.id AS wine_id,
          wt.name AS wine_name,
          wt.year,
          wu.id AS user_id,
          wu.username
        FROM 
          wine_table wt
        JOIN 
          wine_users wu ON wt.user_id = wu.id`;
        countQuery = `SELECT COUNT(*) as total 
          FROM wine_table wt 
          JOIN wine_users wu ON wt.user_id = wu.id`;
        break;
      case 'messages':
        query = `SELECT 
          id, 
          user_id, 
          first_name, 
          last_name, 
          email, 
          subject, 
          message, 
          timestamp 
        FROM wine_contact`;
        countQuery = `SELECT COUNT(*) as total FROM wine_contact`;
        break;
      case 'users_wine_count':
        query = `SELECT 
          wu.id,
          wu.username,
          COUNT(wt.id) AS wine_count
        FROM 
          wine_users wu
        LEFT JOIN 
          wine_table wt ON wu.id = wt.user_id
        GROUP BY 
          wu.id, wu.username`;
        countQuery = `SELECT COUNT(*) as total FROM wine_users`;
        break;
      default:
        throw new Error('Invalid list type');
    }

    // Add filters
    if (body.filters && body.filters.length > 0) {
      const whereConditions = body.filters
        .map((filter) => {
          let columnName = filter.column;
          
          // Use the appropriate column mapping for the current list type
          if (listId && listId in columnMappings) {
            columnName = columnMappings[listId][filter.column] || filter.column;
          }
          
          values.push(`%${filter.value.toLowerCase()}%`);
          return `LOWER(${columnName}::text) LIKE $${values.length}`;
        })
        .join(' AND ');
      
      // Add WHERE clause to both queries before pagination
      query += ` WHERE ${whereConditions}`;
      countQuery += ` WHERE ${whereConditions}`;
    }

    // Add sorting before pagination
    if (body.sortBy) {
      let sortColumn = body.sortBy;
      
      // Use the same column mappings for sorting
      if (listId && listId in columnMappings) {
        sortColumn = columnMappings[listId][body.sortBy] || body.sortBy;
      }
      
      query += ` ORDER BY ${sortColumn} ${body.sortDirection || 'ASC'}`;
    }

    // First get the total count
    const countResult = await dbQuery(countQuery, values);

    // Then add pagination and get the page data
    query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(body.pageSize, (body.page - 1) * body.pageSize);

    const data = await dbQuery(query, values);

    return NextResponse.json({
      data: data.rows,
      total: parseInt(countResult.rows[0].total),
      page: body.page,
      pageSize: body.pageSize,
    });
  } catch (error) {
    console.error('List API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch list data' },
      { status: 500 }
    );
  }
}); 