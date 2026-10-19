const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const { EJSON } = require('bson');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI tidak ditemukan di server/.env');

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupRoot = path.resolve(__dirname, '..', 'backups', `mongodb-${stamp}`);
    await fs.mkdir(backupRoot, { recursive: true });

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    const db = mongoose.connection.db;
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    const manifest = {
        format: 'MongoDB Extended JSON',
        createdAt: new Date().toISOString(),
        database: db.databaseName,
        collections: []
    };

    for (const { name } of collections) {
        const documents = await db.collection(name).find({}).toArray();
        await fs.writeFile(
            path.join(backupRoot, `${name}.json`),
            EJSON.stringify(documents, { relaxed: false }, 2),
            'utf8'
        );
        manifest.collections.push({ name, documents: documents.length });
    }

    await fs.writeFile(path.join(backupRoot, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    console.log(JSON.stringify({ success: true, backupRoot, manifest }, null, 2));
    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error(JSON.stringify({ success: false, message: error.message }));
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
});
