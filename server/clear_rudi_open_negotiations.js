const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { EJSON } = require('bson');
require('dotenv').config();

const User = require('./models/User');
const Quest = require('./models/Quest');
const QuestConversation = require('./models/QuestConversation');
const ChatMessage = require('./models/ChatMessage');

async function main() {
    if (process.env.CONFIRM_CLEAR_RUDI_NEGOTIATIONS !== 'YES') {
        throw new Error('Dibatalkan: konfirmasi pembersihan negosiasi Rudi belum diberikan.');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    if (mongoose.connection.name !== 'jasa_lepas_db') throw new Error('Database target tidak sesuai.');

    const worker = await User.findOne({ nama_lengkap: 'Rudi' });
    if (!worker) throw new Error('Akun Rudi tidak ditemukan.');

    const openQuests = await Quest.find({ status: 'OPEN' }).select('_id deskripsi').lean();
    const openQuestIds = openQuests.map((item) => item._id);
    const conversations = await QuestConversation.find({
        worker_id: worker._id,
        quest_id: { $in: openQuestIds },
        status: 'NEGOTIATING'
    }).lean();
    const conversationIds = conversations.map((item) => item._id);
    const messages = conversationIds.length
        ? await ChatMessage.find({ conversation_id: { $in: conversationIds } }).lean()
        : [];

    const backupDir = path.join(__dirname, 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, `rudi_open_negotiations_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(backupFile, EJSON.stringify({ worker: worker.toObject(), conversations, messages }, { relaxed: false }, 2), 'utf8');

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            if (conversationIds.length) {
                await ChatMessage.deleteMany({ conversation_id: { $in: conversationIds } }, { session });
                await QuestConversation.deleteMany({ _id: { $in: conversationIds } }, { session });
            }
            for (const conversation of conversations) {
                const remaining = await QuestConversation.countDocuments({ quest_id: conversation.quest_id }).session(session);
                if (remaining === 0) {
                    await Quest.updateOne(
                        { _id: conversation.quest_id, status: 'OPEN', pekerja_id: null },
                        { $set: { negotiation_status: 'NOT_STARTED', agreed_upah: null, agreed_duration: null } },
                        { session }
                    );
                }
            }
        });
    } finally {
        await session.endSession();
    }

    console.log(JSON.stringify({
        success: true,
        backupFile,
        clearedConversations: conversations.length,
        clearedMessages: messages.length,
        clearedQuests: conversations.map((conversation) => openQuests.find((quest) => String(quest._id) === String(conversation.quest_id))?.deskripsi),
        remainingOpenNegotiations: await QuestConversation.countDocuments({ worker_id: worker._id, status: 'NEGOTIATING' })
    }, null, 2));
}

main().catch((error) => {
    console.error(JSON.stringify({ success: false, message: error.message }));
    process.exitCode = 1;
}).finally(() => mongoose.disconnect());
