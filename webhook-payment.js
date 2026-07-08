const { MercadoPagoConfig, Payment } = require('mercadopago');
const { createClient } = require('@supabase/supabase-js');

const mp = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

const supabase = createClient(
  'https://jfcytkngeoizyshevqbd.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { type, data } = req.body || {};

    if (type !== 'payment') return res.status(200).json({ ok: true });

    const paymentId = data?.id;
    if (!paymentId) return res.status(200).json({ ok: true });

    // Busca detalhes do pagamento no Mercado Pago
    const payment = new Payment(mp);
    const paymentData = await payment.get({ id: paymentId });

    if (paymentData.status !== 'approved') {
      return res.status(200).json({ ok: true, status: paymentData.status });
    }

    // external_reference = "userId|plano"
    const ref = paymentData.external_reference || '';
    const [userId, plano] = ref.split('|');

    if (!userId || !plano) return res.status(200).json({ ok: true });

    // Define vencimento baseado no plano
    const agora = new Date();
    let vencimento = null;
    let novoStatus = 'ativo';
    let novoPlano = plano;

    if (plano === 'fundador') {
      vencimento = new Date(agora.getFullYear() + 1, agora.getMonth(), agora.getDate());
      novoStatus = 'fundador';
      novoPlano = 'fundador';
    } else if (plano === 'recorrente') {
      vencimento = new Date(agora.getFullYear(), agora.getMonth() + 1, agora.getDate());
      novoStatus = 'ativo';
      novoPlano = 'recorrente';
    }

    // Atualiza assinatura no Supabase
    await supabase
      .from('assinaturas')
      .update({
        status: novoStatus,
        plano: novoPlano,
        vencimento: vencimento ? vencimento.toISOString() : null,
      })
      .eq('user_id', userId);

    return res.status(200).json({ ok: true, plano: novoPlano, userId });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(200).json({ ok: true });
  }
};
