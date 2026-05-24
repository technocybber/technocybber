const { MercadoPagoConfig, Payment } = require('mercadopago');
const nodemailer = require('nodemailer');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Método não permitido');

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const payment = new Payment(client);

    try {
        // Pega o e-mail que o cliente digitou no seu formulário
        const emailDoCliente = req.body.payer.email;
        const valorDaCompra = req.body.transaction_amount;

        const response = await payment.create({ body: req.body });

        // Envia o e-mail se o pagamento for aprovado (Cartão/Pix na hora)
        // ou se estiver pendente (Pix aguardando/Boleto) para o cliente ter o comprovante
        if (response.status === 'approved' || response.status === 'pending') {
            
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_APP_PASS
                }
            });

            // Configuração da mensagem
            const mailOptions = {
                from: `"TECHNOCYBBER" <${process.env.GMAIL_USER}>`,
                to: emailDoCliente, // O e-mail que capturamos acima
                subject: 'Sua Ordem na TECHNOCYBBER 🚀',
                html: `
                    <div style="font-family: sans-serif; color: #333;">
                        <h1 style="color: #00f2ff; background: #000; padding: 10px;">TECHNOCYBBER</h1>
                        <p>Olá! Recebemos sua solicitação de compra.</p>
                        <p><strong>Valor:</strong> R$ ${valorDaCompra}</p>
                        <p><strong>Status do Pagamento:</strong> ${response.status === 'approved' ? 'APROVADO ✅' : 'AGUARDANDO PAGAMENTO ⏳'}</p>
                        <hr>
                        <p>Nossa equipe técnica já foi notificada. Em breve você receberá novas atualizações.</p>
                        <p>Obrigado por escolher a Elite Hardware Store.</p>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);
        }

        return res.status(200).json({ 
            status: response.status,
            detail: response.status_detail 
        });

    } catch (error) {
        console.error("ERRO NO BACKEND:", error);
        return res.status(500).json({ error: "Erro ao processar e-mail ou pagamento" });
    }
}
