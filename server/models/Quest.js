const mongoose = require('mongoose');

const questSchema = new mongoose.Schema({
    pembuat_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    pekerja_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    kategori: {
        type: String,
        enum: ['jastip', 'fisik', 'perbaikan'],
        required: true
    },
    deskripsi: {
        type: String,
        required: true
    },
    upah_jasa: {
        type: Number,
        required: true
    },
    nominal_talangan: {
        type: Number,
        default: 0
    },
    jarak_meter: {
        type: Number,
        default: 0
    },
    transport_mode: {
        type: String,
        enum: ['walk', 'motorcycle'],
        default: 'walk'
    },
    // Konfigurasi GeoJSON Point
    lokasi: {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude] format
            required: true
        }
    },
    pekerja_lokasi: {
        longitude: { type: Number, default: null },
        latitude: { type: Number, default: null }
    },
    status: {
        type: String,
        enum: ['OPEN', 'TAKEN', 'IN_PROGRESS', 'AWAITING_PAYMENT', 'COMPLETED', 'CANCELED'],
        default: 'OPEN'
    },
    negotiation_status: {
        type: String,
        enum: ['NOT_STARTED', 'PENDING', 'AGREED'],
        default: 'NOT_STARTED'
    },
    agreed_upah: { type: Number, default: null },
    agreed_duration: { type: String, default: null },
    payment_required: { type: Boolean, default: false },
    payment_status: {
        type: String,
        enum: ['NOT_REQUIRED', 'UNPAID', 'PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED'],
        default: 'NOT_REQUIRED'
    },
    payment_method: { type: String, default: null },
    payment_reference: { type: String, default: null },
    payment_updated_at: { type: Date, default: null },
    paid_at: { type: Date, default: null },
    chat_status: {
        type: String,
        enum: ['ACTIVE', 'RETENTION', 'DELETED'],
        default: 'ACTIVE'
    },
    chat_delete_at: { type: Date, default: null },
    taken_at: {
        type: Date,
        default: null
    },
    arrived_at: {
        type: Date,
        default: null
    },
    pin_rahasia: {
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    completed_at: {
        type: Date
    },
    completion_verified_at: { type: Date, default: null },
    credited_at: { type: Date, default: null },
    expired_at: {
        type: Date
    },
    rating_pekerja: {
        type: Number,
        min: 1,
        max: 5,
        default: null
    },
    ulasan_pekerja: {
        type: String,
        default: null
    },
    cancel_reason: {
        type: String,
        enum: ['TIMEOUT_OPEN', 'WORKER_NO_SHOW', 'WORKER_INCOMPLETE', 'USER_CANCELED'],
        default: null
    }
});

// MEMBUAT INDEX 2DSPHERE UNTUK KOMPUTASI HAVERSINE
questSchema.index({ lokasi: '2dsphere' });

module.exports = mongoose.model('Quest', questSchema);
