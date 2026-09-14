import { supabase, isSupabaseConfigured } from './supabase';
import type { Movie, WatchProgress, MediaType } from '@/types/movie';

// ─── My List (cloud) ───────────────────────────────────────────────────────

export async function fetchRemoteMyList(userId: string): Promise<Movie[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('my_list')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.movie_id,
    title: r.title,
    type: r.movie_type as MediaType,
    poster: r.poster || '',
    backdrop: r.backdrop || '',
    description: '',
    rating: r.rating || 0,
    year: r.year || 0,
    runtime: 0,
    genres: r.genres || [],
    cast: [],
    servers: [],
  }));
}

export async function addToListRemote(userId: string, movie: Movie) {
  if (!isSupabaseConfigured) return;
  await supabase.from('my_list').upsert(
    {
      user_id: userId,
      movie_id: movie.id,
      movie_type: movie.type,
      title: movie.title,
      poster: movie.poster,
      backdrop: movie.backdrop,
      rating: movie.rating,
      year: movie.year,
      genres: movie.genres,
    },
    { onConflict: 'user_id,movie_id' }
  );
}

export async function removeFromListRemote(userId: string, movieId: string) {
  if (!isSupabaseConfigured) return;
  await supabase.from('my_list').delete().eq('user_id', userId).eq('movie_id', movieId);
}

// ─── Watch History (cloud) ──────────────────────────────────────────────────

export async function fetchRemoteHistory(userId: string): Promise<Record<string, WatchProgress>> {
  if (!isSupabaseConfigured) return {};
  const { data, error } = await supabase
    .from('watch_history')
    .select('*')
    .eq('user_id', userId)
    .order('last_watched_at', { ascending: false });
  if (error || !data) return {};

  const out: Record<string, WatchProgress> = {};
  data.forEach((r: any) => {
    out[r.movie_id] = {
      progress: Number(r.progress_seconds) || 0,
      duration: Number(r.duration_seconds) || 0,
      lastWatched: new Date(r.last_watched_at).getTime(),
      movieMeta: {
        id: r.movie_id,
        title: r.title,
        type: r.movie_type as MediaType,
        poster: r.poster || '',
        genres: r.genres || [],
      },
    };
  });
  return out;
}

export async function upsertHistoryRemote(
  userId: string,
  movieId: string,
  type: MediaType,
  meta: { title: string; poster: string; genres?: string[] },
  progress: number,
  duration: number
) {
  if (!isSupabaseConfigured) return;
  await supabase.from('watch_history').upsert(
    {
      user_id: userId,
      movie_id: movieId,
      movie_type: type,
      title: meta.title,
      poster: meta.poster,
      genres: meta.genres || [],
      progress_seconds: progress,
      duration_seconds: duration,
      last_watched_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,movie_id' }
  );
}

export async function deleteHistoryRemote(userId: string, movieId: string) {
  if (!isSupabaseConfigured) return;
  await supabase.from('watch_history').delete().eq('user_id', userId).eq('movie_id', movieId);
}
