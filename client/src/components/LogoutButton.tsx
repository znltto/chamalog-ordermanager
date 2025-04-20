'use client';

import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { FiLogOut } from 'react-icons/fi';

export default function LogoutButton() {
  const { logout } = useAuth();

  return (
    <motion.button
      onClick={logout}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg shadow-md hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all"
    >
      <FiLogOut className="text-white" />
      <span>Sair</span>
    </motion.button>
  );
} 