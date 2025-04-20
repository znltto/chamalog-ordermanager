'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiPlus, FiArrowLeft, FiDownload, FiPrinter, FiX } from 'react-icons/fi';
import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

interface Loja {
  id: number;
  nome: string;
}

interface Endereco {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  complemento?: string;
}

export default function NovoPedidoPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [formData, setFormData] = useState({
    lojaId: '',
    cep: '',
    numero: '',
    complemento: '',
    destinatario: '',
    peso: '',
    dimensoes: '',
    valor: '',
  });
  const [endereco, setEndereco] = useState<Endereco | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Buscar lojas do backend
  useEffect(() => {
    const fetchLojas = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) throw new Error('Token não encontrado');
        const response = await fetch('http://localhost:5000/api/lojas', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erro ao buscar lojas (Status: ${response.status})`);
        }
        const data = await response.json();
        setLojas(data);
      } catch (err) {
        console.error('Erro ao carregar lojas:', err);
        setError('Erro ao carregar lojas: ' + err);
      }
    };
    fetchLojas();
  }, []);

  // Buscar endereço pelo CEP
  const handleCepChange = async (cep: string) => {
    setFormData({ ...formData, cep });
    setError(null);
    setEndereco(null);

    if (cep.length === 8) {
      setIsCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (data.erro) {
          setError('CEP inválido ou não encontrado.');
        } else {
          setEndereco({
            cep: data.cep,
            logradouro: data.logradouro,
            bairro: data.bairro,
            localidade: data.localidade,
            uf: data.uf,
            complemento: data.complemento || '',
          });
        }
      } catch (err) {
        setError('Erro ao buscar endereço.');
      } finally {
        setIsCepLoading(false);
      }
    } else {
      setError('CEP incompleto. Digite 8 dígitos.');
    }
  };

  // Manipular mudanças nos campos
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError(null); // Limpa erros ao alterar campos
  };

  // Verifica se o formulário é válido
  const isFormValid = () => {
    const { lojaId, cep, numero, destinatario, peso, dimensoes, valor } = formData;
  
    // Verifica se todos os campos obrigatórios estão preenchidos
    if (!lojaId) {
      setError('Selecione uma loja de origem.');
      return false;
    }
  
    if (!cep || cep.length !== 8 || !endereco) {
      setError('CEP inválido ou incompleto.');
      return false;
    }
  
    if (!numero) {
      setError('O número do endereço é obrigatório.');
      return false;
    }
  
    if (!destinatario) {
      setError('O destinatário é obrigatório.');
      return false;
    }
  
    if (!peso) {
      setError('Selecione o peso do pedido.');
      return false;
    }
  
    if (!dimensoes) {
      setError('Selecione as dimensões do pedido.');
      return false;
    }
  
    if (!valor || parseFloat(valor) <= 0) {
      setError('O valor deve ser maior que zero.');
      return false;
    }
  
    setError(null); // Limpa erros se tudo estiver correto
    return true;
  };
  // Função para baixar o PDF
  const handleDownload = () => {
    if (pdfUrl) {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = 'etiqueta.pdf';
      a.click();
    }
  };

  // Função para imprimir o PDF
  const handlePrint = () => {
    if (pdfUrl) {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = pdfUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
      };
    }
  };

  // Criar pedido e gerar etiqueta
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const codigo = `TR${Date.now()}`;

      // Montar endereço completo
      const enderecoCompleto = endereco
        ? `${endereco.logradouro}, ${formData.numero}${formData.complemento ? `, ${formData.complemento}` : ''}, ${endereco.bairro}, ${endereco.localidade} - ${endereco.uf}`
        : '';

      // Criar pedido
      const pedidoResponse = await fetch('http://localhost:5000/api/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          codigo,
          remetente: lojas.find((loja) => loja.id === parseInt(formData.lojaId))?.nome,
          destinatario: formData.destinatario,
          endereco_completo: enderecoCompleto,
          peso: formData.peso,
          dimensoes: formData.dimensoes,
          valor: parseFloat(formData.valor),
          origem: formData.lojaId,
        }),
      });

      if (!pedidoResponse.ok) {
        const errorData = await pedidoResponse.json();
        throw new Error(errorData.error || 'Erro ao criar pedido');
      }

      const { id: pedidoId } = await pedidoResponse.json();

      // Gerar etiqueta
      const etiquetaResponse = await fetch('http://localhost:5000/api/etiquetas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pedido_id: pedidoId }),
      });

      if (!etiquetaResponse.ok) {
        const errorData = await etiquetaResponse.json();
        throw new Error(errorData.error || 'Erro ao gerar etiqueta');
      }

      const { pdf: pdfBase64 } = await etiquetaResponse.json();
      const pdfBlob = await (await fetch(`data:application/pdf;base64,${pdfBase64}`)).blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);
      setPdfUrl(pdfUrl);
      setShowModal(true);
    } catch (err) {
      console.error('Erro ao processar pedido:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthGuard>
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
              <h1 className="text-xl font-bold">Novo Pedido</h1>
            </div>
            <div className="flex items-center space-x-4">
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-8 rounded-xl shadow-lg border border-gray-100"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Criar Novo Pedido</h2>
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-50 border-l-4 border-red-500 p-4 mb-6"
              >
                <p className="text-sm text-red-700">{error}</p>
              </motion.div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="lojaId" className="block text-sm font-medium text-gray-700">
                  Loja de Origem
                </label>
                <select
                  id="lojaId"
                  name="lojaId"
                  value={formData.lojaId}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black transition-all"
                  required
                >
                  <option value="">Selecione uma loja</option>
                  {lojas.map((loja) => (
                    <option key={loja.id} value={loja.id}>
                      {loja.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="cep" className="block text-sm font-medium text-gray-700">
                  CEP
                </label>
                <input
                  type="text"
                  id="cep"
                  name="cep"
                  value={formData.cep}
                  onChange={(e) => handleCepChange(e.target.value.replace(/\D/g, ''))}
                  className="mt-1 block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black placeholder-gray-500 transition-all outline-none"
                  maxLength={8}
                  required
                />
                {isCepLoading && (
                  <p className="text-sm text-gray-500 mt-1">Buscando endereço...</p>
                )}
                {endereco && (
                  <p className="text-sm text-gray-600 mt-1">
                    {endereco.logradouro}, {endereco.bairro}, {endereco.localidade} - {endereco.uf}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="numero" className="block text-sm font-medium text-gray-700">
                  Número
                </label>
                <input
                  type="text"
                  id="numero"
                  name="numero"
                  value={formData.numero}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black placeholder-gray-500 transition-all outline-none"
                  required
                />
              </div>
              <div>
                <label htmlFor="complemento" className="block text-sm font-medium text-gray-700">
                  Complemento (opcional)
                </label>
                <input
                  type="text"
                  id="complemento"
                  name="complemento"
                  value={formData.complemento}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black placeholder-gray-500 transition-all outline-none"
                />
              </div>
              <div>
                <label htmlFor="destinatario" className="block text-sm font-medium text-gray-700">
                  Destinatário
                </label>
                <input
                  type="text"
                  id="destinatario"
                  name="destinatario"
                  value={formData.destinatario}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black placeholder-gray-500 transition-all outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="peso" className="block text-sm font-medium text-gray-700">
                    Peso (kg)
                  </label>
                  <select
                    id="peso"
                    name="peso"
                    value={formData.peso}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black transition-all"
                    required
                  >
                    <option value="">Selecione o peso</option>
                    <option value="0.5">0.5 kg</option>
                    <option value="1">1 kg</option>
                    <option value="2">2 kg</option>
                    <option value="5">5 kg</option>
                    <option value="10">10 kg</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="dimensoes" className="block text-sm font-medium text-gray-700">
                    Dimensões (cm)
                  </label>
                  <select
                    id="dimensoes"
                    name="dimensoes"
                    value={formData.dimensoes}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black transition-all"
                    required
                  >
                    <option value="">Selecione as dimensões</option>
                    <option value="20x10x5">20x10x5 cm</option>
                    <option value="30x20x10">30x20x10 cm</option>
                    <option value="40x30x15">40x30x15 cm</option>
                    <option value="50x40x20">50x40x20 cm</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="valor" className="block text-sm font-medium text-gray-700">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    id="valor"
                    name="valor"
                    value={formData.valor}
                    onChange={handleInputChange}
                    step="0.01"
                    className="mt-1 block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black placeholder-gray-500 transition-all outline-none"
                    required
                  />
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <button
                  type="submit"
                  disabled={isLoading || !formData.cep || !endereco}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all ${
                    isLoading || !formData.cep || !endereco ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Criando...
                    </div>
                  ) : (
                    'Criar Pedido e Gerar Etiqueta'
                  )}
                </button>
              </motion.div>
            </form>
          </motion.div>
        </main>

        {/* Modal para exibir o PDF */}
        {showModal && (
          <div className="fixed inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Etiqueta de Envio</h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    router.push('/dashboard');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX size={24} />
                </button>
              </div>
              <div className="mb-4">
                <iframe
                  src={pdfUrl || ''}
                  className="w-full h-96 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                >
                  <FiDownload /> Baixar
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                >
                  <FiPrinter /> Imprimir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </AuthGuard>
  );
}