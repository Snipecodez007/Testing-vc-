import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Bell, BellRing } from 'lucide-react';
import { getUpcoming } from '@/services/tmdb';
import { useTMDB } from '@/hooks/useTMDB';
import { useAppStore } from '@/store/useAppStore';
import Footer from '@/components/Footer';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import type { Movie } from '@/types/movie';

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4 } },
  exit: { opacity: 0 },
};

async function fetchComingSoon() {
  const [m1, m2, tv1, tv2] = await Promise.all([
    getUpcoming('movie', 1),
    getUpcoming('movie', 2),
    getUpcoming('tv', 1),
    getUpcoming('tv', 2),
  ]);
  const all = [...m1.movies, ...m2.movies, ...tv1.movies, ...tv2.movies]
    .filter((m) => m.releaseDate)
    .sort((a, b) => (a.releaseDate! < b.releaseDate! ? -1 : 1));
  return all;
}

function monthLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function dayLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function ComingSoon() {
  const { data: titles, loading } = useTMDB(fetchComingSoon);
  const { isReminded, toggleReminder, checkReminderReleases } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    checkReminderReleases();
  }, [checkReminderReleases]);

  const grouped = useMemo(() => {
    if (!titles) return [];
    const map = new Map<string, Movie[]>();
    titles.forEach((m) => {
      const key = monthLabel(m.releaseDate!);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    return Array.from(map.entries());
  }, [titles]);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-xf-bg"
    >
      {/* Header */}
      <div className="pt-24 pb-6 px-4 sm:px-8 lg:px-12 border-b border-white/8">
        <div className="flex items-center gap-3 mb-1">
          <CalendarClock size={22} className="text-xf-red" />
          <h1 className="font-display font-black text-3xl text-white">Coming Soon</h1>
        </div>
        <p className="text-xf-muted text-sm">
          Upcoming movies &amp; shows — tap the bell to get notified when they land.
        </p>
      </div>

      <div className="px-4 sm:px-8 lg:px-12 py-8 pb-16">
        {loading ? (
          <LoadingSkeleton variant="row" count={3} />
        ) : grouped.length === 0 ? (
          <p className="text-xf-muted text-sm py-16 text-center">No upcoming releases found right now.</p>
        ) : (
          <div className="flex flex-col gap-10">
            {grouped.map(([month, items]) => (
              <div key={month}>
                <h2 className="text-white font-display font-bold text-lg mb-4">{month}</h2>
                <div className="flex flex-col gap-3">
                  {items.map((m) => {
                    const reminded = isReminded(m.id);
                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-colors group"
                      >
                        <div
                          className="w-14 sm:w-16 aspect-[2/3] rounded-lg overflow-hidden bg-xf-card shrink-0 cursor-pointer"
                          onClick={() => navigate(`/${m.type}/${m.id}`)}
                        >
                          {m.poster && (
                            <img src={m.poster} alt={m.title} className="w-full h-full object-cover" loading="lazy" />
                          )}
                        </div>

                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => navigate(`/${m.type}/${m.id}`)}
                        >
                          <p className="text-white font-semibold text-sm sm:text-base truncate">{m.title}</p>
                          <p className="text-xf-subtle text-xs mt-0.5">
                            {dayLabel(m.releaseDate!)} · {m.type === 'tv' ? 'TV Series' : 'Movie'}
                          </p>
                          {m.genres.length > 0 && (
                            <p className="text-xf-muted text-xs mt-1 truncate">{m.genres.slice(0, 3).join(' · ')}</p>
                          )}
                        </div>

                        <button
                          onClick={() => toggleReminder(m)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border shrink-0 transition-all duration-200 ${
                            reminded
                              ? 'bg-xf-red border-xf-red text-white'
                              : 'bg-white/5 border-white/15 text-white hover:bg-white/10'
                          }`}
                          aria-pressed={reminded}
                        >
                          {reminded ? <BellRing size={14} /> : <Bell size={14} />}
                          <span className="hidden sm:inline">{reminded ? 'Reminding' : 'Remind Me'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </motion.div>
  );
}
