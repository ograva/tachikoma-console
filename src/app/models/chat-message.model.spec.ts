import { ChatMessageModel } from './chat-message.model';
import { ChatSessionModel } from './chat-session.model';

/**
 * SYNC-002 (reopen): restored and reloaded transcripts must keep the documented
 * ChatMessage fields (CanonicalDataModelSpec §3) — round grouping, failure
 * state and retry metadata — without introducing undefined/null (DAT-302).
 */
describe('ChatMessageModel.normalize (SYNC-002)', () => {
  const full = {
    id: 'msg_1',
    sender: 'LOGIKOMA',
    text: 'hello',
    html: '<p>hello</p>',
    isUser: false,
    agentId: 'logikoma',
    timestamp: 1_760_000_000_000,
    roundId: 3,
    messageType: 'failed-step' as const,
    retryCount: 2,
    status: 'failed' as const,
    failureCode: 'RATE_LIMIT',
    failureMessage: 'Quota exceeded',
  };

  it('preserves roundId, messageType, retryCount and failure fields', () => {
    expect(ChatMessageModel.normalize(full)).toEqual(full);
  });

  it('keeps roundId 0 (falsy but valid)', () => {
    expect(ChatMessageModel.normalize({ ...full, roundId: 0 }).roundId).toBe(0);
  });

  it('does not add keys for absent optional fields', () => {
    const msg = ChatMessageModel.normalize({ id: 'm', sender: 'USER', text: 't', isUser: true, timestamp: 1 });
    for (const key of ['agentId', 'roundId', 'messageType', 'retryCount', 'status', 'failureCode', 'failureMessage']) {
      expect(Object.prototype.hasOwnProperty.call(msg, key)).withContext(key).toBeFalse();
    }
  });

  it('drops null optional values instead of carrying them', () => {
    const msg = ChatMessageModel.normalize({ ...full, roundId: null as any, agentId: null as any });
    expect('roundId' in msg).toBeFalse();
    expect('agentId' in msg).toBeFalse();
  });

  it('still fills required defaults', () => {
    const msg = ChatMessageModel.normalize({});
    expect(msg.sender).toBe('Unknown');
    expect(msg.text).toBe('');
    expect(msg.isUser).toBeFalse();
    expect(typeof msg.id).toBe('string');
  });

  it('is applied on both the Firestore and the localStorage load paths', () => {
    const session = { id: 'chat_1', title: 'T', messages: [full], createdAt: 1, updatedAt: 2 };
    expect(ChatSessionModel.fromFirestore(session).messages[0].roundId).toBe(3);
    expect(ChatSessionModel.fromLocalStorage(session).messages[0].roundId).toBe(3);
    expect(ChatSessionModel.fromLocalStorage(session).messages[0].retryCount).toBe(2);
  });
});
