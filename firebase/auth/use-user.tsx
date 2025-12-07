
'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type Auth, type User } from 'firebase/auth';

import { useAuth } from '@/firebase/provider';

export interface UserAuthHookResult {
  user: User | null;
  isUserLoading: boolean;
}

export function useUser(): UserAuthHookResult {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(auth?.currentUser || null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (authUser) => {
        setUser(authUser);
        setIsUserLoading(false);
      });
      return () => unsubscribe();
    } else {
      setUser(null);
      setIsUserLoading(false);
    }
  }, [auth]);

  return { user, isUserLoading };
}
