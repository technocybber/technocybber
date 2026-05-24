const { MercadoPagoConfig, Payment } = require('mercadopago');
const nodemailer = require('nodemailer');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Método não permitido');

    // 1. Configura o Mercado Pago
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const payment = new Payment(client);

    try {
        // Captura o e-mail e o valor que vieram do seu site
        const emailDoCliente = req.body.payer.email;
        const valorPago = req.body.transaction_amount;

        // 2. Tenta processar o pagamento no Mercado Pago
        const response = await payment.create({ body: req.body });

        // 3. Se o pagamento for Aprovado ou estiver Pendente (Pix/Boleto), envia o e-mail
        if (response.status === 'approved' || response.status === 'pending') {
            
            // Configura o seu Gmail (usando as variáveis da Vercel)
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_APP_PASS
                }
            });

            // Cria o corpo do e-mail
            const corpoEmail = {
                from: `"TECHNOCYBBER" <${process.env.GMAIL_USER}>`,
                to: emailDoCliente,
                subject: 'Sua Ordem de Hardware Elite 🚀',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #00f2ff; padding: 20px; background: #000; color: #fff;">
                        <h2 style="color: #00f2ff; text-align: center;">TECHNOCYBBER</h2>
                        <p>Olá,</p>
                        <p>Recebemos sua solicitação de compra e o pagamento está sendo processado!</p>
                        <hr style="border-color: #333;">
                        <p><strong>Valor:</strong> R$ ${valorPago}</p>
                        <p><strong>Status:</strong> ${response.status === 'approved' ? '✅ APROVADO' : '⏳ AGUARDANDO PAGAMENTO'}</p>
                        <br>
                        <p>Nossa equipe técnica já foi notificada e está preparando os protocolos de envio.</p>
                        <p>Atenciosamente,<br><strong>High-End Hardware Division</strong></p>
                    </div>
                `
            };

            // Dispara o e-mail de fato
            await transporter.sendMail(corpoEmail);
        }

        // Devolve a resposta para o seu site mostrar o alerta na tela
        return res.status(200).json({ 
            status: response.status,
            id: response.id 
        });

    } catch (error) {
        console.error("ERRO NO PROCESSAMENTO:", error);
        return res.status(500).json({ error: "Erro ao enviar e-mail ou processar pagamento" });
    }
}
