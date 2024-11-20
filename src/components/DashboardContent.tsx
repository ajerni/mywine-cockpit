'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DataList } from './lists/DataList';
import { Column, ListParams, ListResponse, Filter } from '@/types/lists';
import { WineDetails } from './WineDetails';

interface Stats {
  users: {
    total: number;
    pro: number;
  };
  images: {
    folders: number;
    total: number;
    folderList: string[];
  };
  wines: number;
  notes: number;
  ai_summaries: number;
  messages: number;
}

const initialStats: Stats = {
  users: { total: 0, pro: 0 },
  images: { folders: 0, total: 0, folderList: [] },
  wines: 0,
  notes: 0,
  ai_summaries: 0,
  messages: 0
};

interface ListConfig {
  title: string;
  columns: Column[];
  onRowClick?: (row: any) => void;
}

interface SQLQueryResult {
  columns: string[];
  rows: any[];
  error?: string;
}

export function DashboardContent() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeList, setActiveList] = useState<string | null>(null);
  const [selectedWineId, setSelectedWineId] = useState<number | null>(null);
  const [sqlQuestion, setSqlQuestion] = useState('');
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState<SQLQueryResult | null>(null);
  const [isLoadingImageFolders, setIsLoadingImageFolders] = useState(false);

  useEffect(() => {
    fetchStats();
    
  }, []);

  useEffect(() => {
    console.log('Current stats:', stats);
  }, [stats]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Stats fetch failed:', response.status, text);
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }

      const data = await response.json();
      console.log('Stats fetched successfully:', data);
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (user: any) => {
    try {
      const response = await fetch(`/api/users/${user.id}/toggle-pro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user pro status');
      }
      
      fetchStats();
      setActiveList(null);
      setTimeout(() => setActiveList('users'), 100);
      
      console.log('Successfully updated user:', user);
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete message');
      }
      
      // Refresh stats and list
      fetchStats();
      setActiveList(null);
      setTimeout(() => setActiveList('messages'), 100);
      
      console.log('Successfully deleted message:', messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const handleExecuteSQL = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const cleanToken = token.replace(/^Bearer\s+/i, '');

      const response = await fetch('/api/sql/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanToken}`,
        },
        body: JSON.stringify({ 
          sql_query: sqlQuery 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to execute SQL query: ${response.status}`);
      }

      const data = await response.json();
      setQueryResult(data);
    } catch (error) {
      console.error('Failed to execute SQL:', error);
      setQueryResult({ 
        columns: ['error'], 
        rows: [{ error: error instanceof Error ? error.message : 'Failed to execute SQL query' }], 
        error: error instanceof Error ? error.message : 'Failed to execute SQL query'
      });
    }
  };

  const handleGenerateSQL = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const cleanToken = token.replace(/^Bearer\s+/i, '');

      const response = await fetch('/api/sql/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cleanToken}`,
        },
        body: JSON.stringify({ question: sqlQuestion }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate SQL');
      }

      const data = await response.json();
      setSqlQuery(data.sql.trim().replace(/;*$/, ';'));
    } catch (error) {
      console.error('Failed to generate SQL:', error);
    }
  };

  const handleImageFoldersClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoadingImageFolders) return;
    
    setIsLoadingImageFolders(true);
    
    setActiveList((currentList) => {
      if (currentList === 'image_folders') {
        setIsLoadingImageFolders(false);
        return currentList;
      }
      return 'image_folders';
    });
    
    setTimeout(() => {
      setIsLoadingImageFolders(false);
    }, 100);
  };

  const handleOrphanedFoldersClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoadingImageFolders) return;
    
    setIsLoadingImageFolders(true);
    
    try {
      const token = localStorage.getItem('auth_token');
      console.log('Fetching orphaned folders...');
      
      const response = await fetch('/api/lists/orphaned_image_folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      if (!response.ok) {
        throw new Error(`Failed to fetch orphaned folders: ${response.status} - ${responseText}`);
      }

      // Only parse as JSON if we have content
      const data = responseText ? JSON.parse(responseText) : null;
      if (!data) {
        throw new Error('No data received from server');
      }

      console.log('Orphaned folders data:', data);
      setActiveList('orphaned_image_folders');
    } catch (error) {
      console.error('Failed to fetch orphaned folders:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch orphaned folders');
    } finally {
      setIsLoadingImageFolders(false);
    }
  };

  const LIST_CONFIGS: Record<string, ListConfig & { defaultSort?: { field: string; direction: 'ASC' | 'DESC' } }> = {
    users: {
      title: 'Users List',
      columns: [
        { key: 'id', label: 'ID', sortable: true },
        { key: 'username', label: 'Username', sortable: true, filterable: true },
        { key: 'email', label: 'Email', sortable: true, filterable: true },
        { 
          key: 'isPro', 
          label: 'Pro Status', 
          sortable: true, 
          filterable: true,
          render: (value) => (
            <span className={value ? 'text-green-600' : 'text-gray-600'}>
              {value ? 'Pro' : 'Basic'}
            </span>
          )
        },
        { 
          key: 'createdAt', 
          label: 'Created At', 
          sortable: true,
          render: (value) => new Date(value).toLocaleDateString()
        },
        {
          key: 'actions',
          label: 'Actions',
          render: (_, row) => (
            <button
              onClick={() => handleUserAction(row)}
              className="text-blue-500 hover:text-blue-700"
            >
              Toggle Pro Status
            </button>
          ),
        },
      ],
    },
    wines: {
      title: 'Wines List',
      columns: [
        { key: 'wine_id', label: 'ID', sortable: true },
        { key: 'wine_name', label: 'Name', sortable: true, filterable: true },
        { key: 'year', label: 'Year', sortable: true, filterable: true },
        { key: 'user_id', label: 'User ID', sortable: true },
        { key: 'username', label: 'Username', sortable: true, filterable: true },
      ],
      onRowClick: (row) => setSelectedWineId(row.wine_id),
    },
    messages: {
      title: 'Contact Messages',
      columns: [
        { key: 'id', label: 'ID', sortable: true },
        { key: 'user_id', label: 'User ID', sortable: true },
        { key: 'first_name', label: 'First Name', sortable: true, filterable: true },
        { key: 'last_name', label: 'Last Name', sortable: true, filterable: true },
        { key: 'email', label: 'Email', sortable: true, filterable: true },
        { key: 'subject', label: 'Subject', sortable: true, filterable: true },
        { key: 'message', label: 'Message', filterable: true },
        { 
          key: 'timestamp', 
          label: 'Time', 
          sortable: true,
          render: (value) => new Date(value).toLocaleString()
        },
        {
          key: 'actions',
          label: 'Actions',
          render: (_, row) => (
            <button
              onClick={() => handleDeleteMessage(row.id)}
              className="text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          ),
        },
      ],
    },
    users_wine_count: {
      title: 'Users Wine Count',
      columns: [
        { key: 'id', label: 'User ID', sortable: true },
        { key: 'username', label: 'Username', sortable: true, filterable: true },
        { 
          key: 'wine_count', 
          label: 'Number of Wines', 
          sortable: true,
          render: (value) => (
            <span className="font-mono">{value}</span>
          )
        },
      ],
      defaultSort: {
        field: 'wine_count',
        direction: 'DESC'
      }
    },
    image_folders: {
      title: 'Image Folders',
      columns: [
        { key: 'folder_name', label: 'Folder Name', sortable: true, filterable: true },
        { 
          key: 'file_count', 
          label: 'Number of Files', 
          sortable: true,
          render: (value) => (
            <span className="font-mono">{value}</span>
          )
        },
        { 
          key: 'created_at', 
          label: 'Created At', 
          sortable: true,
          render: (value) => new Date(value).toLocaleDateString()
        },
      ],
      defaultSort: {
        field: 'file_count',
        direction: 'DESC'
      }
    },
    orphaned_image_folders: {
      title: 'Orphaned Image Folders',
      columns: [
        { key: 'folder_name', label: 'Folder Name', sortable: true, filterable: true },
        { 
          key: 'created_at', 
          label: 'Created At', 
          sortable: true,
          render: (value) => new Date(value).toLocaleDateString()
        },
      ],
      defaultSort: {
        field: 'folder_name',
        direction: 'ASC'
      }
    },
  };

  return (
    <div className="min-h-screen bg-[#6200EE] p-4">
      {/* Header */}
      <header className="flex justify-between items-center mb-6 text-white">
        <h1 className="text-2xl font-semibold">MyWine.info Admin Cockpit</h1>
        <button 
          onClick={handleLogout}
          className="bg-white text-black px-4 py-2 rounded-md flex items-center gap-2 hover:bg-gray-100"
        >
          <span>Sign out</span>
        </button>
      </header>

      {/* Stats Overview */}
      <div className="bg-white rounded-lg p-6 mb-6">
        {error && (
          <div className="text-red-500 mb-4">
            Error loading stats: {error}
          </div>
        )}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p>Users Total: {loading ? '...' : stats.users.total}</p>
            <p>Pro Users: {loading ? '...' : stats.users.pro}</p>
          </div>
          <div>
            <p>Image folders: {loading ? '...' : stats.images.folders}</p>
            <p>Images: {loading ? '...' : stats.images.total}</p>
          </div>
          <div>
            <p>Wines: {loading ? '...' : `${stats.wines} (${stats.notes || 0} notes, ${stats.ai_summaries || 0} AI summaries)`}</p>
            <p>Messages: {loading ? '...' : stats.messages}</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Users Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Users</h2>
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => setActiveList('users')}
              className="text-blue-500 hover:text-blue-700 text-left"
            >
              List of users & Change pro status
            </button>
            <button
              onClick={() => setActiveList('users_wine_count')}
              className="text-blue-500 hover:text-blue-700 text-left"
            >
              Count of wines per user
            </button>
          </div>
        </div>

        {/* Wines Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Wines</h2>
          <button
            onClick={() => setActiveList('wines')}
            className="text-blue-500 hover:text-blue-700"
          >
            List of wines
          </button>
        </div>

        {/* Images Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Images</h2>
          <div className="flex flex-col space-y-2">
            <button
              onClick={handleImageFoldersClick}
              disabled={isLoadingImageFolders}
              className={`text-blue-500 hover:text-blue-700 text-left ${
                isLoadingImageFolders ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              List of image folders with amount of images
            </button>
            <button
              onClick={handleOrphanedFoldersClick}
              className="text-blue-500 hover:text-blue-700 text-left"
            >
              List of image folders without wine
            </button>
          </div>
        </div>

        {/* Contact Messages Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Contact Messages</h2>
          <button
            onClick={() => setActiveList('messages')}
            className="text-blue-500 hover:text-blue-700"
          >
            List of messages
          </button>
        </div>
      </div>

      {/* SQL Query Section */}
      <div className="mt-6 bg-white rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Custom SQL Queries</h2>
        <div className="grid grid-cols-3 gap-4">
          {/* Question Box */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Question</h3>
            <textarea
              className="w-full h-32 p-2 border rounded mb-2 font-mono"
              placeholder="Enter your question here..."
              value={sqlQuestion}
              onChange={(e) => setSqlQuestion(e.target.value)}
            />
            <button
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={handleGenerateSQL}
            >
              Get SQL query
            </button>
          </div>

          {/* SQL Box */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">SQL</h3>
            <textarea
              className="w-full h-32 p-2 border rounded mb-2 font-mono"
              placeholder="Enter SQL query here..."
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
            />
            <button
              className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              onClick={handleExecuteSQL}
            >
              Execute SQL
            </button>
          </div>

          {/* Result Box */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Result</h3>
            <div className="h-40 overflow-auto">
              {queryResult?.error ? (
                <div className="text-red-500">
                  {typeof queryResult.error === 'object' 
                    ? JSON.stringify(queryResult.error, null, 2)
                    : queryResult.error}
                </div>
              ) : queryResult ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      {queryResult.columns.map((col, i) => (
                        <th key={i} className="border p-1 bg-gray-100">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.rows.map((row, i) => (
                      <tr key={i}>
                        {queryResult.columns.map((col, j) => (
                          <td key={j} className="border p-1">
                            {typeof row[col] === 'object' 
                              ? JSON.stringify(row[col]) 
                              : String(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-gray-500 italic">
                  Query results will appear here...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add the DataList modal */}
      {activeList && LIST_CONFIGS[activeList] && (
        <DataList
          listId={activeList}
          {...LIST_CONFIGS[activeList]}
          defaultSort={LIST_CONFIGS[activeList].defaultSort}
          onClose={() => setActiveList(null)}
          onRowClick={LIST_CONFIGS[activeList].onRowClick}
        />
      )}

      {/* Add the WineDetails modal */}
      {selectedWineId && (
        <WineDetails
          wineId={selectedWineId}
          onClose={() => setSelectedWineId(null)}
        />
      )}
    </div>
  );
} 