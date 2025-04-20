// server/scripts/createAdmin.js
const bcrypt = require('bcryptjs');
const pool = require('../config/db');  // Caminho corrigido

async function createAdmin() {
  const nome = 'Administrador';
  const email = 'admin@transporte.com';
  const senha = 'senha123';
  const senhaHash = await bcrypt.hash(senha, 10);

  try {
    await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash, nivel_acesso) VALUES (?, ?, ?, ?)',
      [nome, email, senhaHash, 'administrador']
    );
    console.log('✅ Admin criado com sucesso!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Senha: ${senha}`);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.log('⚠️  Usuário admin já existe');
    } else {
      console.error('❌ Erro ao criar admin:', err);
    }
  } finally {
    process.exit();
  }
}

createAdmin();