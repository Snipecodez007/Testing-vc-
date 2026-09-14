import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { History as HistoryIcon, Trash2, Play, Clock } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import Footer from '@/components/Footer';

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4 } },
  exit: { opacity: 0 },
};

export default function History() {
  const { continueWatching, clearProgress } = useAppStore();
  const navigate = useNavigate();

  const entries = Object.entries(continueWatching)
    .filter(([, v]) => v.movieMeta && v.duration > 0)
    .sort(([, a], [, b]) => b.lastWatched - a.lastWatched);

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
          <HistoryIcon size={22} className="text-xf-red" />
          <h1 className="font-display font-black text-3xl text-white">Watch History</h1>
        </div>
        <p className="text-xf-muted text-sm">
          {entries.length} title{entries.length !== 1 ? 's' : ''} watched
        </p>
      </div>

      <div className="px-4 sm:px-8 lg:px-12 py-8 pb-16">
        {entries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 gap-5"
          >
            <div className="w-20 h-20 rounded-full bg-xf-card border border-white/10 flex items-center justify-center">
              <Clock size={32} className="text-xf-subtle" />
            </div>
            <div className="text-center">
              <h3 className="text-white font-semibold text-lg mb-2">No watch history yet</h3>
              <p className="text-xf-muted text-sm max-w-xs">
                Titles you watch will show up here so you can pick up where you left off.
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-xf-red text-white font-semibold rounded-lg hover:bg-xf-red-hover transition-colors"
            >
              Browse Content
            </button>
          </motion.div>
        ) : (
          <motion.div layout className="flex flex-col gap-3">
            <AnimatePresence>
              {entries.map(([id, prog]) => {
                const meta = prog.movieMeta!;
                const pct = Math.min((prog.progress / prog.duration) * 100, 100);
                return (
                  <motion.div
                    key={id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition-colors group cursor-pointer"
                    onClick={() => navigate(`/watch/${meta.type}/${id}`)}
                  >
                    {/* Poster */}
                    <div className="relative w-14 sm:w-16 aspect-[2/3] rounded-lg overflow-hidden bg-xf-card shrink-0">
                      <img src={meta.poster} alt={meta.title} className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <Play size={18} fill="white" className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm sm:text-base truncate">{meta.title}</p>
                      <p className="text-xf-subtle text-xs mt-0.5">
                        {new Date(prog.lastWatched).toLocaleDateString(undefined, {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                        {' · '}{Math.round(pct)}% watched
                      </p>
                      <div className="mt-2 h-1 w-full max-w-xs bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-xf-red rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={(e) => { e.stopPropagation(); clearProgress(id); }}
                      className="p-2 text-xf-muted hover:text-xf-red transition-colors shrink-0"
                      aria-label={`Remove ${meta.title} from history`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <Footer />
    </motion.div>
  );
}
