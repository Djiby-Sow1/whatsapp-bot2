const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('QR reçu, scanne avec ton WhatsApp :');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Bot WhatsApp prêt sur Render.');
});

client.on('message', async msg => {
    const chat = await msg.getChat();

    // Suppression automatique des liens
    if (chat.isGroup && msg.body && msg.body.match(/https?:\/\/|wa\.me|t\.me|chat\.whatsapp\.com/gi)) {
        const contact = await msg.getContact();
        if (chat.participants.some(p => p.id._serialized === client.info.wid._serialized && p.isAdmin)) {
            try {
                await msg.delete(true);
                await chat.sendMessage(`❌ @${contact.number}\nLes liens sont interdits dans le groupe.`, {
                    mentions: [contact]
                });
            } catch (err) {
                console.log("Erreur suppression lien :", err.message);
            }
        } else {
            console.log("⚠️ Le bot n’est pas admin, impossible de supprimer le message.");
        }
        return;
    }

    // Commande .alltag
    if (msg.body === '.alltag' && chat.isGroup) {
        let text = '';
        let mentions = [];

        for (let participant of chat.participants) {
            const contact = await client.getContactById(participant.id._serialized);
            mentions.push(contact);
            text += `@${contact.number}\n`;
        }

        chat.sendMessage(`📢 Mention spéciale :\n${text}`, { mentions });
    }

    // Commande .vv - renvoyer vidéo en vue unique
    if (msg.body === '.vv') {
        const quotedMsg = await msg.getQuotedMessage();
        if (!quotedMsg) {
            return msg.reply("⚠️ Réponds à une vidéo avec la commande .vv pour renvoyer en vue unique.");
        }
        if (!quotedMsg.hasMedia || quotedMsg.type !== 'video') {
            return msg.reply("⚠️ Le message cité doit contenir une vidéo.");
        }

        const media = await quotedMsg.downloadMedia();
        await chat.sendMessage(media, { sendMediaAsViewOnce: true });
    }

    // Commande .règles
    if (msg.body === '.règles') {
        msg.reply('📜 Règles du groupe :\n1. Respect\n2. Pas de spam\n3. Amusez-vous !');
    }
});

client.on('group_join', async (notification) => {
    const chat = await notification.getChat();
    const contact = await notification.getContact();
    chat.sendMessage(`👋 Bienvenue @${contact.number} dans *${chat.name}* !`, {
        mentions: [contact]
    });
});

client.initialize();
