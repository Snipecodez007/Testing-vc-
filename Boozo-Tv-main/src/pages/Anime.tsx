import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import PageBackground from '@/components/PageBackground';
import {
  getDiscoverTV,
  getDiscoverTVPage,
  getDiscoverMoviesPage,
} from '@/services/tmdb';
import { useTMDB } from '@/hooks/useTMDB';
import Hero from '@/components/Hero';
import MovieRow from '@/components/MovieRow';
import Footer from '@/components/Footer';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import FilterPillBar from '@/components/FilterPillBar';
import type { Movie } from '@/types/movie';

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4 } },
  exit: { opacity: 0 },
};

// TMDB Animation genre (16), locked to Japanese-language titles = Anime
const ANIME_BASE_GENRE = 16;
const ANIME_LANGUAGE = 'ja';

const SORT_VARIANTS = [
  { label: 'Most Popular', sort: 'popularity.desc' },
  { label: 'Top Rated', sort: 'vote_average.desc' },
  { label: 'Newest First', sort: 'first_air_date.desc' },
];

const ANIME_SUBGENRES = [
  { id: '10759', label: 'Action & Adventure' },
  { id: '35', label: 'Comedy' },
  { id: '18', label: 'Drama' },
  { id: '10765', label: 'Fantasy & Sci-Fi' },
  { id: '9648', label: 'Mystery' },
  { id: '10751', label: 'Family' },
];

export default function Anime() {
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [addonRoot, setAddonRoot] = useState<HTMLElement | null>(null);
  const [activeHeroMovie, setActiveHeroMovie] = useState<Movie | null>(null);

  useEffect(() => {
    setAddonRoot(document.getElementById('navbar-addon'));
  }, []);

  // Always locked to Animation + Japanese; optionally ANDed with a sub-genre
  const genreId = selectedSub ? `${ANIME_BASE_GENRE},${selectedSub}` : String(ANIME_BASE_GENRE);
  const subLabel = ANIME_SUBGENRES.find(g => g.id === selectedSub)?.label;

  const fetchHero = useCallback(
    () => getDiscoverTV(genreId, ANIME_LANGUAGE),
    [genreId]
  );
  const { data: heroShows, loading: heroLoading } = useTMDB(fetchHero, [genreId]);

  const makeFetchMore = useCallback(
    (rowGenreId: string, sort: string) => async (page: number): Promise<Movie[]> => {
      const result = await getDiscoverTVPage(rowGenreId, page, sort, ANIME_LANGUAGE);
      return result.movies;
    },
    []
  );

  const makeFetchMoreMovies = useCallback(
    (rowGenreId: string, sort: string) => async (page: number): Promise<Movie[]> => {
      const result = await getDiscoverMoviesPage(rowGenreId, page, sort, ANIME_LANGUAGE);
      return result.movies;
    },
    []
  );

  const heading = subLabel ? `${subLabel} Anime` : 'Anime';
  const visibleHero = heroShows?.slice(0, 10) ?? [];
  const bgMovie = activeHeroMovie || visibleHero[0] || null;

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="min-h-screen bg-[#08080a] relative overflow-x-hidden"
    >
      <PageBackground movie={bgMovie} />

      {/* Navbar Addon: Boozo Tv > Anime */}
      {addonRoot && createPortal(
        <div className="flex items-center gap-1 sm:gap-2 ml-1.5 sm:ml-4">
          <ChevronRight size={14} className="text-white/50 shrink-0 sm:w-4 sm:h-4" />
          <span className="font-display font-bold text-xs sm:text-lg text-white truncate">Anime</span>
        </div>,
        addonRoot
      )}

      {/* Hero Section */}
      <div className="relative z-10">
        {heroLoading ? (
          <LoadingSkeleton variant="hero" />
        ) : (
          <Hero movies={visibleHero} onActiveMovieChange={setActiveHeroMovie} />
        )}
      </div>

      {/* Sub-genre filter pills */}
      <div className="relative z-10 mt-2">
        <FilterPillBar
          options={ANIME_SUBGENRES}
          selectedId={selectedSub}
          onSelect={setSelectedSub}
          prepend={
            <button
              onClick={() => setSelectedSub(null)}
              className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 border ${
                !selectedSub
                  ? 'bg-white text-black border-white shadow-md'
                  : 'bg-[#181818] text-white border-white/10 hover:bg-white/10'
              }`}
            >
              All
            </button>
          }
        />
      </div>

      {/* Rows */}
      <div className="mt-8 md:mt-10 relative z-10 flex flex-col gap-10 pb-16">
        {selectedSub ? (
          <>
            <AnimeRow
              key={`new-${genreId}`}
              title={`New & Upcoming ${heading}`}
              genreId={genreId}
              sort="first_air_date.desc"
              fetchMore={makeFetchMore(genreId, 'first_air_date.desc')}
            />
            <AnimeRow
              key={`pop-${genreId}`}
              title={`Trending ${heading}`}
              genreId={genreId}
              sort="popularity.desc"
              fetchMore={makeFetchMore(genreId, 'popularity.desc')}
            />
            <AnimeRow
              key={`top-${genreId}`}
              title={`Top Rated ${heading}`}
              genreId={genreId}
              sort="vote_average.desc"
              fetchMore={makeFetchMore(genreId, 'vote_average.desc')}
            />
            {ANIME_SUBGENRES.filter(g => g.id !== selectedSub).slice(0, 3).map(g => (
              <AnimeRow
                key={`related-${g.id}`}
                title={`More ${g.label} Anime`}
                genreId={`${ANIME_BASE_GENRE},${g.id}`}
                sort="popularity.desc"
                fetchMore={makeFetchMore(`${ANIME_BASE_GENRE},${g.id}`, 'popularity.desc')}
              />
            ))}
          </>
        ) : (
          <>
            {SORT_VARIANTS.map(({ label, sort }) => (
              <AnimeRow
                key={`sort-${sort}`}
                title={`Anime — ${label}`}
                genreId={genreId}
                sort={sort}
                fetchMore={makeFetchMore(genreId, sort)}
              />
            ))}
            {ANIME_SUBGENRES.map(g => (
              <AnimeRow
                key={`sub-${g.id}`}
                title={`${g.label} Anime`}
                genreId={`${ANIME_BASE_GENRE},${g.id}`}
                sort="popularity.desc"
                fetchMore={makeFetchMore(`${ANIME_BASE_GENRE},${g.id}`, 'popularity.desc')}
              />
            ))}
            <AnimeMovieRow
              title="Anime Movies"
              fetchMore={makeFetchMoreMovies(String(ANIME_BASE_GENRE), 'popularity.desc')}
            />
          </>
        )}
      </div>

      <Footer />
    </motion.div>
  );
}

function AnimeRow({
  title,
  genreId,
  sort,
  fetchMore,
}: {
  title: string;
  genreId: string;
  sort: string;
  fetchMore: (page: number) => Promise<Movie[]>;
}) {
  const { data, loading } = useTMDB(
    async () => {
      const result = await getDiscoverTVPage(genreId, 1, sort, ANIME_LANGUAGE);
      return result.movies;
    },
    [genreId, sort]
  );

  if (loading) {
    return (
      <div className="px-4 sm:px-8 lg:px-12">
        <div className="h-4 w-48 bg-xf-card skeleton rounded mb-4" />
        <LoadingSkeleton variant="row" count={1} />
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  return <MovieRow title={title} movies={data} fetchMore={fetchMore} />;
}

function AnimeMovieRow({
  title,
  fetchMore,
}: {
  title: string;
  fetchMore: (page: number) => Promise<Movie[]>;
}) {
  const { data, loading } = useTMDB(
    async () => {
      const result = await getDiscoverMoviesPage(String(ANIME_BASE_GENRE), 1, 'popularity.desc', ANIME_LANGUAGE);
      return result.movies;
    },
    []
  );

  if (loading) {
    return (
      <div className="px-4 sm:px-8 lg:px-12">
        <div className="h-4 w-48 bg-xf-card skeleton rounded mb-4" />
        <LoadingSkeleton variant="row" count={1} />
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  return <MovieRow title={title} movies={data} fetchMore={fetchMore} />;
}
