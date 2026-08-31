const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { email, novaSenha } = req.body || {};

  if (!email || !novaSenha) {
    return res.status(400).json({ error: 'E-mail e nova senha são obrigatórios' });
  }
  if (novaSenha.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://jfcytkngeoizyshevqbd.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!serviceKey) {
    return res.status(500).json({ error: 'Configuração do servidor incompleta' });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    const { data: listData, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (listError) {
      return res.status(500).json({ error: 'Erro ao buscar usuário: ' + listError.message });
    }

    const usuario = listData.users.find(
      u => u.email && u.email.toLowerCase() === email.toLowerCase()
    );

    if (!usuario) {
      return res.status(200).json({ ok: true });
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(usuario.id, {
      password: novaSenha
    });

    if (updateError) {
      return res.status(500).json({ error: 'Erro ao redefinir senha: ' + updateError.message });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'Erro inesperado: ' + e.message });
  }
};
