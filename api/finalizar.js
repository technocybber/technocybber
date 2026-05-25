const { MercadoPagoConfig, Payment } = require('mercadopago');
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
    // Garante que o site consiga falar com este arquivo
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        // 1. Configura o Mercado Pago
        const client = new MercadoPagoConfig({ 
            accessToken: process.env.MP_ACCESS_TOKEN 
        });
        const payment = new Payment(client);

        // 2. Cria o pagamento
        const response = await payment.create({ body: req.body });

        // 3. Tenta enviar o e-mail (mas não trava se o e-mail falhar)
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_APP_PASS
                }
            });

            const statusTexto = response.status === 'approved' ? 'APROVADO ✅' : 'AGUARDANDO PAGAMENTO ⏳';

            await transporter.sendMail({
                from: `"TECHNOCYBBER" <${process.env.GMAIL_USER}>`,
                to: req.body.payer.email,
                subject: `Ordem Technocybber: ${statusTexto}`,
                html: `<h1>Status da sua Ordem</h1><p>O seu pagamento de R$ ${req.body.transaction_amount} está: <b>${statusTexto}</b></p>`
            });
        } catch (emailError) {
            console.error("Erro no envio do e-mail:", emailError);
        }

        // 4. Responde ao site com o status real
        return res.status(200).json({ status: response.status });

    } catch (error) {
        console.error("Erro no Mercado Pago:", error);
        return res.status(400).json({ 
            status: 'error',
            message: error.message 
        });
    }
};
