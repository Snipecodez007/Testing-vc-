import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, ChevronDown, Menu, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import ProfileMenu from './ProfileMenu';
import NotificationPanel from './NotificationPanel';
import AuthModal from './AuthModal';
import NavMenu from './NavMenu';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { setSearchOpen, profile, unreadCount } = useAppStore();
  const { user } = useAuthStore();
  const { canInstall, promptInstall } = useInstallPrompt();
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Transparent → opaque on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearchClick = () => {
    setSearchOpen(true);
    setNotifOpen(false);
  };

  const unread = unreadCount();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-xf-bg/95 backdrop-blur-md shadow-lg shadow-black/30'
          : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}
    >
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 lg:h-16">
          {/* Logo & Addon */}
          <div className="flex items-center min-w-0">
            <Link
              to="/"
              className="flex-shrink-0 focus-visible:outline-xf-red"
              aria-label="Boozo Tv Home"
            >
              <img
                src="/logo-wordmark.png"
                alt="Boozo Tv"
                className="h-6 sm:h-7 lg:h-9 w-auto"
              />
            </Link>
            
            <div id="navbar-addon" className="flex items-center min-w-0" />
          </div>

          {/* Desktop nav links removed (using floating nav instead) */}
          <nav className="hidden lg:flex items-center gap-0.5 ml-8" aria-label="Primary navigation">
          </nav>

          {/* Right section */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* Search */}
            <button
              onClick={handleSearchClick}
              className="p-2 text-xf-muted hover:text-white transition-colors duration-200 rounded-full hover:bg-white/10"
              aria-label="Open search"
              id="navbar-search-btn"
            >
              <Search size={20} />
            </button>

            {/* Notifications */}
            <div className="hidden sm:block relative" ref={notifRef}>
              <button
                onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                className="relative p-2 text-xf-muted hover:text-white transition-colors duration-200 rounded-full hover:bg-white/10"
                aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
                aria-expanded={notifOpen}
              >
                <Bell size={20} />
                {/* Unread badge */}
                {unread > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-xf-red rounded-full flex items-center justify-center text-white text-[9px] font-bold leading-none">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <NotificationPanel onClose={() => setNotifOpen(false)} />
                )}
              </AnimatePresence>
            </div>

            {/* Profile / Auth */}
            {user ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 backdrop-blur-md border border-white/15 transition-all duration-200 group"
                  aria-label="Profile menu"
                  aria-expanded={profileOpen}
                  id="profile-menu-btn"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm"
                    style={{ backgroundColor: profile.avatarColor || '#E50914' }}
                  >
                    {(user.user_metadata?.display_name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden md:inline text-xs font-semibold text-white max-w-[100px] truncate">
                    {user.user_metadata?.display_name || user.email?.split('@')[0]}
                  </span>
                  <motion.div
                    animate={{ rotate: profileOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={14} className="text-xf-muted group-hover:text-white" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <ProfileMenu
                      onClose={() => setProfileOpen(false)}
                      onNavigate={(path) => { navigate(path); setProfileOpen(false); }}
                    />
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md border border-white/20 text-xs sm:text-sm font-semibold text-white transition-all duration-200 shadow-sm"
              >
                <span>Sign In</span>
              </button>
            )}

            {/* Hamburger menu — full site navigation, works on mobile & desktop */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => {
                  setMenuOpen(!menuOpen);
                  setProfileOpen(false);
                  setNotifOpen(false);
                }}
                className="p-2 text-xf-muted hover:text-white transition-colors duration-200 rounded-full hover:bg-white/10"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                id="navbar-menu-btn"
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <NavMenu
                    onNavigate={(path) => { navigate(path); setMenuOpen(false); }}
                    canInstall={canInstall}
                    onInstall={() => { promptInstall(); setMenuOpen(false); }}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
      </AnimatePresence>
    </motion.nav>
  );
}
