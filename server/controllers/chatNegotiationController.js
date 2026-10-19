const Quest = require('../models/Quest');
const User = require('../models/User');
const ChatMessage = require('../models/ChatMessage');
const QuestConversation = require('../models/QuestConversation');

const idOf = (value) => String(value?._id || value || '');

function isParticipant(conversation, userId) {
    return [conversation.client_id, conversation.worker_id].map(idOf).includes(String(userId));
}

function populateConversation(query) {
    return query.populate('client_id', 'nama_lengkap kyc_status').populate('worker_id', 'nama_lengkap kyc_status');
}

async function loadConversation(conversationId) {
    return populateConversation(QuestConversation.findById(conversationId));
}

async function createSystemMessage(conversation, text) {
    const message = await ChatMessage.create({
        conversation_id: conversation._id,
        quest_id: conversation.quest_id,
        type: 'SYSTEM',
        text,
        read_by: [conversation.client_id, conversation.worker_id].map(idOf)
    });
    conversation.last_message_at = message.created_at;
    await conversation.save();
}

async function ensureLegacyConversation(quest) {
    if (!quest?.pekerja_id) return null;
    const status = quest.status === 'COMPLETED'
        ? 'CLOSED'
        : quest.negotiation_status === 'AGREED' ? 'SELECTED' : 'NEGOTIATING';
    return QuestConversation.findOneAndUpdate(
        { quest_id: quest._id, worker_id: quest.pekerja_id },
        {
            $setOnInsert: {
                client_id: quest.pembuat_id,
                jarak_meter: quest.jarak_meter || 0,
                transport_mode: quest.transport_mode || 'walk',
                created_at: quest.taken_at || quest.created_at || new Date()
            },
            $set: { status }
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );
}

async function ensureAvailable(conversation, userId, res) {
    if (!conversation) {
        res.status(404).json({ success: false, message: 'Percakapan tidak ditemukan.' });
        return null;
    }
    if (!isParticipant(conversation, userId)) {
        res.status(403).json({ success: false, message: 'Anda bukan peserta percakapan ini.' });
        return null;
    }
    const quest = await Quest.findById(conversation.quest_id)
        .populate('pembuat_id', 'nama_lengkap kyc_status')
        .populate('pekerja_id', 'nama_lengkap kyc_status');
    if (!quest) {
        res.status(404).json({ success: false, message: 'Quest tidak ditemukan.' });
        return null;
    }
    if (quest.chat_status === 'DELETED' || (quest.chat_delete_at && Date.now() >= new Date(quest.chat_delete_at).getTime())) {
        await ChatMessage.deleteMany({ quest_id: quest._id });
        quest.chat_status = 'DELETED';
        conversation.status = 'CLOSED';
        await Promise.all([quest.save(), conversation.save()]);
    }
    return quest;
}

exports.openNegotiation = async (req, res) => {
    try {
        const quest = await Quest.findById(req.params.questId);
        if (!quest || quest.status !== 'OPEN') {
            return res.status(400).json({ success: false, message: 'Quest sudah tidak terbuka untuk penawaran.' });
        }
        if (idOf(quest.pembuat_id) === String(req.user.id)) {
            return res.status(403).json({ success: false, message: 'Pemilik quest tidak dapat menawar quest sendiri.' });
        }
        const worker = await User.findById(req.user.id).select('kyc_status');
        if (!worker) return res.status(404).json({ success: false, message: 'Akun Pekerja tidak ditemukan.' });
        if (worker.kyc_status !== 'VERIFIED') {
            return res.status(403).json({ success: false, code: 'KYC_REQUIRED', message: 'Verifikasi identitas (KTP) terlebih dahulu sebelum mengajukan penawaran.' });
        }
        const activeAssignment = await Quest.findOne({ pekerja_id: req.user.id, status: { $in: ['TAKEN', 'IN_PROGRESS', 'AWAITING_PAYMENT'] } });
        if (activeAssignment) {
            return res.status(400).json({ success: false, message: 'Anda masih memiliki tugas aktif. Selesaikan tugas tersebut sebelum mengajukan penawaran baru.' });
        }

        const transportMode = ['walk', 'motorcycle'].includes(req.body.transport_mode) ? req.body.transport_mode : 'walk';
        const conversation = await QuestConversation.findOneAndUpdate(
            { quest_id: quest._id, worker_id: req.user.id },
            {
                $setOnInsert: { client_id: quest.pembuat_id, created_at: new Date() },
                $set: {
                    status: 'NEGOTIATING',
                    jarak_meter: Number(req.body.jarak_meter) || 0,
                    transport_mode: transportMode,
                    last_message_at: new Date()
                }
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        if (quest.negotiation_status === 'NOT_STARTED') {
            quest.negotiation_status = 'PENDING';
            await quest.save();
        }
        return res.status(201).json({ success: true, message: 'Ruang negosiasi pribadi dibuka.', data: conversation });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.listQuestConversations = async (req, res) => {
    try {
        const quest = await Quest.findById(req.params.questId)
            .populate('pembuat_id', 'nama_lengkap kyc_status')
            .populate('pekerja_id', 'nama_lengkap kyc_status');
        if (!quest) return res.status(404).json({ success: false, message: 'Quest tidak ditemukan.' });
        const isClient = idOf(quest.pembuat_id) === String(req.user.id);
        const isAssignedWorker = idOf(quest.pekerja_id) === String(req.user.id);
        if (quest.pekerja_id && ['TAKEN', 'IN_PROGRESS', 'AWAITING_PAYMENT', 'COMPLETED'].includes(quest.status)) {
            await ensureLegacyConversation(quest);
        }
        const filter = { quest_id: quest._id };
        if (!isClient) filter.worker_id = req.user.id;
        const conversations = await populateConversation(QuestConversation.find(filter).sort({ last_message_at: -1 }));
        if (!isClient && !isAssignedWorker && conversations.length === 0) {
            return res.status(403).json({ success: false, message: 'Anda belum memiliki penawaran pada quest ini.' });
        }
        const conversationIds = conversations.map((item) => item._id);
        const offers = await ChatMessage.find({ conversation_id: { $in: conversationIds }, type: 'OFFER' }).sort({ created_at: -1 }).lean();
        const latestOffers = new Map();
        offers.forEach((offer) => {
            const key = idOf(offer.conversation_id);
            if (!latestOffers.has(key)) latestOffers.set(key, offer.offer);
        });
        return res.json({
            success: true,
            data: {
                quest,
                conversations: conversations.map((item) => ({
                    ...item.toObject(),
                    latest_offer: latestOffers.get(idOf(item._id)) || null
                }))
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.getActiveConversation = async (req, res) => {
    try {
        let quest = await Quest.findOne({
            $or: [{ pembuat_id: req.user.id }, { pekerja_id: req.user.id }],
            status: { $in: ['TAKEN', 'IN_PROGRESS', 'AWAITING_PAYMENT'] },
            pekerja_id: { $ne: null }
        }).sort({ taken_at: -1 });
        if (!quest) return res.status(404).json({ success: false, message: 'Tidak ada percakapan transaksi aktif.' });
        await ensureLegacyConversation(quest);
        quest = await Quest.findById(quest._id)
            .populate('pembuat_id', 'nama_lengkap kyc_status')
            .populate('pekerja_id', 'nama_lengkap kyc_status');
        return res.json({ success: true, data: quest });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.getMyNegotiations = async (req, res) => {
    try {
        const conversations = await QuestConversation.find({
            worker_id: req.user.id,
            status: { $in: ['NEGOTIATING', 'SELECTED'] }
        })
            .sort({ last_message_at: -1 })
            .populate('quest_id', 'deskripsi status upah_jasa negotiation_status agreed_upah')
            .populate('client_id', 'nama_lengkap kyc_status')
            .populate('worker_id', 'nama_lengkap kyc_status');
        const active = conversations.filter((item) => item.quest_id && ['OPEN', 'TAKEN', 'IN_PROGRESS', 'AWAITING_PAYMENT'].includes(item.quest_id.status));
        return res.json({ success: true, data: active });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.getMessages = async (req, res) => {
    try {
        const conversation = await loadConversation(req.params.conversationId);
        const quest = await ensureAvailable(conversation, req.user.id, res);
        if (!quest) return;
        await ChatMessage.updateMany(
            { conversation_id: conversation._id, sender_id: { $ne: req.user.id }, read_by: { $ne: req.user.id } },
            { $addToSet: { read_by: req.user.id } }
        );
        const messages = quest.chat_status === 'DELETED' ? [] : await ChatMessage.find({ conversation_id: conversation._id })
            .sort({ created_at: 1 }).populate('sender_id', 'nama_lengkap');
        return res.json({ success: true, data: { conversation, quest, messages } });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.sendMessage = async (req, res) => {
    try {
        const conversation = await loadConversation(req.params.conversationId);
        const quest = await ensureAvailable(conversation, req.user.id, res);
        if (!quest) return;
        const selectedTransaction = conversation.status === 'SELECTED' && ['TAKEN', 'IN_PROGRESS', 'AWAITING_PAYMENT'].includes(quest.status);
        const openNegotiation = conversation.status === 'NEGOTIATING' && ['OPEN', 'TAKEN'].includes(quest.status);
        if (quest.chat_status !== 'ACTIVE' || (!selectedTransaction && !openNegotiation)) {
            return res.status(400).json({ success: false, message: 'Percakapan ini sudah dikunci.' });
        }
        const messageText = String(req.body.text || '').trim();
        if (!messageText) return res.status(400).json({ success: false, message: 'Pesan tidak boleh kosong.' });
        const message = await ChatMessage.create({
            conversation_id: conversation._id,
            quest_id: quest._id,
            sender_id: req.user.id,
            type: 'TEXT',
            text: messageText,
            read_by: [req.user.id]
        });
        conversation.last_message_at = message.created_at;
        await conversation.save();
        return res.status(201).json({ success: true, data: message });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.sendOffer = async (req, res) => {
    try {
        const conversation = await loadConversation(req.params.conversationId);
        const quest = await ensureAvailable(conversation, req.user.id, res);
        if (!quest) return;
        const legacyAssigned = quest.status === 'TAKEN'
            && idOf(quest.pekerja_id) === idOf(conversation.worker_id)
            && quest.negotiation_status !== 'AGREED';
        if (conversation.status !== 'NEGOTIATING' || (quest.status !== 'OPEN' && !legacyAssigned)) {
            return res.status(400).json({ success: false, message: 'Penawaran pada percakapan ini sudah ditutup.' });
        }
        const amount = Number(req.body.amount);
        const duration = String(req.body.duration || '').trim();
        const note = String(req.body.note || '').trim();
        if (!Number.isFinite(amount) || amount < 1000 || !duration || !note) {
            return res.status(400).json({ success: false, message: 'Nominal, estimasi, dan catatan penawaran wajib diisi.' });
        }
        await ChatMessage.updateMany(
            { conversation_id: conversation._id, type: 'OFFER', 'offer.status': 'PENDING' },
            { $set: { 'offer.status': 'EXPIRED' } }
        );
        if (quest.negotiation_status !== 'AGREED') {
            quest.negotiation_status = 'PENDING';
            await quest.save();
        }
        const message = await ChatMessage.create({
            conversation_id: conversation._id,
            quest_id: quest._id,
            sender_id: req.user.id,
            type: 'OFFER',
            offer: { amount, duration, note, status: 'PENDING' },
            read_by: [req.user.id]
        });
        conversation.last_message_at = message.created_at;
        await conversation.save();
        return res.status(201).json({ success: true, data: message });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.acceptListedPrice = async (req, res) => {
    try {
        const conversation = await loadConversation(req.params.conversationId);
        const quest = await ensureAvailable(conversation, req.user.id, res);
        if (!quest) return;
        if (idOf(conversation.worker_id) !== String(req.user.id)) {
            return res.status(403).json({ success: false, message: 'Hanya Pekerja yang dapat menerima upah awal.' });
        }
        if (conversation.status !== 'NEGOTIATING' || quest.status !== 'OPEN') {
            return res.status(400).json({ success: false, message: 'Quest sudah tidak tersedia untuk diterima langsung.' });
        }

        const activeAssignment = await Quest.findOne({
            _id: { $ne: quest._id },
            pekerja_id: conversation.worker_id,
            status: { $in: ['TAKEN', 'IN_PROGRESS', 'AWAITING_PAYMENT'] }
        });
        if (activeAssignment) {
            return res.status(400).json({ success: false, message: 'Anda masih memiliki tugas aktif lainnya.' });
        }

        const selectedQuest = await Quest.findOneAndUpdate(
            { _id: quest._id, status: 'OPEN' },
            { $set: {
                status: 'TAKEN',
                pekerja_id: conversation.worker_id,
                taken_at: new Date(),
                jarak_meter: conversation.jarak_meter || 0,
                transport_mode: conversation.transport_mode || 'walk',
                negotiation_status: 'AGREED',
                agreed_upah: quest.upah_jasa,
                agreed_duration: 'Sesuai deskripsi',
                payment_status: quest.payment_required ? 'UNPAID' : 'NOT_REQUIRED',
                chat_status: 'ACTIVE'
            } },
            { new: true }
        );
        if (!selectedQuest) {
            conversation.status = 'REJECTED';
            await conversation.save();
            return res.status(409).json({ success: false, message: 'Quest telah diambil oleh Pekerja lain.' });
        }

        conversation.status = 'SELECTED';
        await conversation.save();
        const otherConversations = await QuestConversation.find({ quest_id: quest._id, _id: { $ne: conversation._id } });
        const otherIds = otherConversations.map((item) => item._id);
        await Promise.all([
            otherIds.length ? QuestConversation.updateMany({ _id: { $in: otherIds } }, { $set: { status: 'REJECTED' } }) : Promise.resolve(),
            ChatMessage.updateMany(
                { quest_id: quest._id, type: 'OFFER', 'offer.status': 'PENDING' },
                { $set: { 'offer.status': 'EXPIRED' } }
            )
        ]);
        await createSystemMessage(
            conversation,
            `${conversation.worker_id.nama_lengkap || 'Pekerja'} menerima upah awal Rp ${quest.upah_jasa.toLocaleString('id-ID')}. Quest langsung diberikan kepada Pekerja.`
        );
        return res.json({ success: true, message: 'Upah awal diterima dan quest berhasil diambil.', data: selectedQuest });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.respondOffer = async (req, res) => {
    try {
        const conversation = await loadConversation(req.params.conversationId);
        const quest = await ensureAvailable(conversation, req.user.id, res);
        if (!quest) return;
        const offerMessage = await ChatMessage.findOne({
            _id: req.params.messageId,
            conversation_id: conversation._id,
            type: 'OFFER'
        });
        if (!offerMessage || offerMessage.offer.status !== 'PENDING') {
            return res.status(404).json({ success: false, message: 'Penawaran aktif tidak ditemukan.' });
        }
        if (idOf(offerMessage.sender_id) === String(req.user.id)) {
            return res.status(403).json({ success: false, message: 'Pengirim tidak dapat merespons penawarannya sendiri.' });
        }
        const action = req.body.action;
        if (!['ACCEPT', 'REJECT'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Respons penawaran tidak valid.' });
        }
        if (action === 'REJECT') {
            offerMessage.offer.status = 'REJECTED';
            await offerMessage.save();
            await createSystemMessage(conversation, 'Penawaran ditolak. Negosiasi masih dapat dilanjutkan.');
            return res.json({ success: true, message: 'Penawaran ditolak.' });
        }

        const activeAssignment = await Quest.findOne({
            _id: { $ne: quest._id },
            pekerja_id: conversation.worker_id,
            status: { $in: ['TAKEN', 'IN_PROGRESS', 'AWAITING_PAYMENT'] }
        });
        if (activeAssignment) {
            return res.status(400).json({ success: false, message: 'Calon pekerja sudah memiliki tugas aktif lainnya.' });
        }

        let selectedQuest = null;
        if (quest.status === 'OPEN') {
            selectedQuest = await Quest.findOneAndUpdate(
                { _id: quest._id, status: 'OPEN' },
                { $set: {
                    status: 'TAKEN',
                    pekerja_id: conversation.worker_id,
                    taken_at: new Date(),
                    jarak_meter: conversation.jarak_meter || 0,
                    transport_mode: conversation.transport_mode || 'walk',
                    negotiation_status: 'AGREED',
                    agreed_upah: offerMessage.offer.amount,
                    agreed_duration: offerMessage.offer.duration,
                    payment_status: quest.payment_required ? 'UNPAID' : 'NOT_REQUIRED',
                    chat_status: 'ACTIVE'
                } },
                { new: true }
            );
        } else if (quest.status === 'TAKEN' && idOf(quest.pekerja_id) === idOf(conversation.worker_id)) {
            selectedQuest = await Quest.findByIdAndUpdate(
                quest._id,
                { $set: {
                    negotiation_status: 'AGREED',
                    agreed_upah: offerMessage.offer.amount,
                    agreed_duration: offerMessage.offer.duration,
                    payment_status: quest.payment_required ? 'UNPAID' : 'NOT_REQUIRED'
                } },
                { new: true }
            );
        }
        if (!selectedQuest) {
            offerMessage.offer.status = 'EXPIRED';
            conversation.status = 'REJECTED';
            await Promise.all([offerMessage.save(), conversation.save()]);
            return res.status(409).json({ success: false, message: 'Quest telah diberikan kepada pekerja lain.' });
        }

        offerMessage.offer.status = 'ACCEPTED';
        conversation.status = 'SELECTED';
        await Promise.all([offerMessage.save(), conversation.save()]);
        const otherConversations = await QuestConversation.find({ quest_id: quest._id, _id: { $ne: conversation._id } });
        if (otherConversations.length > 0) {
            const otherIds = otherConversations.map((item) => item._id);
            await Promise.all([
                QuestConversation.updateMany({ _id: { $in: otherIds } }, { $set: { status: 'REJECTED' } }),
                ChatMessage.updateMany(
                    { conversation_id: { $in: otherIds }, type: 'OFFER', 'offer.status': 'PENDING' },
                    { $set: { 'offer.status': 'EXPIRED' } }
                )
            ]);
        }
        await createSystemMessage(
            conversation,
            `Penawaran dipilih. Quest diberikan kepada ${conversation.worker_id.nama_lengkap || 'Pekerja'} dengan upah Rp ${offerMessage.offer.amount.toLocaleString('id-ID')} dan estimasi ${offerMessage.offer.duration}.`
        );
        return res.json({ success: true, message: 'Penawaran disepakati dan Pekerja dipilih.', data: selectedQuest });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
