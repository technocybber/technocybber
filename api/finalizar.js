const { MercadoPagoConfig, Payment } = require('mercadopago');
const nodemailer = require('nodemailer');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Erro');

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const payment = new Payment(client);

    try {
        const response = await payment.create({ body: req.body });

        // SISTEMA DE E-MAIL ROBUSTO
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASS
            }
        });

        const statusLabel = response.status === 'approved' ? 'APROVADO ✅' : 'AGUARDANDO PAGAMENTO ⏳';

        const mailOptions = {
            from: `"TECHNOCYBBER" <${process.env.GMAIL_USER}>`,
            to: req.body.payer.email,
            subject: `Status da Compra: ${statusLabel}`,
            html: `
                <div style="background:#000; color:#fff; padding:20px; border:2px solid #00f2ff; font-family:sans-serif;">
                    <h1 style="color:#00f2ff">TECHNOCYBBER</h1>
                    <p>Sua ordem foi processada!</p>
                    <p><strong>Status:</strong> ${statusLabel}</p>
                    <p><strong>Valor:</strong> R$ ${req.body.transaction_amount}</p>
                    <hr style="border:0.5px solid #333">
                    <p>Se foi PIX, finalize o pagamento no app do banco para liberar o pedido.</p>
                </div>`
        };

        // Tenta enviar o e-mail mas não trava se der erro
        try {
            await transporter.sendMail(mailOptions);
            console.log("E-mail enviado com sucesso!");
        } catch (err) {
            console.error("Erro no Gmail:", err);
        }

        return res.status(200).json({ status: response.status });

    } catch (error) {
        console.error("Erro no Mercado Pago:", error);
        return res.status(500).json({ error: error });
    }
}
