export const DEMO_RETENTION_SECONDS = 30;

export const PARTICIPANTS = {
  client: {
    id: 'user-client-001',
    name: 'Dita Rahmawati',
    roleLabel: 'Klien',
    initials: 'DR',
  },
  worker: {
    id: 'user-worker-001',
    name: 'Arif Pratama',
    roleLabel: 'Pekerja',
    initials: 'AP',
  },
};

export const QUEST = {
  id: 'quest-chat-001',
  transactionCode: 'JW-2408-021',
  title: 'Perbaiki engsel pintu dapur',
  reward: 30000,
  location: 'Guntung Paikat, Banjarbaru',
};

export function createInitialChatState() {
  const now = Date.now();

  return {
    version: 2,
    transactionStatus: 'NEGOTIATING',
    chatStatus: 'ACTIVE',
    agreement: null,
    closedAt: null,
    deleteAt: null,
    deletedAt: null,
    messages: [
      {
        id: 'message-001',
        kind: 'text',
        senderId: PARTICIPANTS.client.id,
        text: 'Halo Kak, apakah quest ini bisa dikerjakan hari ini?',
        createdAt: now - 12 * 60 * 1000,
        status: 'read',
      },
      {
        id: 'message-002',
        kind: 'text',
        senderId: PARTICIPANTS.worker.id,
        text: 'Bisa, Kak. Namun kemungkinan engselnya perlu diganti, bukan hanya dikencangkan.',
        createdAt: now - 10 * 60 * 1000,
        status: 'read',
      },
      {
        id: 'offer-001',
        kind: 'offer',
        senderId: PARTICIPANTS.worker.id,
        amount: 40000,
        duration: '2 jam',
        note: 'Termasuk pemeriksaan dan penggantian engsel jika diperlukan.',
        isCounter: false,
        offerStatus: 'PENDING',
        createdAt: now - 9 * 60 * 1000,
        status: 'delivered',
      },
    ],
  };
}
