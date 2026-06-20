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
        enum: ['OPEN', 'TAKEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'],
        default: 'OPEN'
    },
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
    expired_at: {
        type: Date
    }
});

// MEMBUAT INDEX 2DSPHERE UNTUK KOMPUTASI HAVERSINE
questSchema.index({ lokasi: '2dsphere' });

module.exports = mongoose.model('Quest', questSchema);
