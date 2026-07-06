const { MercadoPagoConfig, Preference } = require('mercadopago');

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { plano, email, userId } = req.body;

    const itens = {
      fundador: {
        title: 'D3Arte Filamentos — Plano Fundador',
        quantity: 1,
        unit_price: 49.90,
        currency_id: 'BRL',
      },
      recorrente: {
        title: 'D3Arte Filamentos — Plano Mensal',
        quantity: 1,
        unit_price: 9.90,
        currency_id: 'BRL',
      },
    };

    const item = itens[plano];
    if (!item) return res.status(400).json({ error: 'Plano inválido' });

    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [item],
        payer: { email },
        external_reference: `${userId}|${plano}`,
        back_urls: {
          success: `https://d3arte-filamentos.vercel.app?pagamento=sucesso&plano=${plano}&user=${userId}`,
          failure: `https://d3arte-filamentos.vercel.app?pagamento=falha`,
          pending: `https://d3arte-filamentos.vercel.app?pagamento=pendente`,
        },
        auto_return: 'approved',
        notification_url: 'https://d3arte-filamentos.vercel.app/api/webhook-payment',
      },
    });

    res.status(200).json({ init_point: result.init_point });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
