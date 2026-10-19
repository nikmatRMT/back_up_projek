const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    password: {
        type: String,
        required: true
    },
    nama_lengkap: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    no_whatsapp: {
        type: String,
        required: true,
        unique: true
    },
    batas_talangan: {
        type: Number,
        default: 20000
    },
    saldo: {
        type: Number,
        default: 0
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'SUSPENDED'],
        default: 'ACTIVE'
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    rating_rata_rata: {
        type: Number,
        default: 0
    },
    total_ulasan: {
        type: Number,
        default: 0
    },
    kyc_status: {
        type: String,
        enum: ['UNVERIFIED', 'VERIFIED', 'REJECTED'],
        default: 'UNVERIFIED'
    },
    kyc_method: {
        type: String,
        default: null
    },
    kyc_rejection_reason: {
        type: String,
        default: null
    },
    kyc_verified_at: {
        type: Date,
        default: null
    },
    kyc_nik: {
        type: String,
        default: null
    },
    kyc_name: {
        type: String,
        default: null
    },
    kyc_address: {
        type: String,
        default: null
    },
    kyc_document_image: {
        type: String,
        default: null
    }
});

module.exports = mongoose.model('User', userSchema);
