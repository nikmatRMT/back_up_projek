const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
    conversation_id: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestConversation', default: null, index: true },
    quest_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Quest', required: true, index: true },
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    type: { type: String, enum: ['TEXT', 'OFFER', 'SYSTEM'], default: 'TEXT' },
    text: { type: String, trim: true, maxlength: 500, default: '' },
    offer: {
        amount: { type: Number, min: 1000 },
        duration: { type: String, maxlength: 40 },
        note: { type: String, maxlength: 180 },
        status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'], default: 'PENDING' }
    },
    read_by: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    created_at: { type: Date, default: Date.now },
    delete_at: { type: Date, default: null }
});

chatMessageSchema.index({ delete_at: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('ChatMessage', chatMessageSchema);
