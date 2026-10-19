const Quest = require('../models/Quest');
const ChatMessage = require('../models/ChatMessage');

function participantIds(quest) {
    return [quest.pembuat_id?._id || quest.pembuat_id, quest.pekerja_id?._id || quest.pekerja_id].filter(Boolean).map(String);
}

function isParticipant(quest, userId) {
    return participantIds(quest).includes(String(userId));
}

async function loadQuest(questId) {
    return Quest.findById(questId).populate('pembuat_id', 'nama_lengkap kyc_status').populate('pekerja_id', 'nama_lengkap kyc_status');
}

async function ensureChatAvailable(quest, userId, res) {
    if (!quest || !quest.pekerja_id) {
        res.status(404).json({ success: false, message: 'Percakapan belum tersedia untuk quest ini.' });
        return false;
    }
    if (!isParticipant(quest, userId)) {
        res.status(403).json({ success: false, message: 'Anda bukan peserta transaksi ini.' });
        return false;
    }
    if (quest.chat_status === 'DELETED' || (quest.chat_delete_at && Date.now() >= new Date(quest.chat_delete_at).getTime())) {
        await ChatMessage.deleteMany({ quest_id: quest._id });
        quest.chat_status = 'DELETED';
        await quest.save();
    }
    return true;
}

exports.getActiveConversation = async (req, res) => {
    try {
        const quest = await Quest.findOne({
            $or: [{ pembuat_id: req.user.id }, { pekerja_id: req.user.id }],
            status: { $in: ['TAKEN', 'IN_PROGRESS', 'COMPLETED'] },
            pekerja_id: { $ne: null }
        }).sort({ created_at: -1 }).populate('pembuat_id', 'nama_lengkap kyc_status').populate('pekerja_id', 'nama_lengkap kyc_status');
        if (!quest) return res.status(404).json({ success: false, message: 'Tidak ada percakapan transaksi.' });
        return res.json({ success: true, data: quest });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const quest = await loadQuest(req.params.questId);
        if (!(await ensureChatAvailable(quest, req.user.id, res))) return;
        await ChatMessage.updateMany({ quest_id: quest._id, sender_id: { $ne: req.user.id }, read_by: { $ne: req.user.id } }, { $addToSet: { read_by: req.user.id } });
        const messages = quest.chat_status === 'DELETED' ? [] : await ChatMessage.find({ quest_id: quest._id }).sort({ created_at: 1 }).populate('sender_id', 'nama_lengkap');
        return res.json({ success: true, data: { quest, messages } });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const quest = await loadQuest(req.params.questId);
        if (!(await ensureChatAvailable(quest, req.user.id, res))) return;
        if (quest.chat_status !== 'ACTIVE' || quest.status === 'COMPLETED') return res.status(400).json({ success: false, message: 'Percakapan sudah dikunci.' });
        const text = String(req.body.text || '').trim();
        if (!text) return res.status(400).json({ success: false, message: 'Pesan tidak boleh kosong.' });
        const message = await ChatMessage.create({ quest_id: quest._id, sender_id: req.user.id, type: 'TEXT', text, read_by: [req.user.id] });
        return res.status(201).json({ success: true, data: message });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.sendOffer = async (req, res) => {
    try {
        const quest = await loadQuest(req.params.questId);
        if (!(await ensureChatAvailable(quest, req.user.id, res))) return;
        if (quest.status !== 'TAKEN' || quest.chat_status !== 'ACTIVE') return res.status(400).json({ success: false, message: 'Penawaran hanya dapat diajukan sebelum pekerjaan dimulai.' });
        const amount = Number(req.body.amount);
        const duration = String(req.body.duration || '').trim();
        const note = String(req.body.note || '').trim();
        if (!Number.isFinite(amount) || amount < 1000 || !duration || !note) return res.status(400).json({ success: false, message: 'Nominal, estimasi, dan catatan penawaran wajib diisi.' });
        await ChatMessage.updateMany({ quest_id: quest._id, type: 'OFFER', 'offer.status': 'PENDING' }, { $set: { 'offer.status': 'EXPIRED' } });
        quest.negotiation_status = 'PENDING';
        await quest.save();
        const message = await ChatMessage.create({ quest_id: quest._id, sender_id: req.user.id, type: 'OFFER', offer: { amount, duration, note, status: 'PENDING' }, read_by: [req.user.id] });
        return res.status(201).json({ success: true, data: message });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.respondOffer = async (req, res) => {
    try {
        const quest = await loadQuest(req.params.questId);
        if (!(await ensureChatAvailable(quest, req.user.id, res))) return;
        const action = req.body.action;
        const offerMessage = await ChatMessage.findOne({ _id: req.params.messageId, quest_id: quest._id, type: 'OFFER' });
        if (!offerMessage || offerMessage.offer.status !== 'PENDING') return res.status(404).json({ success: false, message: 'Penawaran aktif tidak ditemukan.' });
        if (String(offerMessage.sender_id) === String(req.user.id)) return res.status(403).json({ success: false, message: 'Pengirim tidak dapat merespons penawarannya sendiri.' });
        if (!['ACCEPT', 'REJECT'].includes(action)) return res.status(400).json({ success: false, message: 'Respons penawaran tidak valid.' });
        if (action === 'ACCEPT') {
            offerMessage.offer.status = 'ACCEPTED';
            quest.negotiation_status = 'AGREED';
            quest.agreed_upah = offerMessage.offer.amount;
            quest.agreed_duration = offerMessage.offer.duration;
            quest.payment_status = quest.payment_required ? 'UNPAID' : 'NOT_REQUIRED';
            await Promise.all([offerMessage.save(), quest.save()]);
            await ChatMessage.create({ quest_id: quest._id, type: 'SYSTEM', text: `Kesepakatan tercapai: Rp ${offerMessage.offer.amount.toLocaleString('id-ID')} · ${offerMessage.offer.duration}.`, read_by: participantIds(quest) });
        } else {
            offerMessage.offer.status = 'REJECTED';
            await offerMessage.save();
            await ChatMessage.create({ quest_id: quest._id, type: 'SYSTEM', text: 'Penawaran ditolak. Negosiasi masih dapat dilanjutkan.', read_by: participantIds(quest) });
        }
        return res.json({ success: true, message: action === 'ACCEPT' ? 'Penawaran disepakati.' : 'Penawaran ditolak.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
