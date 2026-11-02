import { describe, it, expect, vi } from 'vitest';
import { buildSendPayload, buildRequestBody, handleApiResponse, resolveNonce, sendSurveyResponse } from '../../lib/envio.js';

// ================================================================
// buildSendPayload()
// ================================================================

describe('buildSendPayload', () => {
  const answers = {
    p1: 'Alimentos y bebidas',
    p2: 'Varias veces por semana',
    p3: '', // should be filtered out
    p4: null, // should be filtered out
  };

  const metadata = {
    fuente: 'Facebook',
    dispositivo: 'celular',
    inicio: new Date('2026-01-01T10:00:00.000Z'),
    fin: new Date('2026-01-01T10:05:30.000Z'),
    tiempos_por_pregunta: { p1: 5, p2: 10 },
    conexion: { effectiveType: '4g' },
    navegador: 'Mozilla/5.0',
    plataforma: 'linux'
  };

  const geo = {
    ip: '192.168.1.1',
    ciudad: 'Lima',
    region: 'Lima',
    pais: 'Peru',
    lat: -12.0464,
    lon: -77.0428
  };

  describe('with allowMetadata = true', () => {
    it('includes _metadata with full data and _geo when provided', () => {
      const result = buildSendPayload(answers, true, metadata, geo, '2026-01-01T10:00:00.000Z');

      expect(result.p1).toBe('Alimentos y bebidas');
      expect(result.p2).toBe('Varias veces por semana');
      expect(result.p3).toBeUndefined();
      expect(result.p4).toBeUndefined();
      expect(result._metadata).toBeDefined();
      expect(result._metadata.fuente).toBe('Facebook');
      expect(result._metadata.dispositivo).toBe('celular');
      expect(result._metadata.tiempo_total_segundos).toBe(330);
      expect(result._metadata.tiempos_por_pregunta).toEqual({ p1: 5, p2: 10 });
      expect(result._metadata.navegador).toBe('Mozilla/5.0');
      expect(result._geo).toEqual(geo);
    });

    it('does not include _geo when geo is null', () => {
      const result = buildSendPayload(answers, true, metadata, null, '2026-01-01T10:00:00.000Z');
      expect(result._geo).toBeUndefined();
    });

    it('calculates tiempo_total_segundos correctly', () => {
      const result = buildSendPayload(
        { p1: 'x' }, true, metadata, null,
        '2026-01-01T10:00:00.000Z'
      );
      expect(result._metadata.tiempo_total_segundos).toBe(330);
    });
  });

  describe('with allowMetadata = false', () => {
    it('only includes tiempo_total_segundos in _metadata', () => {
      const result = buildSendPayload(answers, false, metadata, geo, '2026-01-01T10:00:00.000Z');

      expect(result._metadata).toEqual({ tiempo_total_segundos: 330 });
      expect(result._geo).toBeUndefined();
      // answers still included
      expect(result.p1).toBe('Alimentos y bebidas');
    });

    it('excludes empty and null answers', () => {
      const result = buildSendPayload(answers, false, metadata, geo, '2026-01-01T10:00:00.000Z');
      expect(result.p3).toBeUndefined();
      expect(result.p4).toBeUndefined();
    });
  });
});

// ================================================================
// buildRequestBody()
// ================================================================

describe('buildRequestBody', () => {
  it('returns valid JSON with all fields', () => {
    const data = { p1: 'test', _metadata: { tiempo_total_segundos: 60 } };
    const body = buildRequestBody(data, 'abc123', 'compradores');
    const parsed = JSON.parse(body);

    expect(parsed.datos).toEqual(data);
    expect(parsed.token).toBe('abc123');
    expect(parsed.tipo_encuesta).toBe('compradores');
  });

  it('serializes nested objects correctly', () => {
    const data = { p1: ['a', 'b'], _geo: { city: 'Lima' } };
    const body = buildRequestBody(data, 'nonce', 'vendedores');
    const parsed = JSON.parse(body);

    expect(parsed.datos.p1).toEqual(['a', 'b']);
    expect(parsed.datos._geo.city).toBe('Lima');
  });
});

// ================================================================
// handleApiResponse()
// ================================================================

describe('handleApiResponse', () => {
  it('returns parsed JSON on success', async () => {
    const res = {
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ inserted: true }))
    };
    const result = await handleApiResponse(res);
    expect(result).toEqual({ inserted: true });
  });

  it('returns {} on empty response body', async () => {
    const res = { ok: true, text: () => Promise.resolve('') };
    const result = await handleApiResponse(res);
    expect(result).toEqual({});
  });

  it('returns { success: true } on non-JSON response', async () => {
    const res = { ok: true, text: () => Promise.resolve('OK') };
    const result = await handleApiResponse(res);
    expect(result).toEqual({ success: true });
  });

  it('throws Error on 429 response', async () => {
    const res = {
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: () => Promise.resolve(JSON.stringify({ error: 'Rate limit exceeded' }))
    };
    await expect(handleApiResponse(res)).rejects.toThrow('Rate limit exceeded');
  });

  it('throws Error on 500 response with fallback message', async () => {
    const res = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: () => Promise.resolve('Server crashed')
    };
    await expect(handleApiResponse(res)).rejects.toThrow('Error 500: Server crashed');
  });

  it('throws Error with status when no JSON error field', async () => {
    const res = {
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: () => Promise.resolve(JSON.stringify({}))
    };
    await expect(handleApiResponse(res)).rejects.toThrow('Error 403');
  });
});

// ================================================================
// resolveNonce()
// ================================================================

describe('resolveNonce', () => {
  it('returns NONCE when no NONCE_KEY', () => {
    const config = { NONCE: 'fixed123' };
    const mockStorage = { getItem: () => null };
    expect(resolveNonce(config, mockStorage)).toBe('fixed123');
  });

  it('returns value from sessionStorage when NONCE_KEY exists', () => {
    const config = { NONCE_KEY: 'nonce_key', NONCE: 'fallback' };
    const mockStorage = { getItem: (key) => key === 'nonce_key' ? 'dynamic456' : null };
    expect(resolveNonce(config, mockStorage)).toBe('dynamic456');
  });

  it('returns empty string when NONCE_KEY is not found in sessionStorage', () => {
    const config = { NONCE_KEY: 'missing_key', NONCE: 'fallback' };
    const mockStorage = { getItem: () => null };
    expect(resolveNonce(config, mockStorage)).toBe('');
  });

  it('returns empty string when no NONCE or NONCE_KEY', () => {
    const config = {};
    const mockStorage = { getItem: () => null };
    expect(resolveNonce(config, mockStorage)).toBe('');
  });
});

// ================================================================
// sendSurveyResponse()
// ================================================================

describe('sendSurveyResponse', () => {
  const answers = { p1: 'test answer', p2: 'another' };
  const metadata = {
    fuente: 'directo',
    dispositivo: 'celular',
    inicio: new Date('2026-01-01T10:00:00.000Z'),
    fin: new Date('2026-01-01T10:05:00.000Z'),
    tiempos_por_pregunta: {},
    conexion: {},
    navegador: 'test',
    plataforma: 'test'
  };
  const geo = { ciudad: 'Lima' };
  const encuestaActiva = {
    tipo: 'compradores',
    endpoint: '/api/encuesta',
    STORAGE_KEY: 'test_storage_key'
  };

  function createMockFetch(responseOk, responseBody, responseStatus) {
    return vi.fn().mockResolvedValue({
      ok: responseOk,
      status: responseStatus || 200,
      statusText: responseOk ? 'OK' : 'Error',
      text: () => Promise.resolve(typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody))
    });
  }

  function createMockLocalStorage() {
    const store = {};
    return {
      getItem: (key) => store[key] || null,
      setItem: (key, val) => { store[key] = val; },
      _store: store
    };
  }

  it('sends correct payload with allowMetadata = true', async () => {
    const mockFetch = createMockFetch(true, { inserted: true });
    const mockStorage = createMockLocalStorage();

    const result = await sendSurveyResponse({
      answers,
      allowMetadata: true,
      metadata,
      geo,
      startTime: Date.parse('2026-01-01T10:00:00.000Z'),
      encuestaActiva,
      nonce: 'test_nonce',
      fetchFn: mockFetch,
      localStorage: mockStorage
    });

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe('/api/encuesta');
    expect(callArgs[1].method).toBe('POST');

    const body = JSON.parse(callArgs[1].body);
    expect(body.datos._metadata).toBeDefined();
    expect(body.datos._metadata.fuente).toBe('directo');
    expect(body.datos._geo).toEqual({ ciudad: 'Lima' });
    expect(body.token).toBe('test_nonce');
    expect(body.tipo_encuesta).toBe('compradores');
  });

  it('sends minimal payload with allowMetadata = false', async () => {
    const mockFetch = createMockFetch(true, {});
    const mockStorage = createMockLocalStorage();

    await sendSurveyResponse({
      answers,
      allowMetadata: false,
      metadata,
      geo,
      startTime: Date.parse('2026-01-01T10:00:00.000Z'),
      encuestaActiva,
      nonce: 'test_nonce',
      fetchFn: mockFetch,
      localStorage: mockStorage
    });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.datos._metadata).toEqual({ tiempo_total_segundos: 300 });
    expect(body.datos._geo).toBeUndefined();
  });

  it('writes to localStorage on success', async () => {
    const mockFetch = createMockFetch(true, {});
    const mockStorage = createMockLocalStorage();

    await sendSurveyResponse({
      answers,
      allowMetadata: true,
      metadata,
      geo: null,
      startTime: Date.now(),
      encuestaActiva,
      nonce: 'test',
      fetchFn: mockFetch,
      localStorage: mockStorage
    });

    expect(mockStorage._store['test_storage_key']).toBe('true');
  });

  it('returns success: false on API error', async () => {
    const mockFetch = createMockFetch(false, { error: 'Rate limit exceeded' }, 429);
    const mockStorage = createMockLocalStorage();

    const result = await sendSurveyResponse({
      answers,
      allowMetadata: true,
      metadata,
      geo,
      startTime: Date.now(),
      encuestaActiva,
      nonce: 'test',
      fetchFn: mockFetch,
      localStorage: mockStorage
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Rate limit exceeded');
    // No localStorage write on failure
    expect(mockStorage._store['test_storage_key']).toBeUndefined();
  });

  it('returns success: false on network error', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const mockStorage = createMockLocalStorage();

    const result = await sendSurveyResponse({
      answers,
      allowMetadata: true,
      metadata,
      geo,
      startTime: Date.now(),
      encuestaActiva,
      nonce: 'test',
      fetchFn: mockFetch,
      localStorage: mockStorage
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('returns data from successful response', async () => {
    const mockFetch = createMockFetch(true, { id: 42, inserted: true });
    const mockStorage = createMockLocalStorage();

    const result = await sendSurveyResponse({
      answers,
      allowMetadata: true,
      metadata,
      geo,
      startTime: Date.now(),
      encuestaActiva,
      nonce: 'test',
      fetchFn: mockFetch,
      localStorage: mockStorage
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 42, inserted: true });
  });
});
