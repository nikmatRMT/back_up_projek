'use strict';

const CONFIRMATION = 'I_UNDERSTAND_DATABASE_WILL_CHANGE';

function requireMaintenanceMode(scriptName, options = {}) {
    if (process.env.ALLOW_DB_MAINTENANCE !== CONFIRMATION) {
        throw new Error(
            `${scriptName} dinonaktifkan. Untuk menjalankannya secara sengaja, ` +
            `set ALLOW_DB_MAINTENANCE=${CONFIRMATION}.`
        );
    }

    if (options.requireMongoUri !== false && !process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI tidak ditemukan pada environment.');
    }
}

module.exports = { requireMaintenanceMode, CONFIRMATION };
