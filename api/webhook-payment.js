const { MercadoPagoConfig, Payment } = require('mercadopago');
const { createClient } = require('@supabase/supabase-js');

const mp = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

const supabase = createClient(
  'https://jfcytkngeoizyshevqbd.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

async function enviarEmailNotificacao(plano, valor, emailCliente, userId) {
  try {
    const nomePlano = plano === 'fundador' ? 'Plano Fundador' : 'Plano Mensal';

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'D3Arte Filamentos <onboarding@resend.dev>',
        to: 'jorgge_duarte@hotmail.com',
        subject: `💰 Nova venda: ${nomePlano} - R$ ${valor}`,
        html: `
          <h2>Novo pagamento aprovado!</h2>
          <p><strong>Plano:</strong> ${nomePlano}</p>
          <p><strong>Valor:</strong> R$ ${valor}</p>
          <p><strong>Cliente:</strong> ${emailCliente}</p>
          <p><strong>User ID:</strong> ${userId}</p>
          <p>O acesso já foi liberado automaticamente no sistema.</p>
        `,
      }),
    });
  } catch (emailErr) {
    console.error('Erro ao enviar e-mail de notificação:', emailErr);
  }
}

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

    // Envia e-mail avisando o Jorge da nova venda
    await enviarEmailNotificacao(
      novoPlano,
      paymentData.transaction_amount,
      paymentData.payer?.email || 'não informado',
      userId
    );

    return res.status(200).json({ ok: true, plano: novoPlano, userId });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(200).json({ ok: true });
  }
};
