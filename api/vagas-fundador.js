const { createClient } = require('@supabase/supabase-js');

const LIMITE_FUNDADORES = 20;

const supabase = createClient(
  'https://jfcytkngeoizyshevqbd.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

async function contarVagasFundador() {
  const { count, error } = await supabase
    .from('assinaturas')
    .select('id', { count: 'exact', head: true })
    .eq('plano', 'fundador');
  if (error) throw error;
  return Math.max(0, LIMITE_FUNDADORES - (count || 0));
}

module.exports = async (req, res) => {
  try {
    const vagas = await contarVagasFundador();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ vagas });
  } catch (err) {
    console.error('Erro ao contar vagas:', err);
    return res.status(500).json({ error: 'Erro ao contar vagas' });
  }
};

module.exports.contarVagasFundador = contarVagasFundador;
