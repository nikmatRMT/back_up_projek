const mongoose = require('mongoose');

const questConversationSchema = new mongoose.Schema({
    quest_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Quest', required: true, index: true },
    client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    worker_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
        type: String,
        enum: ['NEGOTIATING', 'SELECTED', 'REJECTED', 'CLOSED'],
        default: 'NEGOTIATING',
        index: true
    },
    jarak_meter: { type: Number, default: 0 },
    transport_mode: { type: String, enum: ['walk', 'motorcycle'], default: 'walk' },
    last_message_at: { type: Date, default: Date.now },
    created_at: { type: Date, default: Date.now }
});

questConversationSchema.index({ quest_id: 1, worker_id: 1 }, { unique: true });

module.exports = mongoose.model('QuestConversation', questConversationSchema);
