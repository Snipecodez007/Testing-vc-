import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Movie, Notification, Profile, WatchProgress, MediaType } from '@/types/movie';
import { STATIC_NOTIFICATIONS } from '@/data/notifications';
import { useAuthStore } from './useAuthStore';
import {
  addToListRemote,
  removeFromListRemote,
  fetchRemoteMyList,
  fetchRemoteHistory,
  upsertHistoryRemote,
  deleteHistoryRemote,
} from '@/services/userData';

interface ReminderEntry {
  id: string;
  title: string;
  type: MediaType;
  poster: string;
  releaseDate: string;
}

interface AppState {
  // My List
  myList: Movie[];
  addToList: (movie: Movie) => void;
  removeFromList: (id: string) => void;
  isInList: (id: string) => boolean;

  // Continue Watching
  continueWatching: Record<string, WatchProgress>;
  saveProgress: (id: string, progress: number, duration: number, movieMeta?: any) => void;
  getProgress: (id: string) => WatchProgress | undefined;
  clearProgress: (id: string) => void;

  // Cloud sync — pulls My List + Watch History from Supabase for the signed-in user
  // and merges them into local state (cloud wins on conflict, nothing local is lost).
  syncFromCloud: () => Promise<void>;

  // Coming Soon reminders
  reminders: Record<string, ReminderEntry>;
  toggleReminder: (movie: Movie) => void;
  isReminded: (id: string) => boolean;
  checkReminderReleases: () => void;

  // Profile
  profile: Profile;
  setProfile: (profile: Profile) => void;

  // Search overlay
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Notifications
  notifications: Notification[];
  unreadCount: () => number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  seedDynamicNotifications: (movies: Movie[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── My List ──────────────────────────────────────────────────────────
      myList: [],
      addToList: (movie) => {
        set((s) => ({
          myList: s.myList.find((m) => m.id === movie.id)
            ? s.myList
            : [...s.myList, movie],
        }));
        const user = useAuthStore.getState().user;
        if (user) addToListRemote(user.id, movie).catch(() => {});
      },
      removeFromList: (id) => {
        set((s) => ({ myList: s.myList.filter((m) => m.id !== id) }));
        const user = useAuthStore.getState().user;
        if (user) removeFromListRemote(user.id, id).catch(() => {});
      },
      isInList: (id) => get().myList.some((m) => m.id === id),

      // ── Continue Watching / Watch History ───────────────────────────────────
      continueWatching: {},
      saveProgress: (id, progress, duration, movieMeta) => {
        if (duration <= 0) return;
        set((s) => ({
          continueWatching: {
            ...s.continueWatching,
            [id]: {
              progress,
              duration,
              lastWatched: Date.now(),
              ...(movieMeta ? { movieMeta } : {}),
            },
          },
        }));
        const user = useAuthStore.getState().user;
        if (user && movieMeta?.title) {
          upsertHistoryRemote(
            user.id,
            id,
            movieMeta.type,
            { title: movieMeta.title, poster: movieMeta.poster, genres: movieMeta.genres },
            progress,
            duration
          ).catch(() => {});
        }
      },
      getProgress: (id) => get().continueWatching[id],
      clearProgress: (id) => {
        set((s) => {
          const next = { ...s.continueWatching };
          delete next[id];
          return { continueWatching: next };
        });
        const user = useAuthStore.getState().user;
        if (user) deleteHistoryRemote(user.id, id).catch(() => {});
      },

      // ── Cloud sync ───────────────────────────────────────────────────────
      syncFromCloud: async () => {
        const user = useAuthStore.getState().user;
        if (!user) return;
        const [remoteList, remoteHistory] = await Promise.all([
          fetchRemoteMyList(user.id),
          fetchRemoteHistory(user.id),
        ]);
        set((s) => {
          // Union My List by id — keep local-only items (e.g. added while offline),
          // cloud items take precedence for anything present in both.
          const merged = [...remoteList];
          s.myList.forEach((m) => {
            if (!merged.find((r) => r.id === m.id)) merged.push(m);
          });
          // Merge history — most recently watched copy wins per id.
          const mergedHistory: Record<string, WatchProgress> = { ...s.continueWatching };
          Object.entries(remoteHistory).forEach(([id, entry]) => {
            const local = mergedHistory[id];
            if (!local || entry.lastWatched >= local.lastWatched) {
              mergedHistory[id] = entry;
            }
          });
          return { myList: merged, continueWatching: mergedHistory };
        });
      },

      // ── Coming Soon reminders ───────────────────────────────────────────────
      reminders: {},
      toggleReminder: (movie) =>
        set((s) => {
          const next = { ...s.reminders };
          if (next[movie.id]) {
            delete next[movie.id];
          } else {
            next[movie.id] = {
              id: movie.id,
              title: movie.title,
              type: movie.type,
              poster: movie.poster,
              releaseDate: movie.releaseDate || '',
            };
          }
          return { reminders: next };
        }),
      isReminded: (id) => Boolean(get().reminders[id]),
      // Best-effort: checks reminders against today's date and, for anything that has
      // now released, injects a "now available" notification then clears the reminder.
      checkReminderReleases: () => {
        const today = new Date().toISOString().split('T')[0];
        const { reminders, notifications } = get();
        const existingIds = new Set(notifications.map((n) => n.id));
        const releasedNow = Object.values(reminders).filter(
          (r) => r.releaseDate && r.releaseDate <= today
        );
        if (releasedNow.length === 0) return;

        const dynamic: Notification[] = releasedNow
          .map((r) => ({
            id: `notif-reminder-${r.id}`,
            movieId: r.id,
            headline: `Now Available: ${r.title}`,
            body: `The title you set a reminder for just released on Boozo Tv.`,
            timestamp: Date.now(),
            read: false,
            thumbnailUrl: r.poster || undefined,
          }))
          .filter((n) => !existingIds.has(n.id));

        set((s) => {
          const nextReminders = { ...s.reminders };
          releasedNow.forEach((r) => delete nextReminders[r.id]);
          return {
            reminders: nextReminders,
            notifications: dynamic.length
              ? [...dynamic, ...s.notifications].sort((a, b) => b.timestamp - a.timestamp)
              : s.notifications,
          };
        });
      },

      // ── Profile ───────────────────────────────────────────────────────────
      profile: { name: 'Guest', avatarColor: '#E50914' },
      setProfile: (profile) => set({ profile }),

      // ── Search ────────────────────────────────────────────────────────────
      searchOpen: false,
      setSearchOpen: (open) => set({ searchOpen: open }),
      searchQuery: '',
      setSearchQuery: (q) => set({ searchQuery: q }),

      // ── Notifications ─────────────────────────────────────────────────────
      notifications: STATIC_NOTIFICATIONS,
      unreadCount: () => get().notifications.filter((n) => !n.read).length,
      markRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      markAllRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),
      // Called once when TMDB new-release data loads — injects dynamic notifications
      seedDynamicNotifications: (movies) => {
        set((s) => {
          const existingIds = new Set(s.notifications.map((n) => n.id));
          const dynamic: Notification[] = movies.slice(0, 3).map((m) => ({
            id: `notif-newrelease-${m.id}`,
            movieId: m.id,
            headline: `Now Available: ${m.title}`,
            body: `${m.genres.slice(0, 2).join(' · ')} · ${m.year}. Just added to Boozo Tv.`,
            timestamp: Date.now() - Math.random() * 1000 * 60 * 60, // within last hour
            read: false,
            thumbnailUrl: m.poster || undefined,
          })).filter((n) => !existingIds.has(n.id));

          if (dynamic.length === 0) return {};
          return {
            notifications: [...dynamic, ...s.notifications].sort(
              (a, b) => b.timestamp - a.timestamp
            ),
          };
        });
      },
    }),
    {
      name: 'boozo-tv-state',
      partialize: (state) => ({
        myList: state.myList,
        continueWatching: state.continueWatching,
        profile: state.profile,
        notifications: state.notifications,
        reminders: state.reminders,
      }),
    }
  )
);
