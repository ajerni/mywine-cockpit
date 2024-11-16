'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
  messages: number;
}

const initialStats: Stats = {
  users: { total: 0, pro: 0 },
  images: { folders: 0, total: 0 },
  wines: 0,
  messages: 0
};

export function DashboardContent() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            <p>Wines: {loading ? '...' : stats.wines}</p>
            <p>Messages: {loading ? '...' : stats.messages}</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Users Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Users</h2>
          <div className="space-y-2">
            <p>List of users</p>
            <p>Change Pro status</p>
          </div>
        </div>

        {/* Wines Section */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Wines</h2>
          <p>List of wines</p>
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
          <p>List of messages</p>
        </div>
      </div>
    </div>
  );
} 