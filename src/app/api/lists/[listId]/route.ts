import { NextRequest, NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/db';
import { ListParams } from '@/types/lists';

export async function POST(
  request: NextRequest,
  { params }: { params: { listId: string } }
) {
  try {
    const { listId } = params;
    const body: ListParams = await request.json();

    // Here you'll implement the specific SQL queries for each list type
    // This is just a placeholder structure
    let query = '';
    let countQuery = '';
    let values: any[] = [];

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
        query = `SELECT * FROM wines`;
        countQuery = `SELECT COUNT(*) as total FROM wines`;
        break;
      // Add more cases as needed
      default:
        throw new Error('Invalid list type');
    }

    // Add filters
    if (body.filters && body.filters.length > 0) {
      const whereConditions = body.filters
        .map((filter, index) => {
          values.push(`%${filter.value}%`);
          return `${filter.column} LIKE $${values.length}`;
        })
        .join(' AND ');
      query += ` WHERE ${whereConditions}`;
      countQuery += ` WHERE ${whereConditions}`;
    }

    // Add sorting
    if (body.sortBy) {
      query += ` ORDER BY ${body.sortBy} ${body.sortDirection || 'ASC'}`;
    }

    // Add pagination
    query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(body.pageSize, (body.page - 1) * body.pageSize);

    const [data, countResult] = await Promise.all([
      dbQuery(query, values),
      dbQuery(countQuery, values.slice(0, -2)),
    ]);

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
} 