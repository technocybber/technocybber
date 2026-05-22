const { MercadoPagoConfig, Payment } = require('mercadopago');
const nodemailer = require('nodemailer');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Método não permitido');

    // Configuração do Mercado Pago
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const payment = new Payment(client);

    try {
        const response = await payment.create({ body: req.body });

        // Se o pagamento for aprovado, envia o e-mail pelo Gmail
        if (response.status === 'approved') {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { 
                    user: process.env.GMAIL_USER, 
                    pass: process.env.GMAIL_APP_PASS 
                }
            });

            await transporter.sendMail({
                from: `"TECHNOCYBBER" <${process.env.GMAIL_USER}>`,
                to: req.body.payer.email,
                subject: 'PAGAMENTO CONFIRMADO - TECHNOCYBBER 🚀',
                html: `<h1>Obrigado!</h1><p>Seu hardware está sendo preparado.</p>`
            });
        }

        return res.status(200).json({ status: response.status });

    } catch (error) {
        console.error(error);
        return res.status(500).json(error);
    }
}
