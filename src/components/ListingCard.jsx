import Link from 'next/link';
import clsx from 'clsx';

const CAT_BADGE = { skin:'badge-purple', coin:'badge-teal', bp:'badge-amber', account:'badge-gray', physical:'badge-gray', nft:'badge-green' };
const CAT_LABEL = { skin:'Skin', coin:'Coin', bp:'Battle Pass', account:'Account', physical:'Physical', nft:'NFT' };

export default function ListingCard({ listing }) {
  const { id, title, category, game, price_xrp, images, is_featured, username, reputation_score, is_verified } = listing;
  const img = images?.[0];

  return (
    <Link href={`/listing/${id}`} className={clsx(
      'block bg-white rounded-xl border transition-all hover:border-gray-300 hover:-translate-y-0.5 hover:shadow-md overflow-hidden',
      is_featured ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-100'
    )}>
      <div className="relative h-36 bg-gray-50 flex items-center justify-center text-4xl">
        {img ? <img src={img} alt={title} className="w-full h-full object-cover" /> : <span>🎮</span>}
        <span className={clsx('absolute bottom-2 left-2', CAT_BADGE[category] || 'badge-gray')}>
          {CAT_LABEL[category] || category}
        </span>
        {is_featured && <span className="absolute top-2 right-2 badge bg-amber-400 text-amber-900">★</span>}
      </div>
      <div className="p-3">
        <p className="text-sm font-medium truncate mb-0.5 text-gray-900">{title}</p>
        {game && <p className="text-xs text-gray-400 mb-2">{game}</p>}
        <div className="flex items-end justify-between">
          <div>
            <span className="text-base font-bold text-gray-900">{Number(price_xrp).toLocaleString()}</span>
            <span className="text-xs text-gray-400 ml-1">XRP</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            {is_verified && <span className="text-blue-500">✓</span>}
            <span>{username}</span>
            {reputation_score > 0 && <span className="text-amber-500">★{Number(reputation_score).toFixed(1)}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}
