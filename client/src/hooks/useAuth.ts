'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  nome: string;
  email: string;
  nivel_acesso: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadUser = () => {
      // Verifica tanto localStorage quanto sessionStorage
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');

      if (token && storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  const login = (user: User, token: string, rememberMe: boolean) => {
    // Armazena em localStorage ou sessionStorage com base em rememberMe
    if (rememberMe) {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
    } else {
      sessionStorage.setItem('user', JSON.stringify(user));
      sessionStorage.setItem('token', token);
    }
    setUser(user);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    setUser(null);
    router.push('/'); // Redireciona para a raiz (tela de login)
  };

  return { user, loading, login, logout };
}