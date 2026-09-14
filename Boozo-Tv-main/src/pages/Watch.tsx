import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Info, Tv2, ChevronLeft, ChevronRight, AlertCircle, RefreshCw, SkipForward, X, Play } from 'lucide-react';
import { getMovieDetails, getTVSeason } from '@/services/tmdb';
import { useTMDB } from '@/hooks/useTMDB';
import { useAppStore } from '@/store/useAppStore';
import { makeServers } from '@/utils/servers';
import NotFound from '@/components/NotFound';
import LoadingSkeleton from '@/components/LoadingSkeleton';

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.35 } },
  exit: { opacity: 0 },
};

export default function Watch({ type }: { type: 'movie' | 'tv' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { saveProgress, getProgress } = useAppStore();

  // TV-specific state
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [serverIdx, setServerIdx] = useState(0);
  const [iframeKey, setIframeKey] = useState(0); // force iframe reload on server/ep change
  const [iframeError, setIframeError] = useState(false);
  const [seasonEpisodes, setSeasonEpisodes] = useState<any[]>([]);

  // ── Skip Intro (best-effort UI reminder — the embed player is a 3rd-party
  // iframe, so we can't truly seek; the button just dismisses itself) ──────────
  const [showSkipIntro, setShowSkipIntro] = useState(false);

  // ── Auto-play Next Episode prompt ─────────────────────────────────────────
  const [showNextPrompt, setShowNextPrompt] = useState(false);
  const [nextCountdown, setNextCountdown] = useState(15);

  const { data: movie, loading, error } = useTMDB(() => {
    if (!id) return Promise.reject(new Error('No ID'));
    return getMovieDetails(id, type);
  }, [id, type]);

  // Fetch actual season episodes when TV show ID or season changes
  useEffect(() => {
    if (type !== 'tv' || !movie?.id) return;
    let isMounted = true;
    getTVSeason(movie.id, season)
      .then((eps) => {
        if (isMounted) {
          setSeasonEpisodes(eps);
        }
      })
      .catch(() => {
        if (isMounted) setSeasonEpisodes([]);
      });
    return () => {
      isMounted = false;
    };
  }, [type, movie?.id, season]);

  // Save progress as a simple time-based snapshot (iframe doesn't expose currentTime)
  useEffect(() => {
    if (!movie) return;
    const interval = setInterval(() => {
      const prog = getProgress(movie.id);
      const elapsed = (prog?.progress ?? 0) + 30; // assume 30 s watched per tick
      const duration = movie.runtime ? movie.runtime * 60 : 5400;
      saveProgress(movie.id, Math.min(elapsed, duration), duration, {
        id: movie.id,
        title: movie.title,
        type: movie.type,
        poster: movie.poster,
        genres: movie.genres,
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [movie, saveProgress, getProgress]);

  // Skip Intro button — appears ~5s after an episode/movie loads, auto-hides after ~90s
  useEffect(() => {
    setShowSkipIntro(false);
    const showT = setTimeout(() => setShowSkipIntro(true), 5000);
    const hideT = setTimeout(() => setShowSkipIntro(false), 95000);
    return () => { clearTimeout(showT); clearTimeout(hideT); };
  }, [iframeKey]);

  // Detect when we're near the end of a TV episode (using the same simulated
  // progress clock above) and there's a next episode/season to advance to.
  useEffect(() => {
    setShowNextPrompt(false);
    if (!movie || type !== 'tv') return;

    const seasonsList = movie.seasons || [];
    const totalSeasonsLocal = seasonsList.length > 0 ? seasonsList.length : (movie.numberOfSeasons ?? 1);
    const currentSeasonObjLocal = seasonsList.find((s) => s.seasonNumber === season);
    const episodeCountLocal = seasonEpisodes.length > 0 ? seasonEpisodes.length : (currentSeasonObjLocal?.episodeCount ?? 8);
    const hasNext = episode < episodeCountLocal || season < totalSeasonsLocal;
    if (!hasNext) return;

    const duration = movie.runtime ? movie.runtime * 60 : 1400;
    const check = setInterval(() => {
      const prog = getProgress(movie.id);
      const elapsed = prog?.progress ?? 0;
      const remaining = duration - elapsed;
      if (remaining <= 60 && remaining > 0) {
        setShowNextPrompt(true);
      }
    }, 5000);
    return () => clearInterval(check);
  }, [movie, type, season, episode, seasonEpisodes, getProgress]);

  // Countdown that fires once the "Next Episode" prompt is showing
  useEffect(() => {
    if (!showNextPrompt) {
      setNextCountdown(15);
      return;
    }
    if (nextCountdown <= 0) {
      handleGoNextEpisode();
      return;
    }
    const t = setTimeout(() => setNextCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNextPrompt, nextCountdown]);

  // Rebuild servers when movie ID or season/episode changes
  const servers = movie
    ? makeServers(movie.id, type, season, episode)
    : [];

  const activeServer = servers[serverIdx];

  const handleServerSwitch = useCallback((idx: number) => {
    setServerIdx(idx);
    setIframeError(false);
    setIframeKey((k) => k + 1);
  }, []);

  const handleNextServer = useCallback(() => {
    const next = (serverIdx + 1) % servers.length;
    handleServerSwitch(next);
  }, [serverIdx, servers.length, handleServerSwitch]);

  const handleSeasonChange = useCallback((s: number) => {
    setSeason(s);
    setEpisode(1);
    setIframeError(false);
    setIframeKey((k) => k + 1);
    setShowNextPrompt(false);
  }, []);

  const handleEpisodeChange = useCallback((s: number, e: number) => {
    setSeason(s);
    setEpisode(e);
    setIframeError(false);
    setIframeKey((k) => k + 1);
    setShowNextPrompt(false);
  }, []);

  const handleGoNextEpisode = useCallback(() => {
    if (!movie) return;
    const seasonsList = movie.seasons || [];
    const totalSeasonsLocal = seasonsList.length > 0 ? seasonsList.length : (movie.numberOfSeasons ?? 1);
    const currentSeasonObjLocal = seasonsList.find((s) => s.seasonNumber === season);
    const episodeCountLocal = seasonEpisodes.length > 0 ? seasonEpisodes.length : (currentSeasonObjLocal?.episodeCount ?? 8);
    setShowNextPrompt(false);
    if (episode < episodeCountLocal) {
      handleEpisodeChange(season, episode + 1);
    } else if (season < totalSeasonsLocal) {
      handleSeasonChange(season + 1);
    }
  }, [movie, season, episode, seasonEpisodes, handleEpisodeChange, handleSeasonChange]);

  if (error) return <NotFound />;
  if (loading || !movie) {
    return (
      <div className="pt-6 bg-xf-bg min-h-screen">
        <LoadingSkeleton variant="hero" />
      </div>
    );
  }

  // Real season and episode counts from TMDB
  const seasons = movie.seasons || [];
  const totalSeasons = seasons.length > 0 ? seasons.length : (movie.numberOfSeasons ?? 1);
  const currentSeasonObj = seasons.find((s) => s.seasonNumber === season);
  const episodeCount = seasonEpisodes.length > 0 
    ? seasonEpisodes.length 
    : (currentSeasonObj?.episodeCount ?? 8);

  const currentEpDetail = seasonEpisodes.find((ep) => ep.episodeNumber === episode);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-xf-bg"
    >
      <div className="max-w-screen-xl mx-auto px-3 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-16">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xf-muted hover:text-white transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Home</span>
          </button>

          <div className="flex items-center gap-2">
            {type === 'tv' && (
              <div className="flex items-center gap-1.5 text-xf-muted text-sm">
                <Tv2 size={14} />
                <span>S{season} E{episode}</span>
              </div>
            )}
            <button
              onClick={() => navigate(`/${movie.type}/${movie.id}`)}
              className="flex items-center gap-1.5 text-xf-muted hover:text-white transition-colors text-sm"
              aria-label="More info"
            >
              <Info size={16} />
              <span className="hidden sm:inline">More Info</span>
            </button>
          </div>
        </div>

        {/* ── Title ──────────────────────────────────────────────────────────── */}
        <div className="mb-4">
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white leading-tight">
            {movie.title}
            {type === 'tv' && (
              <span className="ml-2 text-xf-muted font-normal text-lg">
                S{season}:E{episode}
              </span>
            )}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-xf-muted flex-wrap">
            {movie.year > 0 && <span>{movie.year}</span>}
            {movie.year > 0 && <span>·</span>}
            <span>{type === 'tv' ? `${totalSeasons} Season${totalSeasons > 1 ? 's' : ''}` : 'Movie'}</span>
            {movie.ageRating && <><span>·</span><span>{movie.ageRating}</span></>}
          </div>
        </div>

        {/* ── Embed Player ───────────────────────────────────────────────────── */}
        <div className="mb-5 relative rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl shadow-black/50">
          {iframeError ? (
            <div className="aspect-video flex flex-col items-center justify-center gap-4 bg-xf-card">
              <AlertCircle size={36} className="text-xf-red" />
              <p className="text-white font-medium text-center px-4">
                This server couldn't load. Try switching servers below.
              </p>
              <button
                onClick={handleNextServer}
                className="flex items-center gap-2 px-5 py-2.5 bg-xf-red hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <RefreshCw size={15} />
                Try Next Server
              </button>
            </div>
          ) : (
            <iframe
              key={iframeKey}
              src={activeServer?.sourceUrl}
              title={`${movie.title} — ${activeServer?.name}`}
              className="w-full h-full aspect-video border-0"
              sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-presentation"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              onError={() => setIframeError(true)}
            />
          )}

          {/* Skip Intro — best-effort reminder; the embed player is a 3rd-party
              iframe so this can't truly seek the video, it just dismisses itself */}
          <AnimatePresence>
            {showSkipIntro && !iframeError && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                onClick={() => setShowSkipIntro(false)}
                className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2.5 bg-black/80 hover:bg-black text-white text-sm font-semibold rounded-lg backdrop-blur-md border border-white/20 transition-colors z-10"
              >
                <SkipForward size={15} />
                Skip Intro
              </motion.button>
            )}
          </AnimatePresence>

          {/* Auto Next Episode prompt */}
          <AnimatePresence>
            {showNextPrompt && !iframeError && type === 'tv' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-4 right-4 w-[calc(100%-2rem)] sm:w-80 bg-[#181818]/95 backdrop-blur-md border border-white/15 rounded-xl p-4 shadow-2xl z-10"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xf-subtle text-xs font-semibold uppercase tracking-wider">
                    Next Episode in {nextCountdown}s
                  </p>
                  <button
                    onClick={() => setShowNextPrompt(false)}
                    className="text-xf-muted hover:text-white transition-colors"
                    aria-label="Cancel autoplay"
                  >
                    <X size={16} />
                  </button>
                </div>
                <p className="text-white font-semibold text-sm mb-3 truncate">
                  {episode < (seasonEpisodes.length || 8) ? `Episode ${episode + 1}` : `Season ${season + 1}, Episode 1`}
                </p>
                <button
                  onClick={handleGoNextEpisode}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-xf-red hover:bg-xf-red-hover text-white text-sm font-bold rounded-lg transition-colors"
                >
                  <Play size={15} fill="white" />
                  Play Now
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Current Episode Info (TV) ── */}
        {type === 'tv' && currentEpDetail && (
          <div className="mb-6 p-4 rounded-xl bg-white/[0.03] border border-white/10">
            <p className="text-white font-semibold text-base">
              <span className="text-xf-red font-bold mr-2">S{season} E{episode}</span>
              {currentEpDetail.name}
            </p>
            {currentEpDetail.overview && (
              <p className="text-xf-muted text-xs sm:text-sm mt-1.5 leading-relaxed line-clamp-3">
                {currentEpDetail.overview}
              </p>
            )}
          </div>
        )}

        {/* ── Server Switcher ─────────────────────────────────────────────────── */}
        <div className="mb-6">
          <p className="text-xf-subtle text-xs font-semibold uppercase tracking-wider mb-2">
            Servers
          </p>
          <div className="flex flex-wrap gap-2">
            {servers.map((server, i) => (
              <button
                key={server.name}
                onClick={() => handleServerSwitch(i)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border
                  ${i === serverIdx
                    ? 'bg-xf-red border-xf-red text-white shadow-lg shadow-xf-red/20'
                    : 'bg-xf-card border-white/10 text-xf-muted hover:text-white hover:border-white/30'
                  }`}
                aria-pressed={i === serverIdx}
                aria-label={`${server.name}${i === serverIdx ? ' (active)' : ''}`}
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    server.status === 'online' ? 'bg-green-400' : 'bg-red-500'
                  }`}
                />
                {server.name}
                {i === serverIdx && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                    Active
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-xf-subtle text-xs mt-2">
            If video doesn't load, switch to another server. Both servers stream the same content.
          </p>
        </div>

        {/* ── TV Season/Episode Picker ───────────────────────────────────────── */}
        {type === 'tv' && (
          <div className="mb-8">
            <p className="text-xf-subtle text-xs font-semibold uppercase tracking-wider mb-3">
              Episodes
            </p>

            {/* Season selector */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xf-muted text-sm font-medium">Season:</span>
              <div className="flex flex-wrap gap-1.5">
                {(seasons.length > 0
                  ? seasons
                  : Array.from({ length: totalSeasons }, (_, i) => ({
                      seasonNumber: i + 1,
                      name: `Season ${i + 1}`,
                      episodeCount: 8,
                    }))
                ).map((s) => (
                  <button
                    key={s.seasonNumber}
                    onClick={() => handleSeasonChange(s.seasonNumber)}
                    className={`px-3.5 h-9 rounded-lg text-sm font-semibold transition-all duration-200 border flex items-center justify-center
                      ${s.seasonNumber === season
                        ? 'bg-white text-black border-white shadow-md'
                        : 'bg-xf-card text-xf-muted border-white/10 hover:border-white/30 hover:text-white'
                      }`}
                    aria-pressed={s.seasonNumber === season}
                    aria-label={`Season ${s.seasonNumber}`}
                  >
                    {s.seasonNumber}
                  </button>
                ))}
              </div>
            </div>

            {/* Episode selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xf-muted text-sm font-medium">Episode:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => episode > 1 && handleEpisodeChange(season, episode - 1)}
                  disabled={episode <= 1}
                  className="w-9 h-9 rounded-lg bg-xf-card border border-white/10 text-white flex items-center justify-center disabled:opacity-30 hover:border-white/30 transition-colors"
                  aria-label="Previous episode"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-0.5">
                  {Array.from({ length: episodeCount }, (_, i) => i + 1).map((e) => {
                    const epDetail = seasonEpisodes.find((ep) => ep.episodeNumber === e);
                    return (
                      <button
                        key={e}
                        onClick={() => handleEpisodeChange(season, e)}
                        title={epDetail?.name ? `E${e}: ${epDetail.name}` : `Episode ${e}`}
                        className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all duration-200 border flex items-center justify-center
                          ${e === episode
                            ? 'bg-white text-black border-white shadow-md'
                            : 'bg-xf-card text-xf-muted border-white/10 hover:border-white/30 hover:text-white'
                          }`}
                        aria-pressed={e === episode}
                        aria-label={`Episode ${e}`}
                      >
                        {e}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => episode < episodeCount && handleEpisodeChange(season, episode + 1)}
                  disabled={episode >= episodeCount}
                  className="w-9 h-9 rounded-lg bg-xf-card border border-white/10 text-white flex items-center justify-center disabled:opacity-30 hover:border-white/30 transition-colors"
                  aria-label="Next episode"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Description ────────────────────────────────────────────────────── */}
        <p className="text-xf-muted text-sm leading-relaxed max-w-3xl">
          {movie.description}
        </p>
      </div>
    </motion.div>
  );
}
