const Quest = require('../models/Quest');
const User = require('../models/User');
const ChatMessage = require('../models/ChatMessage');
const QuestConversation = require('../models/QuestConversation');
const mongoose = require('mongoose');

const idOf = (value) => String(value?._id || value || '');

function isParticipant(quest, userId) {
    return [quest.pembuat_id, quest.pekerja_id].filter(Boolean).map(idOf).includes(String(userId));
}

async function getQuestForUser(questId, userId) {
    const quest = await Quest.findById(questId)
        .populate('pembuat_id', 'nama_lengkap email no_whatsapp')
        .populate('pekerja_id', 'nama_lengkap email no_whatsapp');
    return quest && isParticipant(quest, userId) ? quest : null;
}

exports.getPayment = async (req, res) => {
    try {
        const quest = await getQuestForUser(req.params.questId, req.user.id);
        if (!quest) return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
        return res.json({ success: true, data: quest });
    } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};

exports.createSandboxPayment = async (req, res) => {
    try {
        const quest = await getQuestForUser(req.params.questId, req.user.id);
        if (!quest) return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
        if (idOf(quest.pembuat_id) !== String(req.user.id)) return res.status(403).json({ success: false, message: 'Hanya Klien yang dapat melakukan pembayaran.' });
        if (quest.negotiation_status !== 'AGREED') return res.status(400).json({ success: false, message: 'Selesaikan kesepakatan upah terlebih dahulu.' });
        if (quest.status !== 'AWAITING_PAYMENT') return res.status(400).json({ success: false, message: 'Pembayaran dibuka setelah Pekerja menyelesaikan pekerjaan dan memasukkan PIN.' });
        
        const method = String(req.body.method || '').toUpperCase();
        if (!['COD', 'QRIS', 'VA', 'EWALLET'].includes(method)) {
            return res.status(400).json({ success: false, message: 'Metode pembayaran tidak valid. Pilih COD (Tunai) atau QRIS.' });
        }

        quest.payment_status = 'PENDING';
        quest.payment_method = method;
        quest.payment_reference = method === 'COD'
            ? `P2P-COD-${Date.now().toString().slice(-6)}`
            : method === 'QRIS'
                ? `P2P-QRIS-${Date.now().toString().slice(-6)}`
                : `P2P-${method}-${Date.now().toString().slice(-6)}`;
        quest.payment_updated_at = new Date();
        await quest.save();

        const populated = await Quest.findById(quest._id)
            .populate('pembuat_id', 'nama_lengkap email no_whatsapp')
            .populate('pekerja_id', 'nama_lengkap email no_whatsapp');

        return res.status(201).json({ success: true, data: populated });
    } catch (error) { return res.status(500).json({ success: false, message: error.message }); }
};

exports.simulateOutcome = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        const quest = await getQuestForUser(req.params.questId, req.user.id);
        if (!quest) return res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan.' });
        if (idOf(quest.pembuat_id) !== String(req.user.id)) return res.status(403).json({ success: false, message: 'Hanya Klien yang dapat mengonfirmasi pembayaran.' });
        
        const outcome = String(req.body.outcome || '').toUpperCase();
        if (!['PAID', 'PENDING', 'FAILED'].includes(outcome)) return res.status(400).json({ success: false, message: 'Status pembayaran tidak valid.' });
        
        if (quest.status !== 'AWAITING_PAYMENT') {
            if (quest.status === 'COMPLETED' && quest.payment_status === 'PAID') return res.json({ success: true, data: quest });
            return res.status(400).json({ success: false, message: 'Pekerjaan belum diverifikasi dengan PIN.' });
        }

        let updatedQuest;
        await session.withTransaction(async () => {
            const current = await Quest.findById(quest._id).session(session);
            if (outcome !== 'PAID') {
                current.payment_status = outcome;
                current.payment_updated_at = new Date();
                current.paid_at = null;
                await current.save({ session });
                updatedQuest = current;
                return;
            }
            if (current.payment_status !== 'PENDING') {
                const validationError = new Error('Buat transaksi pembayaran terlebih dahulu sebelum melakukan konfirmasi.');
                validationError.status = 400;
                throw validationError;
            }

            const now = new Date();
            const chatDeleteAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            current.payment_status = 'PAID';
            current.payment_updated_at = now;
            current.paid_at = now;
            current.status = 'COMPLETED';
            current.completed_at = now;
            current.credited_at = now;
            current.chat_status = 'RETENTION';
            current.chat_delete_at = chatDeleteAt;
            await current.save({ session });

            const totalPendapatan = (current.agreed_upah || current.upah_jasa) + (current.nominal_talangan || 0);
            await User.findByIdAndUpdate(current.pekerja_id, { $inc: { saldo: totalPendapatan } }, { session });
            
            const methodLabel = current.payment_method === 'COD' 
                ? 'Tunai (COD Langsung P2P)' 
                : current.payment_method === 'QRIS'
                    ? 'QRIS Dinamis P2P'
                    : current.payment_method;

            const conversation = await QuestConversation.findOne({ quest_id: current._id, status: 'SELECTED' }).session(session);
            if (conversation) {
                await ChatMessage.create([{
                    conversation_id: conversation._id,
                    quest_id: current._id,
                    type: 'SYSTEM',
                    text: `Pembayaran ${current.payment_reference} (${methodLabel}) telah dikonfirmasi lunas. Upah Rp ${totalPendapatan.toLocaleString('id-ID')} telah dicatat ke saldo Pekerja dan transaksi resmi selesai.`,
                    read_by: [idOf(current.pembuat_id), idOf(current.pekerja_id)],
                    delete_at: chatDeleteAt
                }], { session });
            }
            await ChatMessage.updateMany({ quest_id: current._id }, { $set: { delete_at: chatDeleteAt } }, { session });
            updatedQuest = current;
        });

        const populatedFinal = await Quest.findById(updatedQuest._id)
            .populate('pembuat_id', 'nama_lengkap email no_whatsapp')
            .populate('pekerja_id', 'nama_lengkap email no_whatsapp');

        return res.json({ success: true, data: populatedFinal });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    } finally {
        await session.endSession();
    }
};
