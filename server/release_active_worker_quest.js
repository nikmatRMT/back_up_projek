const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { EJSON } = require('bson');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Quest = require('./models/Quest');
const ChatMessage = require('./models/ChatMessage');
const QuestConversation = require('./models/QuestConversation');

async function main() {
    if (process.env.CONFIRM_RELEASE_ACTIVE_QUEST !== 'YES') {
        throw new Error('Dibatalkan: konfirmasi pelepasan quest belum diberikan.');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    if (mongoose.connection.name !== 'jasa_lepas_db') throw new Error('Database target tidak sesuai.');

    const active = await Quest.find({ status: { $in: ['TAKEN', 'IN_PROGRESS'] }, pekerja_id: { $ne: null } }).lean();
    if (active.length !== 1) throw new Error(`Dibatalkan: diharapkan tepat 1 quest aktif, ditemukan ${active.length}.`);
    const quest = active[0];
    const conversations = await QuestConversation.find({ quest_id: quest._id }).lean();
    const messages = await ChatMessage.find({ quest_id: quest._id }).lean();

    const backupDir = path.join(__dirname, 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, `quest_before_worker_release_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(backupFile, EJSON.stringify({ quest, conversations, messages }, { relaxed: false }, 2), 'utf8');

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            await ChatMessage.deleteMany({ quest_id: quest._id }, { session });
            await QuestConversation.deleteMany({ quest_id: quest._id }, { session });
            await Quest.updateOne(
                { _id: quest._id, status: quest.status, pekerja_id: quest.pekerja_id },
                {
                    $set: {
                        status: 'OPEN',
                        pekerja_id: null,
                        taken_at: null,
                        arrived_at: null,
                        pekerja_lokasi: { longitude: null, latitude: null },
                        negotiation_status: 'NOT_STARTED',
                        agreed_upah: null,
                        agreed_duration: null,
                        payment_status: 'UNPAID',
                        payment_method: null,
                        payment_reference: null,
                        payment_updated_at: null,
                        paid_at: null,
                        chat_status: 'ACTIVE',
                        chat_delete_at: null
                    }
                },
                { session }
            );
        });
    } finally {
        await session.endSession();
    }

    const updated = await Quest.findById(quest._id).select('deskripsi status pekerja_id negotiation_status payment_status').lean();
    const remainingActive = await Quest.countDocuments({ status: { $in: ['TAKEN', 'IN_PROGRESS'] }, pekerja_id: { $ne: null } });
    const remainingConversationCount = await QuestConversation.countDocuments({ quest_id: quest._id });
    const remainingMessageCount = await ChatMessage.countDocuments({ quest_id: quest._id });
    console.log(JSON.stringify({ success: true, backupFile, backedUpConversations: conversations.length, backedUpMessages: messages.length, updated, remainingActive, remainingConversationCount, remainingMessageCount }, null, 2));
    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error(JSON.stringify({ success: false, message: error.message }));
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
});
