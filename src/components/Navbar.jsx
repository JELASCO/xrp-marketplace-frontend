'use client';
import Link             from 'next/link';
import { useRouter }    from 'next/navigation';
import { useState }     from 'react';
import { useAuthStore } from '../lib/store';
import XummLoginModal   from './XummLoginModal';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const [showLogin, setShowLogin] = useState(false);
  const [showMenu,  setShowMenu]  = useState(false);
  const [search,    setSearch]    = useState('');
  const router = useRouter();

  function handleSearch(e) {
    e.preventDefault();
    if (search.trim()) router.push(`/listings?q=${encodeURIComponent(search.trim())}`);
  }

  return (
    <>
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="font-bold text-lg text-gray-900 whitespace-nowrap">
            XRP<span className="text-blue-600">Market</span>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <input
              className="input text-sm"
              placeholder="Search skins, coins, battle pass..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </form>

          <div className="flex items-center gap-3 ml-auto">
            <Link href="/listings" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block font-medium">
              Listings
            </Link>

            {user ? (
              <>
                <Link href="/orders" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block font-medium">
                  My Orders
                </Link>
                <Link href="/listings/new" className="btn-primary btn-sm hidden sm:flex">
                  + List Item
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(v => !v)}
                    className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
                  >
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                      {user.username?.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="hidden sm:block max-w-[80px] truncate">{user.username}</span>
                  </button>

                  {showMenu && (
                    <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl border border-gray-100 shadow-lg py-1 z-50">
                      <Link href={`/profile/${user.id}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setShowMenu(false)}>
                        My Profile
                      </Link>
                      {user.role === 'admin' && (
                        <Link href="/admin" className="block px-4 py-2 text-sm text-blue-600 hover:bg-blue-50" onClick={() => setShowMenu(false)}>
                          Admin Panel
                        </Link>
                      )}
                      <hr className="my-1 border-gray-100" />
                      <button
                        onClick={() => { logout(); setShowMenu(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button onClick={() => setShowLogin(true)} className="btn-primary btn-sm">
                Connect Xumm
              </button>
            )}
          </div>
        </div>
      </nav>

      {showLogin && <XummLoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
