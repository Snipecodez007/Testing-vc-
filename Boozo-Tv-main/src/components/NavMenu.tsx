import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import {
  Home,
  Film,
  Tv,
  Sparkles,
  Bookmark,
  Users,
  ScrollText,
  Wand2,
  Heart,
  CalendarClock,
  History,
  Download,
} from 'lucide-react';

interface NavMenuProps {
  onNavigate: (path: string) => void;
  canInstall?: boolean;
  onInstall?: () => void;
}

const NAV_LINKS = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Film, label: 'Movies', path: '/movies' },
  { icon: Tv, label: 'TV Shows', path: '/tv-shows' },
  { icon: Wand2, label: 'Anime', path: '/anime' },
  { icon: Heart, label: 'K-Drama', path: '/k-drama' },
  { icon: Sparkles, label: 'New & Popular', path: '/new-popular' },
  { icon: CalendarClock, label: 'Coming Soon', path: '/coming-soon' },
  { icon: Bookmark, label: 'My List', path: '/my-list' },
  { icon: History, label: 'Watch History', path: '/history' },
  { icon: Users, label: 'Movie Party', path: '/movie-party' },
];

export default function NavMenu({ onNavigate, canInstall, onInstall }: NavMenuProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10"
      style={{ background: 'rgba(24,24,24,0.97)', backdropFilter: 'blur(16px)' }}
      role="menu"
      aria-label="Site navigation"
    >
      {NAV_LINKS.map(({ icon: Icon, label, path }) => {
        const active = isActive(path);
        return (
          <button
            key={path}
            onClick={() => onNavigate(path)}
            className={`relative w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors duration-150 group ${
              active ? 'text-white bg-white/8' : 'text-xf-muted hover:text-white hover:bg-white/8'
            }`}
            role="menuitem"
            aria-current={active ? 'page' : undefined}
          >
            {active && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-xf-red rounded-r-full" />
            )}
            <Icon
              size={16}
              className={`transition-colors ${active ? 'text-xf-red' : 'text-xf-subtle group-hover:text-xf-red'}`}
            />
            <span className={active ? 'font-semibold' : ''}>{label}</span>
          </button>
        );
      })}
      <div className="border-t border-white/10 mt-1 pt-1 pb-1">
        {canInstall && onInstall && (
          <button
            onClick={onInstall}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white hover:bg-white/8 transition-colors duration-150 group"
            role="menuitem"
          >
            <Download size={16} className="text-xf-red" />
            Install App
          </button>
        )}
        <button
          onClick={() => onNavigate('/legal')}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-xf-muted hover:text-white hover:bg-white/8 transition-colors duration-150 group"
          role="menuitem"
        >
          <ScrollText size={16} className="text-xf-subtle group-hover:text-xf-red transition-colors" />
          Legal & Privacy
        </button>
      </div>
    </motion.div>
  );
}
