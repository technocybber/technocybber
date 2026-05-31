const { MercadoPagoConfig, Payment } = require('mercadopago');
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    try {
        const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
        const payment = new Payment(client);

        const formData = req.body;

        // Monta o body corretamente para o Mercado Pago
        const body = {
            transaction_amount: Number(formData.transaction_amount || formData.valor),
            description: formData.produto || 'Produto Technocybber',
            payment_method_id: formData.payment_method_id,
            payer: {
                email: formData.payer?.email || formData.email,
                entity_type: 'individual',
                identification: formData.payer?.identification || undefined
            },
            // Campos específicos por tipo de pagamento
            ...(formData.token && { token: formData.token }),
            ...(formData.installments && { installments: Number(formData.installments) }),
            ...(formData.issuer_id && { issuer_id: formData.issuer_id }),
        };

        console.log("Body enviado ao MP:", JSON.stringify(body));

        const response = await payment.create({ body });

        console.log("Resposta MP:", response.status);

        // Tenta enviar e-mail
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASS }
            });
            const statusTexto = response.status === 'approved' ? 'APROVADO ✅' : 'AGUARDANDO ⏳';
            await transporter.sendMail({
                from: `"TECHNOCYBBER" <${process.env.GMAIL_USER}>`,
                to: body.payer.email,
                subject: `Ordem Technocybber: ${statusTexto}`,
                html: `<h1>Status da sua Ordem</h1><p>Pagamento de <b>R$ ${body.transaction_amount}</b>: <b>${statusTexto}</b></p>`
            });
        } catch (emailError) {
            console.error("Erro no e-mail:", emailError.message);
        }

        return res.status(200).json({ status: response.status, id: response.id });

    } catch (error) {
        console.error("Erro no Mercado Pago:", error.message, JSON.stringify(error.cause));
        return res.status(400).json({
            status: 'error',
            message: error.message,
            cause: error.cause
        });
    }
};
