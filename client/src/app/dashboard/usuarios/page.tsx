'use client';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/AuthGuard';
import { useEffect, useState } from 'react';
import { FiUser, FiPlus, FiEdit2, FiTrash2, FiArrowLeft } from 'react-icons/fi';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario, getLojas, createLoja } from '@/services/api';
import { toast } from 'react-toastify';
import Modal from '@/components/Modal';

interface Usuario {
  id: number;
  nome: string;
  email: string;
  nivel_acesso: 'cliente' | 'funcionario' | 'admin';
  criado_em: string;
}

interface Loja {
  id: number;
  nome: string;
}

export default function UsuariosPage() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'user' | 'loja' | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [currentUsuario, setCurrentUsuario] = useState<Partial<Usuario> | null>(null);
  const [userFormData, setUserFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    nivel_acesso: 'cliente' as 'cliente' | 'funcionario' | 'admin',
    loja_id: '',
  });
  const [lojaFormData, setLojaFormData] = useState({
    nome: '',
    endereco: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const usuariosData = await getUsuarios();
      setUsuarios(usuariosData);

      const lojasData = await getLojas();
      setLojas(lojasData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setError('Ocorreu um erro ao carregar os dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUserFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLojaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLojaFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (userFormData.senha !== userFormData.confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }

    try {
      if (editMode && currentUsuario?.id) {
        await updateUsuario(currentUsuario.id, {
          nome: userFormData.nome,
          email: userFormData.email,
          nivel_acesso: userFormData.nivel_acesso,
          loja_id: userFormData.loja_id ? parseInt(userFormData.loja_id) : undefined,
        });
        toast.success('Usuário atualizado com sucesso');
      } else {
        await createUsuario({
          nome: userFormData.nome,
          email: userFormData.email,
          senha: userFormData.senha,
          nivel_acesso: userFormData.nivel_acesso,
          loja_id: userFormData.loja_id ? parseInt(userFormData.loja_id) : undefined,
        });
        toast.success('Usuário criado com sucesso');
      }

      setModalOpen(false);
      fetchData();
      resetUserForm();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      toast.error('Erro ao salvar usuário');
    }
  };

  const handleLojaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createLoja({
        nome: lojaFormData.nome,
        endereco: lojaFormData.endereco,
      });
      toast.success('Loja criada com sucesso');
      setModalOpen(false);
      fetchData(); // Refresh lojas
      resetLojaForm();
    } catch (error) {
      console.error('Erro ao criar loja:', error);
      toast.error('Erro ao criar loja');
    }
  };

  const handleEdit = (usuario: Usuario) => {
    setCurrentUsuario(usuario);
    setEditMode(true);
    setUserFormData({
      nome: usuario.nome,
      email: usuario.email,
      senha: '',
      confirmarSenha: '',
      nivel_acesso: usuario.nivel_acesso,
      loja_id: '',
    });
    setModalType('user');
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await deleteUsuario(id);
        toast.success('Usuário excluído com sucesso');
        fetchData();
      } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        toast.error('Erro ao excluir usuário');
      }
    }
  };

  const resetUserForm = () => {
    setUserFormData({
      nome: '',
      email: '',
      senha: '',
      confirmarSenha: '',
      nivel_acesso: 'cliente',
      loja_id: '',
    });
    setCurrentUsuario(null);
    setEditMode(false);
  };

  const resetLojaForm = () => {
    setLojaFormData({
      nome: '',
      endereco: '',
    });
  };

  const openCreateUserModal = () => {
    resetUserForm();
    setModalType('user');
    setModalOpen(true);
  };

  const openCreateLojaModal = () => {
    resetLojaForm();
    setModalType('loja');
    setModalOpen(true);
  };

  const getNivelAcessoLabel = (nivel: 'cliente' | 'funcionario' | 'admin') => {
    switch (nivel) {
      case 'admin':
        return 'Administrador';
      case 'funcionario':
        return 'Funcionário';
      case 'cliente':
        return 'Cliente';
      default:
        return nivel;
    }
  };

  const getNivelAcessoClass = (nivel: 'cliente' | 'funcionario' | 'admin') => {
    switch (nivel) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'funcionario':
        return 'bg-blue-100 text-blue-800';
      case 'cliente':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AuthGuard requiredLevel="admin">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100"
      >
        {/* Header */}
        <header className="bg-orange-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="hover:bg-orange-700 p-2 rounded-full transition">
                <FiArrowLeft className="text-xl" />
              </Link>
              <h1 className="text-xl font-bold">Gerenciamento de Usuários</h1>
            </div>
            {user?.nivel_acesso === 'admin' && (
              <div className="flex items-center space-x-4">
                <button
                  onClick={openCreateUserModal}
                  className="flex items-center space-x-2 bg-white text-orange-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
                >
                  <FiPlus />
                  <span>Criar Usuário</span>
                </button>
                <button
                  onClick={openCreateLojaModal}
                  className="flex items-center space-x-2 bg-white text-orange-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
                >
                  <FiPlus />
                  <span>Criar Loja</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nível de Acesso</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data de Criação</th>
                    {user?.nivel_acesso === 'admin' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={user?.nivel_acesso === 'admin' ? 5 : 4} className="px-6 py-4 text-center text-gray-500">
                        Carregando usuários...
                      </td>
                    </tr>
                  ) : usuarios.length === 0 ? (
                    <tr>
                      <td colSpan={user?.nivel_acesso === 'admin' ? 5 : 4} className="px-6 py-4 text-center text-gray-500">
                        Nenhum usuário encontrado
                      </td>
                    </tr>
                  ) : (
                    usuarios.map((usuario) => (
                      <tr key={usuario.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                              <FiUser className="text-orange-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{usuario.nome}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{usuario.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getNivelAcessoClass(usuario.nivel_acesso)}`}>
                            {getNivelAcessoLabel(usuario.nivel_acesso)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(usuario.criado_em).toLocaleDateString('pt-BR')}
                        </td>
                        {user?.nivel_acesso === 'admin' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleEdit(usuario)}
                              className="text-orange-600 hover:text-orange-900 mr-4"
                            >
                              <FiEdit2 className="inline" />
                            </button>
                            <button
                              onClick={() => handleDelete(usuario.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <FiTrash2 className="inline" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Modal de Criação/Edição */}
        {user?.nivel_acesso === 'admin' && (
          <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
            {modalType === 'user' && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {editMode ? 'Editar Usuário' : 'Criar Novo Usuário'}
                </h2>
                <form onSubmit={handleUserSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        id="nome"
                        name="nome"
                        value={userFormData.nome}
                        onChange={handleUserInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={userFormData.email}
                        onChange={handleUserInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>

                    {!editMode && (
                      <>
                        <div>
                          <label htmlFor="senha" className="block text-sm font-medium text-gray-700 mb-1">
                            Senha
                          </label>
                          <input
                            type="password"
                            id="senha"
                            name="senha"
                            value={userFormData.senha}
                            onChange={handleUserInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            required={!editMode}
                            minLength={6}
                          />
                        </div>

                        <div>
                          <label htmlFor="confirmarSenha" className="block text-sm font-medium text-gray-700 mb-1">
                            Confirmar Senha
                          </label>
                          <input
                            type="password"
                            id="confirmarSenha"
                            name="confirmarSenha"
                            value={userFormData.confirmarSenha}
                            onChange={handleUserInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                            required={!editMode}
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label htmlFor="nivel_acesso" className="block text-sm font-medium text-gray-700 mb-1">
                        Nível de Acesso
                      </label>
                      <select
                        id="nivel_acesso"
                        name="nivel_acesso"
                        value={userFormData.nivel_acesso}
                        onChange={handleUserInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      >
                        <option value="cliente">Cliente</option>
                        <option value="funcionario">Funcionário</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="loja_id" className="block text-sm font-medium text-gray-700 mb-1">
                        Loja Associada (Opcional)
                      </label>
                      <select
                        id="loja_id"
                        name="loja_id"
                        value={userFormData.loja_id}
                        onChange={handleUserInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Selecione uma loja</option>
                        {lojas.map((loja) => (
                          <option key={loja.id} value={loja.id}>
                            {loja.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setModalOpen(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        {editMode ? 'Atualizar' : 'Criar'}
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}

            {modalType === 'loja' && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Criar Nova Loja</h2>
                <form onSubmit={handleLojaSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                        Nome da Loja
                      </label>
                      <input
                        type="text"
                        id="nome"
                        name="nome"
                        value={lojaFormData.nome}
                        onChange={handleLojaInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="endereco" className="block text-sm font-medium text-gray-700 mb-1">
                        Endereço
                      </label>
                      <input
                        type="text"
                        id="endereco"
                        name="endereco"
                        value={lojaFormData.endereco}
                        onChange={handleLojaInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setModalOpen(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        Criar
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </Modal>
        )}
      </motion.div>
    </AuthGuard>
  );
}