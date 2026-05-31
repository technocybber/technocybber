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

        const body = {
            transaction_amount: Number(formData.transaction_amount || formData.valor),
            description: formData.produto || 'Produto Technocybber',
            payment_method_id: formData.payment_method_id,
            payer: {
                email: formData.payer?.email || formData.email,
                entity_type: 'individual',
                identification: formData.payer?.identification || undefined
            },
            ...(formData.token && { token: formData.token }),
            ...(formData.installments && { installments: Number(formData.installments) }),
            ...(formData.issuer_id && { issuer_id: formData.issuer_id }),
        };

        console.log("Body enviado ao MP:", JSON.stringify(body));

        const response = await payment.create({ body });

        console.log("Resposta MP:", response.status);

        const statusTexto = response.status === 'approved' ? 'APROVADO ✅' : 'AGUARDANDO PAGAMENTO ⏳';

        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASS }
            });

            // E-mail para o CLIENTE
            await transporter.sendMail({
                from: `"TECHNOCYBBER" <${process.env.GMAIL_USER}>`,
                to: body.payer.email,
                subject: `Ordem Technocybber: ${statusTexto}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 30px; border-radius: 10px;">
                        <h1 style="color: #00f2ff; font-size: 1.2rem; letter-spacing: 3px;">TECHNOCYBBER</h1>
                        <hr style="border-color: #00f2ff33; margin: 20px 0;">
                        <h2 style="font-size: 1rem;">Status do seu pedido</h2>
                        <p><b>Produto:</b> ${formData.produto}</p>
                        <p><b>Valor:</b> R$ ${body.transaction_amount}</p>
                        <p><b>Status:</b> ${statusTexto}</p>
                        <hr style="border-color: #333; margin: 20px 0;">
                        <p style="font-size: 0.8rem; color: #777;">Em caso de dúvidas, entre em contato via WhatsApp.</p>
                    </div>
                `
            });

            // E-mail para VOCÊ (notificação de venda)
            await transporter.sendMail({
                from: `"TECHNOCYBBER" <${process.env.GMAIL_USER}>`,
                to: process.env.GMAIL_USER,
                subject: `🛒 Nova venda: ${formData.produto} - R$ ${body.transaction_amount}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 30px; border-radius: 10px;">
                        <h1 style="color: #00f2ff; font-size: 1.2rem; letter-spacing: 3px;">NOVA VENDA 🛒</h1>
                        <hr style="border-color: #00f2ff33; margin: 20px 0;">
                        <p><b>Produto:</b> ${formData.produto}</p>
                        <p><b>Valor:</b> R$ ${body.transaction_amount}</p>
                        <p><b>Cliente:</b> ${body.payer.email}</p>
                        <p><b>Status:</b> ${statusTexto}</p>
                        <p><b>ID do pagamento:</b> ${response.id}</p>
                    </div>
                `
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
