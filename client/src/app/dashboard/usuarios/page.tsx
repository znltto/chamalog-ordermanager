'use client';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/AuthGuard';
import { useEffect, useState } from 'react';
import { FiUser, FiPlus, FiEdit2, FiTrash2, FiArrowLeft, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario, getLojas, createLoja, deleteLoja } from '@/services/api';
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
  endereco: string;
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
    cep: '',
    numero: '',
    endereco: '',
  });

  // Pagination states for users
  const [userPage, setUserPage] = useState(0);
  const usersPerPage = 5;
  const totalUserPages = Math.ceil(usuarios.length / usersPerPage);

  // Pagination states for stores
  const [lojaPage, setLojaPage] = useState(0);
  const lojasPerPage = 5;
  const totalLojaPages = Math.ceil(lojas.length / lojasPerPage);

  // Selection states
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectedLojas, setSelectedLojas] = useState<number[]>([]);

  const fetchAddressFromCep = async (cep: string) => {
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (data.erro) {
        throw new Error('CEP não encontrado');
      }
      return data;
    } catch (error) {
      console.error('Erro ao buscar endereço:', error);
      toast.error('Erro ao buscar endereço');
      return null;
    }
  };

  const handleCepBlur = async () => {
    const cep = lojaFormData.cep.replace(/\D/g, '');
    if (cep.length === 8) {
      const addressData = await fetchAddressFromCep(cep);
      if (addressData) {
        const enderecoCompleto = `${addressData.logradouro}, ${addressData.bairro}, ${addressData.localidade} - ${addressData.uf}${lojaFormData.numero ? `, ${lojaFormData.numero}` : ''}`;
        setLojaFormData(prev => ({
          ...prev,
          endereco: enderecoCompleto,
        }));
      }
    } else {
      toast.error('CEP inválido');
      setLojaFormData(prev => ({ ...prev, endereco: '' }));
    }
  };

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
    // Atualizar endereço se o número mudar
    if (name === 'numero' && lojaFormData.cep.replace(/\D/g, '').length === 8) {
      fetchAddressFromCep(lojaFormData.cep.replace(/\D/g, '')).then(addressData => {
        if (addressData) {
          const enderecoCompleto = `${addressData.logradouro}, ${addressData.bairro}, ${addressData.localidade} - ${addressData.uf}${value ? `, ${value}` : ''}`;
          setLojaFormData(prev => ({
            ...prev,
            endereco: enderecoCompleto,
          }));
        }
      });
    }
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
    if (!lojaFormData.nome || !lojaFormData.cep || !lojaFormData.numero || !lojaFormData.endereco) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }
    try {
      await createLoja({
        nome: lojaFormData.nome,
        endereco: lojaFormData.endereco,
      });
      toast.success('Loja criada com sucesso');
      setModalOpen(false);
      fetchData();
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

  const handleDeleteUser = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await deleteUsuario(id);
        toast.success('Usuário excluído com sucesso');
        fetchData();
        setSelectedUsers(prev => prev.filter(userId => userId !== id));
      } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        toast.error('Erro ao excluir usuário');
      }
    }
  };

  const handleDeleteLoja = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta loja?')) {
      try {
        await deleteLoja(id);
        toast.success('Loja excluída com sucesso');
        fetchData();
        setSelectedLojas(prev => prev.filter(lojaId => lojaId !== id));
      } catch (error) {
        console.error('Erro ao excluir loja:', error);
        toast.error('Erro ao excluir loja');
      }
    }
  };

  const handleBulkDeleteUsers = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Nenhum usuário selecionado');
      return;
    }
    if (window.confirm(`Tem certeza que deseja excluir ${selectedUsers.length} usuário(s)?`)) {
      try {
        await Promise.all(selectedUsers.map(id => deleteUsuario(id)));
        toast.success('Usuários excluídos com sucesso');
        fetchData();
        setSelectedUsers([]);
      } catch (error) {
        console.error('Erro ao excluir usuários:', error);
        toast.error('Erro ao excluir usuários');
      }
    }
  };

  const handleBulkDeleteLojas = async () => {
    if (selectedLojas.length === 0) {
      toast.error('Nenhuma loja selecionada');
      return;
    }
    if (window.confirm(`Tem certeza que deseja excluir ${selectedLojas.length} loja(s)?`)) {
      try {
        await Promise.all(selectedLojas.map(id => deleteLoja(id)));
        toast.success('Lojas excluídas com sucesso');
        fetchData();
        setSelectedLojas([]);
      } catch (error) {
        console.error('Erro ao excluir lojas:', error);
        toast.error('Erro ao excluir lojas');
      }
    }
  };

  const handleSelectUser = (id: number) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(userId => userId !== id) : [...prev, id]
    );
  };

  const handleSelectLoja = (id: number) => {
    setSelectedLojas(prev =>
      prev.includes(id) ? prev.filter(lojaId => lojaId !== id) : [...prev, id]
    );
  };

  const handleSelectAllUsers = () => {
    if (selectedUsers.length === usuarios.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(usuarios.map(user => user.id));
    }
  };

  const handleSelectAllLojas = () => {
    if (selectedLojas.length === lojas.length) {
      setSelectedLojas([]);
    } else {
      setSelectedLojas(lojas.map(loja => loja.id));
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
      cep: '',
      numero: '',
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
        return 'bg-green-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Pagination for users
  const paginatedUsuarios = usuarios.slice(userPage * usersPerPage, (userPage + 1) * usersPerPage);

  // Pagination for stores
  const paginatedLojas = lojas.slice(lojaPage * lojasPerPage, (lojaPage + 1) * lojasPerPage);

  // Generate page numbers for pagination
  const getPageNumbers = (totalPages: number, currentPage: number) => {
    const maxPagesToShow = 5;
    const pages = [];
    let startPage = Math.max(0, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(0, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
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
              <h1 className="text-xl font-bold">Gerenciamento de Usuários e Lojas</h1>
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
        <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Usuários Section */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Usuários</h2>
              {selectedUsers.length > 0 && (
                <button
                  onClick={handleBulkDeleteUsers}
                  className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                >
                  <FiTrash2 />
                  <span>Excluir Selecionados ({selectedUsers.length})</span>
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === usuarios.length && usuarios.length > 0}
                        onChange={handleSelectAllUsers}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nível de Acesso</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data de Criação</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        Carregando usuários...
                      </td>
                    </tr>
                  ) : paginatedUsuarios.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        Nenhum usuário encontrado
                      </td>
                    </tr>
                  ) : (
                    paginatedUsuarios.map((usuario) => (
                      <tr key={usuario.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(usuario.id)}
                            onChange={() => handleSelectUser(usuario.id)}
                            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                          />
                        </td>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEdit(usuario)}
                            className="text-orange-600 hover:text-orange-900 mr-4"
                          >
                            <FiEdit2 className="inline" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(usuario.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <FiTrash2 className="inline" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination for Users */}
            {totalUserPages > 1 && (
              <div className="flex justify-between items-center p-4">
                <button
                  onClick={() => setUserPage(prev => Math.max(prev - 1, 0))}
                  disabled={userPage === 0}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                    userPage === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <FiChevronLeft />
                  <span>Anterior</span>
                </button>
                <div className="flex space-x-2">
                  {getPageNumbers(totalUserPages, userPage).map(page => (
                    <button
                      key={page}
                      onClick={() => setUserPage(page)}
                      className={`px-3 py-1 rounded-md ${
                        userPage === page
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {page + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setUserPage(prev => Math.min(prev + 1, totalUserPages - 1))}
                  disabled={userPage === totalUserPages - 1}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                    userPage === totalUserPages - 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>Próximo</span>
                  <FiChevronRight />
                </button>
              </div>
            )}
          </div>

          {/* Lojas Section */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Lojas</h2>
              {selectedLojas.length > 0 && (
                <button
                  onClick={handleBulkDeleteLojas}
                  className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                >
                  <FiTrash2 />
                  <span>Excluir Selecionados ({selectedLojas.length})</span>
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedLojas.length === lojas.length && lojas.length > 0}
                        onChange={handleSelectAllLojas}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endereço</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        Carregando lojas...
                      </td>
                    </tr>
                  ) : paginatedLojas.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        Nenhuma loja encontrada
                      </td>
                    </tr>
                  ) : (
                    paginatedLojas.map((loja) => (
                      <tr key={loja.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedLojas.includes(loja.id)}
                            onChange={() => handleSelectLoja(loja.id)}
                            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{loja.nome}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{loja.endereco}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleDeleteLoja(loja.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <FiTrash2 className="inline" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination for Lojas */}
            {totalLojaPages > 1 && (
              <div className="flex justify-between items-center p-4">
                <button
                  onClick={() => setLojaPage(prev => Math.max(prev - 1, 0))}
                  disabled={lojaPage === 0}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                    lojaPage === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <FiChevronLeft />
                  <span>Anterior</span>
                </button>
                <div className="flex space-x-2">
                  {getPageNumbers(totalLojaPages, lojaPage).map(page => (
                    <button
                      key={page}
                      onClick={() => setLojaPage(page)}
                      className={`px-3 py-1 rounded-md ${
                        lojaPage === page
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {page + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setLojaPage(prev => Math.min(prev + 1, totalLojaPages - 1))}
                  disabled={lojaPage === totalLojaPages - 1}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                    lojaPage === totalLojaPages - 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>Próximo</span>
                  <FiChevronRight />
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Modal de Criação/Edição */}
        {user?.nivel_acesso === 'admin' && (
          <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
            {modalType === 'user' && (
              <div className="relative z-60 bg-white opacity-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {editMode ? 'Editar Usuário' : 'Criar Novo Usuário'}
                </h2>
                <form onSubmit={handleUserSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="nome" className="block text-sm font-medium text-gray-900 mb-1">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        id="nome"
                        name="nome"
                        value={userFormData.nome}
                        onChange={handleUserInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={userFormData.email}
                        onChange={handleUserInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      />
                    </div>
                    {!editMode && (
                      <>
                        <div>
                          <label htmlFor="senha" className="block text-sm font-medium text-gray-900 mb-1">
                            Senha
                          </label>
                          <input
                            type="password"
                            id="senha"
                            name="senha"
                            value={userFormData.senha}
                            onChange={handleUserInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                            required
                            minLength={6}
                          />
                        </div>
                        <div>
                          <label htmlFor="confirmarSenha" className="block text-sm font-medium text-gray-900 mb-1">
                            Confirmar Senha
                          </label>
                          <input
                            type="password"
                            id="confirmarSenha"
                            name="confirmarSenha"
                            value={userFormData.confirmarSenha}
                            onChange={handleUserInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                            required
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <label htmlFor="nivel_acesso" className="block text-sm font-medium text-gray-900 mb-1">
                        Nível de Acesso
                      </label>
                      <select
                        id="nivel_acesso"
                        name="nivel_acesso"
                        value={userFormData.nivel_acesso}
                        onChange={handleUserInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                      >
                        <option value="cliente">Cliente</option>
                        <option value="funcionario">Funcionário</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="loja_id" className="block text-sm font-medium text-gray-900 mb-1">
                        Loja Associada (Opcional)
                      </label>
                      <select
                        id="loja_id"
                        name="loja_id"
                        value={userFormData.loja_id}
                        onChange={handleUserInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
              </div>
            )}
            {modalType === 'loja' && (
              <div className="relative z-60 bg-white opacity-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Criar Nova Loja</h2>
                <form onSubmit={handleLojaSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="nome" className="block text-sm font-medium text-gray-900 mb-1">
                        Nome da Loja
                      </label>
                      <input
                        type="text"
                        id="nome"
                        name="nome"
                        value={lojaFormData.nome}
                        onChange={handleLojaInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                        placeholder="Ex.: Loja Centro"
                      />
                    </div>
                    <div>
                      <label htmlFor="cep" className="block text-sm font-medium text-gray-900 mb-1">
                        CEP
                      </label>
                      <input
                        type="text"
                        id="cep"
                        name="cep"
                        value={lojaFormData.cep}
                        onChange={handleLojaInputChange}
                        onBlur={handleCepBlur}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                        placeholder="Digite o CEP (ex.: 12345-678)"
                      />
                    </div>
                    <div>
                      <label htmlFor="numero" className="block text-sm font-medium text-gray-900 mb-1">
                        Número do Comércio
                      </label>
                      <input
                        type="text"
                        id="numero"
                        name="numero"
                        value={lojaFormData.numero}
                        onChange={handleLojaInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required
                        placeholder="Ex.: 123 ou s/n"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Endereço
                      </label>
                      <p className="w-full px-3 py-2 bg-gray-100 rounded-md text-gray-900">
                        {lojaFormData.endereco || 'Aguardando CEP válido...'}
                      </p>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setModalOpen(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
              </div>
            )}
          </Modal>
        )}
      </motion.div>
    </AuthGuard>
  );
}