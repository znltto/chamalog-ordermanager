'use client';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/AuthGuard';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiPackage, FiTruck, FiCheckCircle, FiUser, FiPlus, FiList, FiUsers } from 'react-icons/fi';
import LogoutButton from '@/components/LogoutButton';
import { useEffect, useState } from 'react';
import { getPedidoEstatisticas, getAtividadesRecentes } from '@/services/api';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    total: number;
    emTransito: number;
    entregues: number;
  } | null>(null);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar estatísticas de pedidos
        const data = await getPedidoEstatisticas();
        setStats(data);

        // Buscar atividades recentes
        const atividadesData = await getAtividadesRecentes();
        setAtividades(atividadesData);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Ocorreu um erro ao carregar os dados.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
      },
    },
  };

  return (
    <AuthGuard>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100"
      >
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 100 }}
          className="bg-orange-600 text-white shadow-lg"
        >
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <motion.div
              initial={{ x: -20 }}
              animate={{ x: 0 }}
              className="flex items-center"
            >
              <div className="relative w-32 h-10">
                <Image
                  src="/logo.png"
                  alt="Logo ChamaLog"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </motion.div>
            <motion.div
              initial={{ x: 20 }}
              animate={{ x: 0 }}
              className="flex items-center space-x-4"
            >
              <div className="flex items-center space-x-2">
                <FiUser className="text-orange-100" />
                <span className="font-semibold text-white">{user?.nome}</span>
              </div>
              <LogoutButton />
            </motion.div>
          </div>
        </motion.header>

        {/* Main Content */}
        <motion.main
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-7xl mx-auto px-4 py-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Resumo de Pedidos */}
            <motion.div
              variants={itemVariants}
              className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FiPackage className="text-orange-500" />
                <span>Resumo de Pedidos</span>
              </h2>
              <div className="space-y-4">
                {loading ? (
                  <p className="text-gray-700">Carregando estatísticas...</p>
                ) : stats ? (
                  <>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="flex justify-between items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-full shadow">
                          <FiPackage className="text-orange-500" />
                        </div>
                        <span className="text-gray-800">Total de Pedidos</span>
                      </div>
                      <span className="font-bold text-lg text-gray-900">{stats.total}</span>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="flex justify-between items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-full shadow">
                          <FiTruck className="text-blue-500" />
                        </div>
                        <span className="text-gray-800">Em Trânsito</span>
                      </div>
                      <span className="font-bold text-lg text-gray-900">{stats.emTransito}</span>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="flex justify-between items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-full shadow">
                          <FiCheckCircle className="text-green-500" />
                        </div>
                        <span className="text-gray-800">Entregues</span>
                      </div>
                      <span className="font-bold text-lg text-gray-900">{stats.entregues}</span>
                    </motion.div>
                  </>
                ) : (
                  <p className="text-red-500">Erro ao carregar estatísticas.</p>
                )}
              </div>
            </motion.div>

            {/* Ações Rápidas */}
            <motion.div
              variants={itemVariants}
              className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FiList className="text-orange-500" />
                <span>Ações Rápidas</span>
              </h2>
              <div className="space-y-3">
                <motion.div whileHover={{ scale: 1.02 }}>
                  <Link
                    href="/dashboard/pedidos/novo"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-md"
                  >
                    <FiPlus />
                    <span>Novo Pedido</span>
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }}>
                  <Link
                    href="/dashboard/pedidos"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-all"
                  >
                    <FiList />
                    <span>Ver Todos Pedidos</span>
                  </Link>
                </motion.div>
                {user?.nivel_acesso === 'admin' && (
                  <motion.div whileHover={{ scale: 1.02 }}>
                    <Link
                      href="/dashboard/usuarios"
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-all"
                    >
                      <FiUsers />
                      <span>Gerenciar Usuários</span>
                    </Link>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Atividades Recentes */}
            <motion.div
              variants={itemVariants}
              className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FiTruck className="text-orange-500" />
                <span>Atividades Recentes</span>
              </h2>
              <div className="space-y-3">
                {loading ? (
                  <p className="text-gray-700">Carregando atividades...</p>
                ) : error ? (
                  <p className="text-red-500">{error}</p>
                ) : atividades.length > 0 ? (
                  atividades.map((atividade, index) => (
                    <motion.div
                      key={atividade.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border-b border-gray-100 pb-3 last:border-0"
                    >
                      <p className="text-sm font-medium text-gray-800">{atividade.action}</p>
                      <p className="text-xs text-gray-600">{atividade.time}</p>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-gray-700">Nenhuma atividade encontrada.</p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Bloco de Bem-Vindo */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-gray-100"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">Bem-vindo ao Painel ChamaLog</h2>
            <p className="text-gray-700">
              Aqui você pode gerenciar todos os pedidos, acompanhar entregas e muito mais. Comece
              criando um novo pedido ou visualizando os existentes.
            </p>
          </motion.div>
        </motion.main>
      </motion.div>
    </AuthGuard>
  );
}