'use client';

import { useRouter } from 'next/navigation';

export function DashboardContent() {
  const router = useRouter();
  const stats = {
    users: {total: 20, pro: 10},
    images: {folders: 0, total: 0},
    wines: 38,
    messages: 5
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
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p>Users Total: {stats.users.total}</p>
            <p>Pro Users: {stats.users.pro}</p>
          </div>
          <div>
            <p>Image folders: {stats.images.folders}</p>
            <p>Images: {stats.images.total}</p>
          </div>
          <div>
            <p>Wines: {stats.wines}</p>
            <p>Messages: {stats.messages}</p>
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