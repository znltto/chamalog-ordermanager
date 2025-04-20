'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-toastify';

// Definimos um tipo para os níveis de acesso
type NivelAcesso = 'cliente' | 'funcionario' | 'admin';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredLevel?: NivelAcesso;
}

export default function AuthGuard({ children, requiredLevel = 'cliente' }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Usamos Record para garantir a tipagem correta
  const accessLevels: Record<NivelAcesso, number> = {
    'cliente': 1,
    'funcionario': 2,
    'admin': 3
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user && user.nivel_acesso && accessLevels[user.nivel_acesso as NivelAcesso] < accessLevels[requiredLevel]) {
      router.push('/dashboard');
      toast.error('Acesso não autorizado');
    }
  }, [user, loading, router, requiredLevel]);

  if (loading || !user || 
      (user.nivel_acesso && accessLevels[user.nivel_acesso as NivelAcesso] < accessLevels[requiredLevel])) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return <>{children}</>;
}