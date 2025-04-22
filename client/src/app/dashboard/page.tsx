'use client';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/AuthGuard';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiPackage, FiTruck, FiCheckCircle, FiUser, FiPlus, FiList, FiUsers, FiChevronLeft, FiChevronRight, FiCamera } from 'react-icons/fi';
import LogoutButton from '@/components/LogoutButton';
import { useEffect, useState, useRef } from 'react';
import { getPedidoEstatisticas, getAtividadesRecentes, fetchPedidosMotoboy, validateQRCode, updatePedidoStatus } from '@/services/api';
import jsQR from 'jsqr';

const CountUpAnimation = ({
  endValue,
  duration = 2,
  suffix = '',
  className = '',
}: {
  endValue: number;
  duration?: number;
  suffix?: string;
  className?: string;
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const increment = endValue / (duration * 60); // 60fps

    const timer = setInterval(() => {
      start += increment;
      if (start >= endValue) {
        setCount(endValue);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 1000 / 60); // 60fps

    return () => clearInterval(timer);
  }, [endValue, duration]);

  return (
    <span className={className}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<{
    total: number;
    emTransito: number;
    entregues: number;
  } | null>(null);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [pedidosMotoboy, setPedidosMotoboy] = useState<{
    id: number;
    codigo: string;
    remetente: string;
    destinatario: string;
    status: string;
    endereco_completo: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 3;
  const totalPages = Math.ceil(atividades.length / itemsPerPage);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [pedido, setPedido] = useState<{
    id: number;
    codigo: string;
    remetente: string;
    destinatario: string;
    status: string;
    endereco_completo: string;
  } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    // Avoid running during SSR
    if (typeof window === 'undefined') return;

    const fetchData = async () => {
      // Wait for auth to complete
      if (authLoading || !user) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        if (user.nivel_acesso === 'funcionario') {
          const pedidosData = await fetchPedidosMotoboy();
          setPedidosMotoboy(pedidosData);
        } else {
          const data = await getPedidoEstatisticas();
          setStats(data);
          const atividadesData = await getAtividadesRecentes();
          setAtividades(atividadesData);
        }
      } catch (err: any) {
        console.error('Erro ao carregar dados:', err);
        setError(err.message || 'Ocorreu um erro ao carregar os dados.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const animationTimer = setTimeout(() => {
      setHasAnimated(true);
    }, 2000);

    return () => clearTimeout(animationTimer);
  }, [user, authLoading]);

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsScanning(true);
        scanQRCode();
      }
    } catch (err) {
      setError('Erro ao acessar a câmera. Verifique as permissões ou use um dispositivo com câmera.');
      console.error(err);
    }
  };

  const stopScanning = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      setIsScanning(false);
    }
  };

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      stopScanning();
      validateQR(code.data);
    } else if (isScanning) {
      requestAnimationFrame(scanQRCode);
    }
  };

  const validateQR = async (qrData: string) => {
    try {
      const response = await validateQRCode(qrData);
      setPedido(response);
      setError(null);
      setModalOpen(true);
    } catch (err: any) {
      setError(err.message || 'QR Code inválido ou erro no servidor');
      setModalOpen(false);
    }
  };

  const confirmTransport = async () => {
    if (!pedido) return;

    try {
      await updatePedidoStatus(pedido.id, 'em_transito');
      setModalOpen(false);
      setPedidosMotoboy(pedidosMotoboy.filter((p) => p.id !== pedido.id));
      alert('Pedido marcado como em trânsito!');
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar status do pedido');
    }
  };

  const nextPage = () => {
    setCurrentPage((prev) => (prev < totalPages - 1 ? prev + 1 : prev));
  };

  const prevPage = () => {
    setCurrentPage((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const paginatedAtividades = atividades.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

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

  // Layout para motoboys
  if (user?.nivel_acesso === 'funcionario') {
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
            <div className="max-w-md mx-auto px-4 py-4 flex justify-between items-center">
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
            className="max-w-md mx-auto px-4 py-8"
          >
            {/* Resumo de Pedidos */}
            <motion.div
              variants={itemVariants}
              className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-6"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FiPackage className="text-orange-500" />
                <span>Seus Pedidos</span>
              </h2>
              <div className="space-y-4">
                {loading ? (
                  <p className="text-gray-700">Carregando pedidos...</p>
                ) : error ? (
                  <p className="text-red-500">{error}</p>
                ) : pedidosMotoboy.length > 0 ? (
                  pedidosMotoboy.map((pedido) => (
                    <motion.div
                      key={pedido.id}
                      whileHover={{ scale: 1.02 }}
                      className="flex justify-between items-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-full shadow">
                          <FiPackage className="text-orange-500" />
                        </div>
                        <div>
                          <p className="text-gray-800 font-medium">Pedido #{pedido.codigo}</p>
                          <p className="text-sm text-gray-600">{pedido.endereco_completo}</p>
                        </div>
                      </div>
                      <span className="text-sm text-gray-600">{pedido.status}</span>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-gray-700">Nenhum pedido atribuído.</p>
                )}
              </div>
            </motion.div>

            {/* Ações Rápidas */}
            <motion.div
              variants={itemVariants}
              className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FiCamera className="text-orange-500" />
                <span>Ação Rápida</span>
              </h2>
              <div className="space-y-3">
                {!isScanning ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={startScanning}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-md"
                  >
                    <FiCamera />
                    <span>Escanear Pedido</span>
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={stopScanning}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md"
                  >
                    <span>Parar Escaneamento</span>
                  </motion.button>
                )}
                <video
                  ref={videoRef}
                  className={`w-full mt-4 ${isScanning ? 'block' : 'hidden'} rounded-lg`}
                />
                <canvas ref={canvasRef} className="hidden" />
                {error && <p className="text-red-500 text-center mt-4">{error}</p>}
              </div>
            </motion.div>
          </motion.main>

          {/* Modal de Confirmação */}
          {modalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white p-6 rounded-xl max-w-sm w-full mx-4"
              >
                {pedido && (
                  <>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Confirmar Pedido</h3>
                    <p className="text-gray-800"><strong>Código:</strong> {pedido.codigo}</p>
                    <p className="text-gray-800"><strong>Endereço:</strong> {pedido.endereco_completo}</p>
                    <div className="flex gap-4 mt-6">
                      <button
                        onClick={confirmTransport}
                        className="flex-1 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition"
                      >
                        Iniciar Transporte
                      </button>
                      <button
                        onClick={() => setModalOpen(false)}
                        className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </AuthGuard>
    );
  }

  // Layout original para outros usuários
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
                  <>
                    {paginatedAtividades.map((atividade, index) => (
                      <motion.div
                        key={atividade.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border-b border-gray-100 pb-3 last:border-0"
                      >
                        <p className="text-sm font-medium text-gray-800">{atividade.descricao}</p>
                        <p className="text-xs text-gray-600">{new Date(atividade.data_criacao).toLocaleString()}</p>
                      </motion.div>
                    ))}
                    {totalPages > 1 && (
                      <div className="flex justify-between items-center pt-2">
                        <button
                          onClick={prevPage}
                          disabled={currentPage === 0}
                          className={`p-2 rounded-full ${currentPage === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
                        >
                          <FiChevronLeft />
                        </button>
                        <span className="text-sm text-gray-600">
                          Página {currentPage + 1} de {totalPages}
                        </span>
                        <button
                          onClick={nextPage}
                          disabled={currentPage === totalPages - 1}
                          className={`p-2 rounded-full ${currentPage === totalPages - 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
                        >
                          <FiChevronRight />
                        </button>
                      </div>
                    )}
                  </>
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
            className="mt-8 bg-white p-6 rounded-xl shadow-lg border border-gray-100 relative"
          >
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Bem-vindo ao <span className="text-orange-500">Painel ChamaLog</span>
              </h2>
              <p className="text-gray-700 mb-6 max-w-lg">
                Aqui você pode gerenciar todos os pedidos, acompanhar entregas e monitorar o desempenho da sua operação.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500"
                >
                  <p className="text-sm text-gray-600 mb-1">Faturamento Mensal</p>
                  {hasAnimated ? (
                    <span className="text-2xl font-bold text-orange-600">
                      {(28460).toLocaleString()}
                    </span>
                  ) : (
                    <CountUpAnimation
                      endValue={28460}
                      className="text-2xl font-bold text-orange-600"
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-1">+12% em relação ao mês passado</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500"
                >
                  <p className="text-sm text-gray-600 mb-1">Pedidos Ativos</p>
                  {hasAnimated ? (
                    <span className="text-2xl font-bold text-blue-600">
                      {(47).toLocaleString()}
                    </span>
                  ) : (
                    <CountUpAnimation
                      endValue={47}
                      className="text-2xl font-bold text-blue-600"
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-1">5 novos hoje</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500"
                >
                  <p className="text-sm text-gray-600 mb-1">Satisfação</p>
                  {hasAnimated ? (
                    <span className="text-2xl font-bold text-green-600">
                      {(94).toLocaleString()}%
                    </span>
                  ) : (
                    <CountUpAnimation
                      endValue={94}
                      suffix="%"
                      className="text-2xl font-bold text-green-600"
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-1">Média de avaliações</p>
                </motion.div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-orange-600">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span>Sistema online e operacional</span>
              </div>
            </div>
          </motion.div>
        </motion.main>
      </motion.div>
    </AuthGuard>
  );
}