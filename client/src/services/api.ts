const API_URL = 'http://localhost:5000/api';

interface LoginResponse {
  user: {
    id: number;
    nome: string;
    email: string;
    nivel_acesso: 'admin' | 'funcionario' | 'cliente';
  };
  token: string;
}

export const login = async (email: string, senha: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, senha }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao fazer login');
  }

  return await response.json();
};

// Interface para as estatísticas de pedidos
interface PedidoEstatisticas {
  total: number;
  emTransito: number;
  entregues: number;
}

// Função para buscar atividades recentes
export const getAtividadesRecentes = async (): Promise<any[]> => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) throw new Error('Token não encontrado');

  const response = await fetch(`${API_URL}/atividades-recentes`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao buscar atividades recentes');
  }

  return await response.json();
};

// Função para excluir um pedido
export const deletePedido = async (pedidoId: number): Promise<void> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/pedidos/${pedidoId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao excluir o pedido');
  }
};

// Função para atualizar o status de um pedido
export const updatePedidoStatus = async (pedidoId: number, status: string): Promise<void> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/pedidos/${pedidoId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao atualizar o status do pedido');
  }
};

// Função para buscar estatísticas de pedidos
export const getPedidoEstatisticas = async (): Promise<PedidoEstatisticas> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/pedido-estatisticas`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao buscar estatísticas de pedidos');
  }

  return await response.json();
};

// Interface para os pedidos
interface Pedido {
  id: number;
  codigo: string;
  remetente: string;
  destinatario: string;
  status: string;
}

// Função para buscar todos os pedidos
export const getPedidos = async (): Promise<Pedido[]> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/pedidos`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao buscar pedidos');
  }

  return await response.json();
};

// Funções para gerenciamento de usuários
export const getUsuarios = async (): Promise<any[]> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/usuarios`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Erro ao carregar usuários');
  return response.json();
};

export const createUsuario = async (data: {
  nome: string;
  email: string;
  senha: string;
  nivel_acesso: 'admin' | 'funcionario' | 'cliente';
  loja_id?: number;
}): Promise<any> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/usuarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao criar usuário');
  }
  return response.json();
};

export const updateUsuario = async (id: number, data: {
  nome: string;
  email: string;
  nivel_acesso: 'admin' | 'funcionario' | 'cliente';
  loja_id?: number;
}): Promise<any> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/usuarios/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao atualizar usuário');
  }
  return response.json();
};

export const deleteUsuario = async (id: number): Promise<void> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/usuarios/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao excluir usuário');
  }
};

export const createLoja = async (data: { nome: string; endereco: string }) => {
  const token = localStorage.getItem('token'); // Assuming token is stored in localStorage
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/lojas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao criar loja');
  }

  return response.json();
};

export const getLojas = async (): Promise<any[]> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/lojas`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Erro ao carregar lojas');
  return response.json();
};