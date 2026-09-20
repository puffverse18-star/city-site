'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type AdminRole = 'superadmin' | 'admin' | 'catalog_manager';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
}

interface AdminContextType {
  user: AdminUser;
  switchRole: (role: AdminRole) => Promise<void>;
  isLoading: boolean;
}

const defaultUser: AdminUser = {
  id: 'usr_superadmin',
  name: 'Directeur Général CITY',
  email: 'direction@cityelectronique.ma',
  role: 'superadmin',
};

const AdminSessionContext = createContext<AdminContextType>({
  user: defaultUser,
  switchRole: async () => {},
  isLoading: false,
});

export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser>(defaultUser);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/auth/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.user) {
          setUser(data.user);
        }
      })
      .catch((e) => {
        console.error('Erreur chargement session admin:', e);
      });

    return () => {
      active = false;
    };
  }, []);

  const switchRole = async (role: AdminRole) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (e) {
      console.error('Erreur bascule de rôle:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminSessionContext.Provider value={{ user, switchRole, isLoading }}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  return useContext(AdminSessionContext);
}
