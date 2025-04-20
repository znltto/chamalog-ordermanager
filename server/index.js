require('dotenv').config();
const pool = require('./config/db');
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const PDFDocument = require('pdfkit');
const qr = require('qr-image');

const app = express();

// Configuração de middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(bodyParser.json());

// Middleware de autenticação JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'seu_segredo_super_secreto', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Middleware para verificar nível de acesso
const checkAccessLevel = (requiredLevel) => {
  return (req, res, next) => {
    const userLevel = req.user.nivel_acesso;
    const levels = {
      'cliente': 1,
      'funcionario': 2,
      'admin': 3
    };

    if (levels[userLevel] < levels[requiredLevel]) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }
    next();
  };
};

// Função para registrar atividade
async function registrarAtividade(descricao, userId) {
  try {
    await pool.query(
      'INSERT INTO atividades (descricao, usuario_id) VALUES (?, ?)',
      [descricao, userId]
    );
  } catch (error) {
    console.error('Erro ao registrar atividade:', error);
  }
}

// Rota de login
app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    const [users] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = users[0];

    const senhaValida = await bcrypt.compare(senha, user.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, nivel_acesso: user.nivel_acesso },
      process.env.JWT_SECRET || 'seu_segredo_super_secreto',
      { expiresIn: '8h' }
    );

    const { senha_hash, ...userData } = user;
    res.json({ user: userData, token });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Rotas para gerenciamento de usuários (apenas admin)
app.get('/api/usuarios', authenticateToken, checkAccessLevel('admin'), async (req, res) => {
  try {
    const [usuarios] = await pool.query('SELECT * FROM usuarios');
    res.json(usuarios);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

app.post('/api/usuarios', authenticateToken, checkAccessLevel('admin'), async (req, res) => {
  try {
    const { nome, email, senha, nivel_acesso, loja_id } = req.body;
    
    // Verificar se o usuário já existe
    const [existingUsers] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email já está em uso' });
    }

    // Hash da senha
    const salt = await bcrypt.genSalt(10);
    const senha_hash = await bcrypt.hash(senha, salt);

    // Criar usuário
    const [result] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash, nivel_acesso) VALUES (?, ?, ?, ?)',
      [nome, email, senha_hash, nivel_acesso]
    );

    // Registrar atividade
    await registrarAtividade(`Novo usuário criado: ${email} (${nivel_acesso})`, req.user.id);

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

app.put('/api/usuarios/:id', authenticateToken, checkAccessLevel('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, email, nivel_acesso, loja_id } = req.body;

    // Verificar se o usuário existe
    const [existingUser] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id]);
    if (existingUser.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Atualizar usuário
    await pool.query(
      'UPDATE usuarios SET nome = ?, email = ?, nivel_acesso = ? WHERE id = ?',
      [nome, email, nivel_acesso, id]
    );

    // Registrar atividade
    await registrarAtividade(`Usuário atualizado: ${email} (${nivel_acesso})`, req.user.id);

    res.json({ message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

app.delete('/api/usuarios/:id', authenticateToken, checkAccessLevel('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o usuário existe
    const [existingUser] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id]);
    if (existingUser.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Não permitir que o usuário se exclua
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Você não pode excluir seu próprio usuário' });
    }

    // Excluir usuário
    await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);

    // Registrar atividade
    await registrarAtividade(`Usuário excluído: ${existingUser[0].email}`, req.user.id);

    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Rota para listar lojas (admin e funcionario)
app.get('/api/lojas', authenticateToken, checkAccessLevel('funcionario'), async (req, res) => {
  try {
    const [lojas] = await pool.query('SELECT id, nome FROM lojas');
    res.json(lojas);
  } catch (error) {
    console.error('Erro ao buscar lojas:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Rota para listar pedidos (todos os níveis)
app.get('/api/pedidos', authenticateToken, async (req, res) => {
  try {
    let query = 'SELECT * FROM pedidos';
    
    // Clientes só veem seus próprios pedidos
    if (req.user.nivel_acesso === 'cliente') {
      query += ' WHERE usuario_id = ?';
      const [pedidos] = await pool.query(query, [req.user.id]);
      return res.json(pedidos);
    }
    
    // Funcionários e admin veem todos os pedidos
    const [pedidos] = await pool.query(query);
    res.json(pedidos);
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Rota para criar pedidos (funcionario e admin)
app.post('/api/pedidos', authenticateToken, checkAccessLevel('funcionario'), async (req, res) => {
  try {
    const { codigo, remetente, destinatario, endereco_completo, peso, dimensoes, valor, origem } = req.body;

    const [result] = await pool.query(
      `INSERT INTO pedidos 
      (codigo, remetente, destinatario, endereco_completo, peso, dimensoes, valor, origem, usuario_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [codigo, remetente, destinatario, endereco_completo, peso, dimensoes, valor, origem, req.user.id]
    );

    await registrarAtividade(`Novo pedido criado (#${codigo})`, req.user.id);
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

app.post('/api/lojas', authenticateToken, checkAccessLevel('admin'), async (req, res) => {
  console.log('Requisição recebida para criar loja:', req.body);
  try {
    const { nome, endereco } = req.body;
    if (!nome || !endereco) {
      return res.status(400).json({ error: 'Nome e endereço são obrigatórios' });
    }
    const [result] = await pool.query(
      'INSERT INTO lojas (nome, endereco) VALUES (?, ?)',
      [nome, endereco]
    );
    await registrarAtividade(`Nova loja criada: ${nome}`, req.user.id);
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error('Erro ao criar loja:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Rota para gerar etiqueta PDF
app.post('/api/etiquetas', authenticateToken, async (req, res) => {
  try {
    const { pedido_id } = req.body;

    // Buscar dados do pedido e loja
    const [pedidos] = await pool.query(
      'SELECT p.*, l.nome as loja_nome, l.endereco as loja_endereco FROM pedidos p JOIN lojas l ON p.origem = l.id WHERE p.id = ?',
      [pedido_id]
    );
    if (pedidos.length === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const pedido = pedidos[0];
    const currentDate = new Date().toLocaleDateString('pt-BR');

    // Criar PDF
    const doc = new PDFDocument({
      size: [283, 425], // 100mm x 150mm (1mm = 2.834 pontos)
      margin: 10,
    });

    // Buffer para armazenar o PDF
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      const pdfBase64 = pdfData.toString('base64');
      res.json({ pdf: pdfBase64 });
    });

    // Estilizar a etiqueta
    doc.rect(10, 10, 263, 405).stroke('#FF6200');
    doc.image('img/logo.png', 15, 15, { width: 40 });
    doc.fillColor('#FF6200').fontSize(14).font('Helvetica-Bold').text('ChamaLog', 60, 20);
    doc.fillColor('#333333').fontSize(10).text('Entrega Rápida', 60, 35);
    doc.moveTo(15, 60).lineTo(268, 60).dash(5, { space: 5 }).stroke('#CCCCCC');
    doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold').text('Destinatário:', 15, 90);
    doc.font('Helvetica').fontSize(11).text(pedido.destinatario, 15, 105);
    doc.fontSize(10).text(pedido.endereco_completo, 15, 120, { width: 150 });

    const qrData = `https://chamalog.com/rastrear/${pedido.codigo}`;
    const qrCode = qr.imageSync(qrData, { type: 'png', size: 5 });
    doc.image(qrCode, 180, 90, { width: 80 });

    doc.fontSize(12).font('Helvetica-Bold').text('Pedido:', 15, 170);
    doc.fontSize(11).font('Helvetica').text(pedido.codigo, 15, 185);
    doc.fontSize(10).text(`Data de Emissão: ${currentDate}`, 15, 200);
    doc.moveTo(15, 260).lineTo(268, 260).dash(5, { space: 5 }).stroke('#CCCCCC');
    doc.fontSize(12).font('Helvetica-Bold').text('Remetente:', 15, 280);
    doc.fontSize(11).font('Helvetica').text(pedido.loja_nome, 15, 295);
    doc.fontSize(10).text(pedido.loja_endereco, 15, 310, { width: 150 });
    doc.moveTo(15, 390).lineTo(268, 390).dash(5, { space: 5 }).stroke('#CCCCCC');
    doc.fillColor('#FF6200').fontSize(10).text('www.chamalog.com', 15, 400, { align: 'center', width: 253 });
    doc.end();

    // Registrar atividade de geração de etiqueta
    await registrarAtividade(`Etiqueta gerada para o pedido #${pedido.codigo}`, req.user.id);
  } catch (error) {
    console.error('Erro ao gerar etiqueta:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Rota para obter estatísticas de pedidos
app.get('/api/pedido-estatisticas', authenticateToken, async (req, res) => {
  try {
    const [totalResult] = await pool.query('SELECT COUNT(*) AS total FROM pedidos');
    const totalPedidos = totalResult[0].total;

    const [transitResult] = await pool.query("SELECT COUNT(*) AS transito FROM pedidos WHERE status = 'em_transito'");
    const pedidosTransito = transitResult[0].transito;

    const [entregueResult] = await pool.query("SELECT COUNT(*) AS entregue FROM pedidos WHERE status = 'entregue'");
    const pedidosEntregues = entregueResult[0].entregue;

    res.json({
      total: totalPedidos,
      emTransito: pedidosTransito,
      entregues: pedidosEntregues,
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas de pedidos:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Rota para excluir um pedido
app.delete('/api/pedidos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica se o pedido existe
    const [pedido] = await pool.query('SELECT * FROM pedidos WHERE id = ?', [id]);
    if (pedido.length === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    // Exclui o pedido do banco de dados
    await pool.query('DELETE FROM pedidos WHERE id = ?', [id]);

    // Registrar atividade de exclusão de pedido
    await registrarAtividade(`Pedido excluído (#${pedido[0].codigo})`, req.user.id);

    res.json({ message: 'Pedido excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir pedido:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Rota para atualizar o status de um pedido
app.put('/api/pedidos/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Verifica se o status é válido
    const validStatuses = ['pendente', 'em_transito', 'entregue'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    // Atualiza o status no banco de dados
    const [result] = await pool.query(
      'UPDATE pedidos SET status = ? WHERE id = ?',
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    // Registrar atividade de atualização de status
    await registrarAtividade(`Status do pedido #${id} atualizado para '${status}'`, req.user.id);

    res.json({ message: 'Status do pedido atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Rota para buscar atividades recentes
app.get('/api/atividades-recentes', authenticateToken, async (req, res) => {
  try {
    const [atividades] = await pool.query(
      'SELECT * FROM atividades ORDER BY data_criacao DESC LIMIT 10'
    );

    // Formatar as atividades para o frontend
    const formattedAtividades = atividades.map((atividade) => ({
      id: atividade.id,
      action: atividade.descricao,
      time: formatTimeDifference(atividade.data_criacao),
    }));

    res.json(formattedAtividades);
  } catch (error) {
    console.error('Erro ao buscar atividades recentes:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// Função auxiliar para calcular "Há X horas"
function formatTimeDifference(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Agora mesmo';
  if (diffInSeconds < 3600) return `Há ${Math.floor(diffInSeconds / 60)} minutos`;
  if (diffInSeconds < 86400) return `Há ${Math.floor(diffInSeconds / 3600)} horas`;
  return `Há ${Math.floor(diffInSeconds / 86400)} dias`;
}

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo deu errado!' });
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Banco de dados: ${process.env.DB_NAME || 'transporte_express'}`);
});