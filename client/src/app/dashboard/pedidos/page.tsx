'use client';

import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/AuthGuard';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FiUser, FiPlus, FiEdit2, FiTrash2, FiArrowLeft } from 'react-icons/fi';
import { getPedidos, updatePedidoStatus, deletePedido } from '@/services/api';

export default function PedidosPage() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPedidos, setSelectedPedidos] = useState<number[]>([]); // IDs dos pedidos selecionados
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const data = await getPedidos();
        setPedidos(data);
        setTotalPages(Math.ceil(data.length / itemsPerPage));
      } catch (err) {
        console.error('Erro ao carregar pedidos:', err);
        setError('Ocorreu um erro ao carregar os pedidos.');
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'entregue':
        return 'bg-green-100 text-green-800';
      case 'em_transito':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const handleStatusChange = async (pedidoId: number, newStatus: string) => {
    try {
      await updatePedidoStatus(pedidoId, newStatus);
      setPedidos((prevPedidos) =>
        prevPedidos.map((pedido) =>
          pedido.id === pedidoId ? { ...pedido, status: newStatus } : pedido
        )
      );
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setError('Ocorreu um erro ao atualizar o status do pedido.');
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm('Tem certeza de que deseja excluir os pedidos selecionados?')) {
      return;
    }

    try {
      await Promise.all(selectedPedidos.map((id) => deletePedido(id)));
      setPedidos((prevPedidos) => prevPedidos.filter((pedido) => !selectedPedidos.includes(pedido.id)));
      setSelectedPedidos([]); // Limpa a seleção após a exclusão
    } catch (err) {
      console.error('Erro ao excluir pedidos:', err);
      setError('Ocorreu um erro ao excluir os pedidos.');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedPedidos(paginatedPedidos.map((pedido) => pedido.id));
    } else {
      setSelectedPedidos([]);
    }
  };

  const paginatedPedidos = pedidos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 text-lg">{error}</p>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
{/* Header */}
<header className="bg-orange-600 text-white shadow-lg">
  <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
    <div className="flex items-center space-x-4">
      <Link href="/dashboard" className="hover:bg-orange-700 p-2 rounded-full transition">
        <FiArrowLeft className="text-xl" />
      </Link>
      <h1 className="text-xl font-bold">Lista de Pedidos</h1>
    </div>
    <div className="flex items-center space-x-4">
      <Link
        href="/dashboard/pedidos/novo"
        className="flex items-center space-x-2 bg-white text-orange-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
      >
        <FiPlus />
        <span>Novo Pedido</span>
      </Link>
    </div>
  </div>
</header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 flex justify-between items-center">
              <div>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedPedidos.length === 0}
                  className={`px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition ${
                    selectedPedidos.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 inline-block mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2h3.382l-.724 1.447A1 1 0 007 8H4a1 1 0 000 2h3l2 2h3l2-2h3a1 1 0 100-2h-3l-2-2h-3zM7 10a1 1 0 000 2h6a1 1 0 100-2H7z"
                    />
                  </svg>
                  Excluir Selecionados
                </button>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">Página {currentPage} de {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={paginatedPedidos.every((pedido) => selectedPedidos.includes(pedido.id))}
                      onChange={handleSelectAll}
                      className="form-checkbox h-4 w-4 text-orange-600 focus:ring-orange-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remetente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destinatário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedPedidos.length > 0 ? (
                  paginatedPedidos.map((pedido) => (
                    <tr key={pedido.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <input
                          type="checkbox"
                          checked={selectedPedidos.includes(pedido.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPedidos((prev) => [...prev, pedido.id]);
                            } else {
                              setSelectedPedidos((prev) => prev.filter((id) => id !== pedido.id));
                            }
                          }}
                          className="form-checkbox h-4 w-4 text-orange-600 focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pedido.codigo}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pedido.remetente}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pedido.destinatario}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={pedido.status}
                          onChange={(e) => handleStatusChange(pedido.id, e.target.value)}
                          className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 ${getStatusColor(pedido.status)}`}
                        >
                          <option value="pendente" className="bg-yellow-100 text-yellow-800">
                            Pendente
                          </option>
                          <option value="em_transito" className="bg-blue-100 text-blue-800">
                            Em Trânsito
                          </option>
                          <option value="entregue" className="bg-green-100 text-green-800">
                            Entregue
                          </option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                        <Link
                          href={`/api/etiquetas?pedido_id=${pedido.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Etiqueta
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                      Nenhum pedido encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}