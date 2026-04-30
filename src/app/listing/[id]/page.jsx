'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { useAuthStore } from '../../../lib/store';

export default function ListingDetailPage({ params }) {
  const { id } = params;
  const user = useAuthStore(s => s.user);
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listings.get(id).then(setListing).catch(() => {});
    setLoading(false);
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!listing) return <div>Listing not found</div>;

  const isSeller = user?.id === listing.seller_id;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link href="/" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
        ← Back to marketplace
      </Link>
      <h1 className="text-3xl font-bold text-white mb-4">{listing.title}</h1>
      <div className="text-2xl font-bold text-green-400 mb-6">
        {listing.price_xrp} XRP
      </div>
      <p className="text-gray-300">{listing.description}</p>
      {isSeller && (
        <div className="mt-6">
          <span className="text-gray-400 text-sm">This is your listing</span>
          <Link href={`/listing/${id}/edit`} className="ml-4 text-blue-400 hover:text-blue-300">
            ✏️ Edit Listing
          </Link>
        </div>
      )}
    </div>
  );
}
