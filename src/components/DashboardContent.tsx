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
  };
  wines: number;
  notes: number;
  ai_summaries: number;
  messages: number;
}

const initialStats: Stats = {
  users: { total: 0, pro: 0 },
  images: { folders: 0, total: 0 },
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

export function DashboardContent() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeList, setActiveList] = useState<string | null>(null);
  const [selectedWineId, setSelectedWineId] = useState<number | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
      console.error('Error fetching stats:', err);
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
          <div className="space-y-2">
            <p>List of image folders with amount of images</p>
            <p>List of image folders without wine</p>
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