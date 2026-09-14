import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import PageBackground from '@/components/PageBackground';
import { getDiscoverTV, getDiscoverTVPage } from '@/services/tmdb';
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

// Locked to Korean-language TV = K-Drama
const KDRAMA_LANGUAGE = 'ko';

const SORT_VARIANTS = [
  { label: 'Most Popular', sort: 'popularity.desc' },
  { label: 'Top Rated', sort: 'vote_average.desc' },
  { label: 'Newest First', sort: 'first_air_date.desc' },
];

const KDRAMA_SUBGENRES = [
  { id: '18', label: 'Drama' },
  { id: '35', label: 'Comedy' },
  { id: '10759', label: 'Action & Adventure' },
  { id: '80', label: 'Crime' },
  { id: '9648', label: 'Mystery' },
  { id: '10765', label: 'Fantasy & Sci-Fi' },
];

export default function KDrama() {
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [addonRoot, setAddonRoot] = useState<HTMLElement | null>(null);
  const [activeHeroMovie, setActiveHeroMovie] = useState<Movie | null>(null);

  useEffect(() => {
    setAddonRoot(document.getElementById('navbar-addon'));
  }, []);

  const genreId = selectedSub ?? undefined;
  const subLabel = KDRAMA_SUBGENRES.find(g => g.id === selectedSub)?.label;

  const fetchHero = useCallback(
    () => getDiscoverTV(genreId, KDRAMA_LANGUAGE),
    [genreId]
  );
  const { data: heroShows, loading: heroLoading } = useTMDB(fetchHero, [genreId]);

  const makeFetchMore = useCallback(
    (rowGenreId: string | undefined, sort: string) => async (page: number): Promise<Movie[]> => {
      const result = await getDiscoverTVPage(rowGenreId, page, sort, KDRAMA_LANGUAGE);
      return result.movies;
    },
    []
  );

  const heading = subLabel ? `${subLabel} K-Dramas` : 'K-Dramas';
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

      {/* Navbar Addon: Boozo Tv > K-Drama */}
      {addonRoot && createPortal(
        <div className="flex items-center gap-1 sm:gap-2 ml-1.5 sm:ml-4">
          <ChevronRight size={14} className="text-white/50 shrink-0 sm:w-4 sm:h-4" />
          <span className="font-display font-bold text-xs sm:text-lg text-white truncate">K-Drama</span>
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
          options={KDRAMA_SUBGENRES}
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
            <KDramaRow
              key={`new-${selectedSub}`}
              title={`New & Upcoming ${heading}`}
              genreId={selectedSub}
              sort="first_air_date.desc"
              fetchMore={makeFetchMore(selectedSub, 'first_air_date.desc')}
            />
            <KDramaRow
              key={`pop-${selectedSub}`}
              title={`Trending ${heading}`}
              genreId={selectedSub}
              sort="popularity.desc"
              fetchMore={makeFetchMore(selectedSub, 'popularity.desc')}
            />
            <KDramaRow
              key={`top-${selectedSub}`}
              title={`Top Rated ${heading}`}
              genreId={selectedSub}
              sort="vote_average.desc"
              fetchMore={makeFetchMore(selectedSub, 'vote_average.desc')}
            />
            {KDRAMA_SUBGENRES.filter(g => g.id !== selectedSub).slice(0, 3).map(g => (
              <KDramaRow
                key={`related-${g.id}`}
                title={`More ${g.label} K-Dramas`}
                genreId={g.id}
                sort="popularity.desc"
                fetchMore={makeFetchMore(g.id, 'popularity.desc')}
              />
            ))}
          </>
        ) : (
          <>
            {SORT_VARIANTS.map(({ label, sort }) => (
              <KDramaRow
                key={`sort-${sort}`}
                title={`K-Dramas — ${label}`}
                genreId={undefined}
                sort={sort}
                fetchMore={makeFetchMore(undefined, sort)}
              />
            ))}
            {KDRAMA_SUBGENRES.map(g => (
              <KDramaRow
                key={`sub-${g.id}`}
                title={`${g.label} K-Dramas`}
                genreId={g.id}
                sort="popularity.desc"
                fetchMore={makeFetchMore(g.id, 'popularity.desc')}
              />
            ))}
          </>
        )}
      </div>

      <Footer />
    </motion.div>
  );
}

function KDramaRow({
  title,
  genreId,
  sort,
  fetchMore,
}: {
  title: string;
  genreId: string | undefined;
  sort: string;
  fetchMore: (page: number) => Promise<Movie[]>;
}) {
  const { data, loading } = useTMDB(
    async () => {
      const result = await getDiscoverTVPage(genreId, 1, sort, KDRAMA_LANGUAGE);
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
