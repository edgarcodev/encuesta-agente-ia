import { describe, it, expect } from 'vitest';
import { getDraftKey, saveDraft, loadDraft, clearDraft } from '../../lib/draft.js';

// ================================================================
// Mock localStorage
// ================================================================

function createMockStorage() {
  const store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => {
      store[key] = val;
    },
    removeItem: (key) => {
      delete store[key];
    },
    _store: store,
  };
}

// ================================================================
// getDraftKey()
// ================================================================

describe('getDraftKey', () => {
  it('returns correct key for compradores', () => {
    expect(getDraftKey('compradores')).toBe('megaremates_encuesta_borrador_compradores');
  });

  it('returns correct key for vendedores', () => {
    expect(getDraftKey('vendedores')).toBe('megaremates_encuesta_borrador_vendedores');
  });

  it('generates unique keys per type', () => {
    const key1 = getDraftKey('compradores');
    const key2 = getDraftKey('vendedores');
    expect(key1).not.toBe(key2);
  });
});

// ================================================================
// saveDraft()
// ================================================================

describe('saveDraft', () => {
  it('writes valid JSON to storage', () => {
    const storage = createMockStorage();
    const answers = { p1: 'test', p2: ['a', 'b'] };

    saveDraft({
      answers,
      currentStepIndex: 3,
      tiemposPorPregunta: { p1: 5, p2: 10 },
      inicioEncuesta: new Date('2026-11-02T10:00:00.000Z'),
      tipo: 'compradores',
      storage,
    });

    const raw = storage.getItem(getDraftKey('compradores'));
    expect(raw).toBeDefined();

    const parsed = JSON.parse(raw);
    expect(parsed.answers).toEqual(answers);
    expect(parsed.currentStepIndex).toBe(3);
    expect(parsed.tiemposPorPregunta).toEqual({ p1: 5, p2: 10 });
    expect(parsed.inicioEncuesta).toBe('2026-11-02T10:00:00.000Z');
    expect(parsed.savedAt).toBeDefined();
  });

  it('does not mutate original answers object', () => {
    const storage = createMockStorage();
    const answers = { p1: 'test' };

    saveDraft({
      answers,
      currentStepIndex: 0,
      tiemposPorPregunta: {},
      inicioEncuesta: new Date(),
      tipo: 'compradores',
      storage,
    });

    // Mutate the saved data
    const raw = storage.getItem(getDraftKey('compradores'));
    const parsed = JSON.parse(raw);
    parsed.answers.p1 = 'changed';

    // Original should be unchanged
    expect(answers.p1).toBe('test');
  });

  it('handles Date objects by converting to ISO string', () => {
    const storage = createMockStorage();
    const startDate = new Date('2026-11-02T10:30:00.000Z');

    saveDraft({
      answers: { p1: 'x' },
      currentStepIndex: 0,
      tiemposPorPregunta: {},
      inicioEncuesta: startDate,
      tipo: 'compradores',
      storage,
    });

    const raw = storage.getItem(getDraftKey('compradores'));
    const parsed = JSON.parse(raw);
    expect(parsed.inicioEncuesta).toBe('2026-11-02T10:30:00.000Z');
  });

  it('accepts string inicioEncuesta', () => {
    const storage = createMockStorage();

    saveDraft({
      answers: { p1: 'x' },
      currentStepIndex: 0,
      tiemposPorPregunta: {},
      inicioEncuesta: '2026-11-02T10:30:00.000Z',
      tipo: 'compradores',
      storage,
    });

    const raw = storage.getItem(getDraftKey('compradores'));
    const parsed = JSON.parse(raw);
    expect(parsed.inicioEncuesta).toBe('2026-11-02T10:30:00.000Z');
  });

  it('wraps errors in try/catch (does not throw)', () => {
    const badStorage = {
      setItem: () => {
        throw new Error('Storage full');
      },
      getItem: () => null,
      removeItem: () => {},
    };

    // Should not throw
    expect(() => {
      saveDraft({
        answers: { p1: 'x' },
        currentStepIndex: 0,
        tiemposPorPregunta: {},
        inicioEncuesta: new Date(),
        tipo: 'compradores',
        storage: badStorage,
      });
    }).not.toThrow();
  });
});

// ================================================================
// loadDraft()
// ================================================================

describe('loadDraft', () => {
  it('returns saved draft data', () => {
    const storage = createMockStorage();
    const answers = { p1: 'test', p2: ['a', 'b'] };

    saveDraft({
      answers,
      currentStepIndex: 5,
      tiemposPorPregunta: { p1: 8, p2: 3 },
      inicioEncuesta: new Date('2026-11-02T10:00:00.000Z'),
      tipo: 'compradores',
      storage,
    });

    const draft = loadDraft('compradores', storage);
    expect(draft).not.toBeNull();
    expect(draft.answers).toEqual(answers);
    expect(draft.currentStepIndex).toBe(5);
    expect(draft.tiemposPorPregunta).toEqual({ p1: 8, p2: 3 });
    expect(draft.inicioEncuesta instanceof Date).toBe(true);
    expect(draft.savedAt instanceof Date).toBe(true);
  });

  it('restores Date objects from ISO strings', () => {
    const storage = createMockStorage();

    saveDraft({
      answers: { p1: 'x' },
      currentStepIndex: 0,
      tiemposPorPregunta: {},
      inicioEncuesta: new Date('2026-11-02T10:00:00.000Z'),
      tipo: 'compradores',
      storage,
    });

    const draft = loadDraft('compradores', storage);
    expect(draft.inicioEncuesta.toISOString()).toBe('2026-11-02T10:00:00.000Z');
  });

  it('returns null when no draft exists', () => {
    const storage = createMockStorage();
    const draft = loadDraft('compradores', storage);
    expect(draft).toBeNull();
  });

  it('returns null for corrupt JSON', () => {
    const storage = createMockStorage();
    storage.setItem(getDraftKey('compradores'), '{invalid json}');

    const draft = loadDraft('compradores', storage);
    expect(draft).toBeNull();
  });

  it('cleans up corrupt draft from storage', () => {
    const storage = createMockStorage();
    storage.setItem(getDraftKey('compradores'), '{invalid json}');

    loadDraft('compradores', storage);
    expect(storage.getItem(getDraftKey('compradores'))).toBeNull();
  });

  it('returns null if answers is missing', () => {
    const storage = createMockStorage();
    storage.setItem(
      getDraftKey('compradores'),
      JSON.stringify({
        currentStepIndex: 5,
        savedAt: new Date().toISOString(),
      })
    );

    const draft = loadDraft('compradores', storage);
    expect(draft).toBeNull();
  });

  it('returns null if answers is not an object', () => {
    const storage = createMockStorage();
    storage.setItem(
      getDraftKey('compradores'),
      JSON.stringify({
        answers: 'not an object',
        currentStepIndex: 5,
      })
    );

    const draft = loadDraft('compradores', storage);
    expect(draft).toBeNull();
  });
});

// ================================================================
// clearDraft()
// ================================================================

describe('clearDraft', () => {
  it('removes the draft from storage', () => {
    const storage = createMockStorage();

    saveDraft({
      answers: { p1: 'test' },
      currentStepIndex: 0,
      tiemposPorPregunta: {},
      inicioEncuesta: new Date(),
      tipo: 'compradores',
      storage,
    });

    expect(storage.getItem(getDraftKey('compradores'))).toBeDefined();

    clearDraft('compradores', storage);
    expect(storage.getItem(getDraftKey('compradores'))).toBeNull();
  });

  it('does not throw if key does not exist', () => {
    const storage = createMockStorage();
    expect(() => clearDraft('compradores', storage)).not.toThrow();
  });

  it('does not affect drafts of other types', () => {
    const storage = createMockStorage();

    saveDraft({
      answers: { p1: 'test' },
      currentStepIndex: 0,
      tiemposPorPregunta: {},
      inicioEncuesta: new Date(),
      tipo: 'compradores',
      storage,
    });

    saveDraft({
      answers: { p1: 'seller test' },
      currentStepIndex: 0,
      tiemposPorPregunta: {},
      inicioEncuesta: new Date(),
      tipo: 'vendedores',
      storage,
    });

    clearDraft('compradores', storage);

    // Vendedores draft should still exist
    const vendedoresDraft = loadDraft('vendedores', storage);
    expect(vendedoresDraft).not.toBeNull();
    expect(vendedoresDraft.answers.p1).toBe('seller test');
  });

  it('wraps errors in try/catch (does not throw)', () => {
    const badStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {
        throw new Error('Cannot remove');
      },
    };

    expect(() => clearDraft('compradores', badStorage)).not.toThrow();
  });
});

// ================================================================
// Cross-type isolation
// ================================================================

describe('Cross-type isolation', () => {
  it('compradores draft does not interfere with vendedores draft', () => {
    const storage = createMockStorage();

    saveDraft({
      answers: { p1: 'comprador answer' },
      currentStepIndex: 3,
      tiemposPorPregunta: { p1: 5 },
      inicioEncuesta: new Date('2026-11-02T10:00:00.000Z'),
      tipo: 'compradores',
      storage,
    });

    saveDraft({
      answers: { p1: 'vendedor answer' },
      currentStepIndex: 7,
      tiemposPorPregunta: { p1: 10 },
      inicioEncuesta: new Date('2026-11-02T11:00:00.000Z'),
      tipo: 'vendedores',
      storage,
    });

    const compradoresDraft = loadDraft('compradores', storage);
    const vendedoresDraft = loadDraft('vendedores', storage);

    expect(compradoresDraft.answers.p1).toBe('comprador answer');
    expect(compradoresDraft.currentStepIndex).toBe(3);

    expect(vendedoresDraft.answers.p1).toBe('vendedor answer');
    expect(vendedoresDraft.currentStepIndex).toBe(7);

    // Clear one, check the other survives
    clearDraft('compradores', storage);
    expect(loadDraft('compradores', storage)).toBeNull();
    expect(loadDraft('vendedores', storage)).not.toBeNull();
  });
});
