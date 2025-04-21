const API_URL = 'http://localhost:5000/api';

// Interface para a estrutura de uma loja
interface Loja {
  id: number;
  nome: string;
  endereco: string;
}

interface LoginResponse {
  user: {
    id: number;
    nome: string;
    email: string;
    nivel_acesso: 'admin' | 'funcionario' | 'cliente';
  };
  token: string;
}

// Interface para os pedidos
interface Pedido {
  id: number;
  codigo: string;
  remetente: string;
  destinatario: string;
  status: string;
  endereco_completo: string;
}

// Interface para as estatísticas de pedidos
interface PedidoEstatisticas {
  total: number;
  emTransito: number;
  entregues: number;
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
  if (!token) throw new Error('Token de autenticação não encontrado');
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
  if (!token) throw new Error('Token de autenticação não encontrado');
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
  if (!token) throw new Error('Token de autenticação não encontrado');
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

// Função para buscar todos os pedidos
export const getPedidos = async (): Promise<Pedido[]> => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Token de autenticação não encontrado');
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

// Função para buscar pedidos do motoboy
export const fetchPedidosMotoboy = async (): Promise<Pedido[]> => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Token de autenticação não encontrado');
  const response = await fetch(`${API_URL}/pedidos/motoboy`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao buscar pedidos do motoboy');
  }

  return await response.json();
};

// Função para validar QR Code
export const validateQRCode = async (qrData: string): Promise<Pedido> => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Token de autenticação não encontrado');
  const response = await fetch(`${API_URL}/validar-qr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ qrData }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao validar QR Code');
  }

  return await response.json();
};

// Funções para gerenciamento de usuários
export const getUsuarios = async (): Promise<any[]> => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Token de autenticação não encontrado');
  const response = await fetch(`${API_URL}/usuarios`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao carregar usuários');
  }
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
  if (!token) throw new Error('Token de autenticação não encontrado');
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

export const updateUsuario = async (
  id: number,
  data: {
    nome: string;
    email: string;
    nivel_acesso: 'admin' | 'funcionario' | 'cliente';
    loja_id?: number;
  }
): Promise<any> => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Token de autenticação não encontrado');
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
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

    const response = await fetch(`${API_URL}/usuarios/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        throw new Error(`Falha ao processar resposta do servidor: ${response.statusText}`);
      }

      switch (response.status) {
        case 401:
          throw new Error('Não autorizado. Token inválido ou expirado.');
        case 403:
          throw new Error('Você não tem permissão para esta ação.');
        case 404:
          throw new Error('Usuário não encontrado.');
        case 409:
          throw new Error(errorData.message || 'O usuário possui registros associados e não pode ser excluído.');
        case 500:
          throw new Error(errorData.message || 'Erro interno no servidor. Tente novamente mais tarde.');
        default:
          throw new Error(errorData.message || `Erro ao excluir usuário: ${response.statusText}`);
      }
    }
  } catch (error) {
    throw error; // Re-lança outros erros
  }
};

// Funções para gerenciamento de lojas
export const createLoja = async (data: { nome: string; endereco: string }): Promise<any> => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Token de autenticação não encontrado');
  const response = await fetch(`${API_URL}/lojas`, {
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

export const getLojas = async (): Promise<Loja[]> => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Token de autenticação não encontrado');
  const response = await fetch(`${API_URL}/lojas`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao carregar lojas');
  }
  return response.json();
};

export const createPedido = async (data: {
  codigo: string;
  remetente: string;
  destinatario: string;
  endereco_completo: string;
  peso: number;
  dimensoes: string;
  valor: number;
  origem: number;
  usuario_id: number;
  motoboy_id?: number;
}): Promise<any> => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Token de autenticação não encontrado');
  const response = await fetch(`${API_URL}/pedidos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao criar pedido');
  }
  return response.json();
};

export const deleteLoja = async (id: number): Promise<void> => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Token de autenticação não encontrado');
  const response = await fetch(`${API_URL}/lojas/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Erro ao excluir loja');
  }
};