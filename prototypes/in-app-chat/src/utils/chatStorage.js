import { createInitialChatState } from '../data/demo';

const STORAGE_KEY = 'jawarga_in_app_chat_prototype_v2';

function applyExpiredRetention(state) {
  if (
    state?.chatStatus === 'RETENTION'
    && Number.isFinite(state.deleteAt)
    && Date.now() >= state.deleteAt
  ) {
    return {
      ...state,
      chatStatus: 'DELETED',
      messages: [],
      deletedAt: Date.now(),
    };
  }
  return state;
}

export function loadChatState() {
  try {
    const serialized = window.localStorage.getItem(STORAGE_KEY);
    if (!serialized) return createInitialChatState();
    const state = JSON.parse(serialized);
    if (state?.version !== 2 || !Array.isArray(state.messages)) {
      return createInitialChatState();
    }
    return applyExpiredRetention(state);
  } catch {
    return createInitialChatState();
  }
}

export function saveChatState(state) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearChatState() {
  window.localStorage.removeItem(STORAGE_KEY);
}
