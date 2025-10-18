"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const match = document.cookie.match(/(?:^|; )token=([^;]+)/);
    setIsAuthed(!!match);
  }, []);

  if (pathname === '/login') return null;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="flex shadow-md py-4 px-4 sm:px-10 min-h-[70px] tracking-wide relative z-50" style={{backgroundColor: '#00203FFF'}}>
      <div className="flex items-center justify-between w-full">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <img 
            src="https://img.freepik.com/free-vector/bird-colorful-logo-gradient-vector_343694-1365.jpg" 
            alt="logo" 
            className="w-9 sm:w-12" 
          />
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden lg:flex items-center space-x-6">
          {/* <Link href="/pricing" className="hover:text-red-100 text-[#AEDFD1FF] font-medium text-[15px]">
            Bảng giá
          </Link> */}
              <Link href="/" className="hover:text-red-100 text-[#AEDFD1FF] font-medium text-[15px]">
            Trang chủ
          </Link>
          <Link href="/booking" className="hover:text-red-100 text-[#AEDFD1FF] font-medium text-[15px]">
            Quản lý bàn
          </Link>
          <Link href="/customer" className="hover:text-red-100 text-[#AEDFD1FF] font-medium text-[15px]">
            Quản lý khách hàng
          </Link>
        </nav>

        {/* Desktop Auth */}
        <div className="hidden lg:flex items-center">
          {hydrated && isAuthed && (
            <Link 
              href="/logout" 
              className="px-4 py-2 text-sm rounded-full font-medium cursor-pointer tracking-wide text-[#AEDFD1FF] border border-[#AEDFD1FF] bg-transparent hover:bg-gray-50 transition-all"
            >
              Logout
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={toggleMobileMenu}
          className="lg:hidden p-2 text-[#AEDFD1FF] hover:text-red-100 transition-colors"
          aria-label="Toggle mobile menu"
        >
          <svg 
            className="w-6 h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50" 
            onClick={closeMobileMenu}
          />
          
          {/* Menu Panel */}
          <div className="fixed top-0 right-0 h-full w-full  bg-[#00203FFF] shadow-xl text-[#AEDFD1FF]">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Menu</h2>
                <button
                  onClick={closeMobileMenu}
                  className="p-2 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Menu Items */}
              <nav className="flex-1 p-4">
                <ul className="space-y-4">
                  {/* <li>
                    <Link 
                      href="/pricing" 
                      className="block px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors"
                      onClick={closeMobileMenu}
                    >
                      Bảng giá
                    </Link>
                  </li> */}
                  <li>
                    <Link 
                      href="/booking" 
                      className="block px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors"
                      onClick={closeMobileMenu}
                    >
                      Quản lý bàn
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/customer" 
                      className="block px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors"
                      onClick={closeMobileMenu}
                    >
                      Quản lý khách hàng
                    </Link>
                  </li>
                </ul>
              </nav>

              {/* Auth Section */}
              {hydrated && isAuthed && (
                <div className="p-4 border-t">
                  <Link 
                    href="/logout" 
                    className="block w-full px-4 py-3 text-center text-sm rounded-lg font-medium text-[#AEDFD1FF] border border-[#AEDFD1FF] bg-transparent hover:bg-red-50 transition-all"
                    onClick={closeMobileMenu}
                  >
                    Logout
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}


