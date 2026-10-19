const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { EJSON } = require('bson');
require('dotenv').config();

const Quest = require('./models/Quest');
const QuestConversation = require('./models/QuestConversation');
const ChatMessage = require('./models/ChatMessage');

const DESCRIPTION = '[UJI PIN DEKAT] Bantu pindahkan satu kursi di teras';

async function main() {
    if (process.env.CONFIRM_CLEAR_NEARBY_PIN_NEGOTIATIONS !== 'YES') {
        throw new Error('Dibatalkan: konfirmasi pembersihan quest uji PIN belum diberikan.');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    if (mongoose.connection.name !== 'jasa_lepas_db') throw new Error('Database target tidak sesuai.');

    const quest = await Quest.findOne({ deskripsi: DESCRIPTION, status: 'OPEN' }).lean();
    if (!quest) throw new Error('Quest uji PIN OPEN tidak ditemukan.');
    const conversations = await QuestConversation.find({ quest_id: quest._id }).lean();
    const conversationIds = conversations.map((item) => item._id);
    const messages = conversationIds.length ? await ChatMessage.find({ conversation_id: { $in: conversationIds } }).lean() : [];

    const backupDir = path.join(__dirname, 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, `nearby_pin_negotiations_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(backupFile, EJSON.stringify({ quest, conversations, messages }, { relaxed: false }, 2), 'utf8');

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            await ChatMessage.deleteMany({ quest_id: quest._id }, { session });
            await QuestConversation.deleteMany({ quest_id: quest._id }, { session });
            await Quest.updateOne(
                { _id: quest._id, status: 'OPEN', pekerja_id: null },
                { $set: { negotiation_status: 'NOT_STARTED', agreed_upah: null, agreed_duration: null } },
                { session }
            );
        });
    } finally {
        await session.endSession();
    }

    console.log(JSON.stringify({
        success: true,
        backupFile,
        clearedConversations: conversations.length,
        clearedMessages: messages.length,
        quest: await Quest.findById(quest._id).select('deskripsi status pekerja_id negotiation_status').lean()
    }, null, 2));
}

main().catch((error) => {
    console.error(JSON.stringify({ success: false, message: error.message }));
    process.exitCode = 1;
}).finally(() => mongoose.disconnect());
