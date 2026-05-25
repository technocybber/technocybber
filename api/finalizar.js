const { MercadoPagoConfig, Payment } = require('mercadopago');
const nodemailer = require('nodemailer');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Erro');

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const payment = new Payment(client);

    try {
        // 1. Processa o pagamento
        const response = await payment.create({ body: req.body });

        // 2. Sistema de e-mail (só dispara se o pagamento não falhar totalmente)
        if (response.status && response.status !== 'rejected') {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_APP_PASS
                }
            });

            const statusTexto = response.status === 'approved' ? 'APROVADO' : 'AGUARDANDO PAGAMENTO';

            await transporter.sendMail({
                from: `"TECHNOCYBBER" <${process.env.GMAIL_USER}>`,
                to: req.body.payer.email,
                subject: `Ordem Technocybber: ${statusTexto}`,
                html: `
                    <div style="background:#000; color:#fff; padding:20px; border:2px solid #00f2ff; font-family:sans-serif;">
                        <h1 style="color:#00f2ff">TECHNOCYBBER</h1>
                        <p>Olá! Seu pedido de <b>R$ ${req.body.transaction_amount}</b> foi processado.</p>
                        <p><strong>STATUS:</strong> ${statusTexto}</p>
                        <hr style="border:0.5px solid #333">
                        <p>Nossa equipe técnica já foi notificada. Obrigado!</p>
                    </div>`
            });
        }

        return res.status(200).json({ status: response.status });

    } catch (error) {
        console.error("ERRO MP:", error);
        // Retorna o erro real do Mercado Pago para o site entender
        return res.status(400).json({ error: error });
    }
}
