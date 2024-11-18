'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface WineDetailsProps {
  wineId: number;
  onClose: () => void;
}

interface WineDetail {
  name: string;
  producer: string;
  grapes: string;
  country: string;
  region: string;
  year: number;
  price: number;
  quantity: number;
}

interface Photo {
  url: string;
  fileId: string;
}

export function WineDetails({ wineId, onClose }: WineDetailsProps) {
  const [wine, setWine] = useState<WineDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    fetchWineDetails();
  }, [wineId]);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const response = await fetch(`/api/photos/${wineId}`);
        const data = await response.json();
        if (data.photos) {
          setPhotos(data.photos);
        }
      } catch (error) {
        console.error('Error fetching photos:', error);
      }
    };

    if (wineId) {
      fetchPhotos();
    }
  }, [wineId]);

  const fetchWineDetails = async () => {
    try {
      const response = await fetch(`/api/winedetail/${wineId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch wine details');
      }

      const data = await response.json();
      setWine(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wine details');
      console.error('Error fetching wine details:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Details for Wine ID {wineId}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        
        {wine && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold">Name:</p>
              <p>{wine.name}</p>
            </div>
            <div>
              <p className="font-semibold">Producer:</p>
              <p>{wine.producer}</p>
            </div>
            <div>
              <p className="font-semibold">Grapes:</p>
              <p>{wine.grapes}</p>
            </div>
            <div>
              <p className="font-semibold">Country:</p>
              <p>{wine.country}</p>
            </div>
            <div>
              <p className="font-semibold">Region:</p>
              <p>{wine.region}</p>
            </div>
            <div>
              <p className="font-semibold">Year:</p>
              <p>{wine.year}</p>
            </div>
            <div>
              <p className="font-semibold">Price:</p>
              <p>{wine.price}</p>
            </div>
            <div>
              <p className="font-semibold">Quantity:</p>
              <p>{wine.quantity}</p>
            </div>
          </div>
        )}

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Photos</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <div key={photo.fileId} className="relative aspect-square">
                <Image
                  src={photo.url}
                  alt="Wine photo"
                  fill
                  className="object-cover rounded-lg"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 