import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@profesiograma/shared-types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  setAuth: (token: string, refreshToken: string, user: User) => void;
  setToken: (token: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      setAuth: (token, refreshToken, user) => set({ token, refreshToken, user }),
      setToken: (token, refreshToken) => set({ token, refreshToken }),
      logout: () => {
        const refreshToken = get().refreshToken;
        set({ token: null, refreshToken: null, user: null });
        if (refreshToken) {
          // Revocación en el servidor best-effort: no bloquea el cierre de sesión local.
          fetch(`${BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          }).catch(() => {});
        }
      },
    }),
    { name: 'profesiograma-auth' }
  )
);
