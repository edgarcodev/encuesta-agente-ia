import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler from '../../api/encuesta.js';

// ================================================================
// Mock setup
// ================================================================

// Valid NONCE from the real app
const VALID_TOKEN = 'f8fc62c3199a7c297b576ac9aadb9a52';

// Valid answers (10+ keys to pass the length check)
function validAnswers() {
  const a = {};
  for (let i = 1; i <= 12; i++) a[`p${i}`] = `answer ${i}`;
  return a;
}

function mockRes(extra = {}) {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
    ...extra
  };
  return res;
}

function mockReq(overrides = {}) {
  const defaults = {
    method: 'POST',
    body: {
      datos: validAnswers(),
      token: VALID_TOKEN,
      tipo_encuesta: 'compradores'
    },
    headers: {
      'x-real-ip': '192.168.1.100',
      'x-forwarded-for': '192.168.1.100'
    }
  };
  return { ...defaults, ...overrides };
}

function createMockApi(rlOk, rlBody, insertOk, insertStatus) {
  const calls = [];

  const fn = vi.fn(async (url, options) => {
    calls.push({ url, options });
    if (url.includes('rpc/increment_rate_limit')) {
      return {
        ok: rlOk,
        status: rlOk ? 200 : 500,
        json: () => Promise.resolve(rlBody || { count: 1, retry_after: 60 })
      };
    }
    if (url.includes('respuestas_encuesta')) {
      return {
        ok: insertOk,
        status: insertStatus || (insertOk ? 201 : 500),
        text: () => Promise.resolve(insertOk ? '{"inserted": true}' : 'Supabase error')
      };
    }
    return { ok: false, status: 404, text: () => Promise.resolve('') };
  });

  return { fn, calls };
}

// ================================================================
// Tests
// ================================================================

describe('api/encuesta.js', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.stubEnv('SECRET_NONCE', VALID_TOKEN);
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_KEY', 'test-service-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  // ---- Method validation ----

  it('rejects non-POST methods with 405', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Método no permitido' });
  });

  // ---- Valid token / successful submission ----

  it('accepts valid token and saves with 201', async () => {
    const { fn: fetchFn } = createMockApi(true, { count: 1, retry_after: 60 }, true, 201);
    globalThis.fetch = fetchFn;

    const req = mockReq();
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ success: true });

    // Verify insert call
    const insertCall = fetchFn.mock.calls.find(c => c[0].includes('respuestas_encuesta'));
    expect(insertCall).toBeDefined();
    const body = JSON.parse(insertCall[1].body);
    expect(body.datos.p1).toBe('answer 1');
    expect(body.tipo_encuesta).toBe('compradores');
  });

  // ---- Token validation ----

  it('rejects invalid token with 401', async () => {
    const { fn: fetchFn } = createMockApi(true, { count: 1, retry_after: 60 }, false, 500);
    globalThis.fetch = fetchFn;

    const req = mockReq({ body: { datos: validAnswers(), token: 'wrong_token', tipo_encuesta: 'compradores' } });
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
    // No insert attempted
    const insertCall = fetchFn.mock.calls.find(c => c[0].includes('respuestas_encuesta'));
    expect(insertCall).toBeUndefined();
  });

  it('rejects missing token with 401', async () => {
    const { fn: fetchFn } = createMockApi(true, { count: 1, retry_after: 60 }, false, 500);
    globalThis.fetch = fetchFn;

    const req = mockReq({ body: { datos: validAnswers(), token: undefined, tipo_encuesta: 'compradores' } });
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido' });
  });

  // ---- Rate limiting ----

  it('returns 429 when rate limit exceeded (count > 5)', async () => {
    const { fn: fetchFn } = createMockApi(true, { count: 6, retry_after: 120 }, false, 500);
    globalThis.fetch = fetchFn;

    const req = mockReq();
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Demasiados envíos desde esta conexión. Inténtalo de nuevo en unos minutos.'
    });
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '120');
    // No insert attempted
    const insertCall = fetchFn.mock.calls.find(c => c[0].includes('respuestas_encuesta'));
    expect(insertCall).toBeUndefined();
  });

  it('continues when rate limit is within bounds (count <= 5)', async () => {
    const { fn: fetchFn } = createMockApi(true, { count: 3, retry_after: 60 }, true, 201);
    globalThis.fetch = fetchFn;

    const req = mockReq();
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('continues when rate limit RPC fails (fail open)', async () => {
    const { fn: fetchFn } = createMockApi(false, null, true, 201);
    globalThis.fetch = fetchFn;

    const req = mockReq();
    const res = mockRes();
    await handler(req, res);

    // Still processes the request
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('continues when rate limit RPC throws (fail open)', async () => {
    const throwFn = vi.fn(async (url) => {
      if (url.includes('rpc/increment_rate_limit')) throw new Error('Network error');
      return { ok: true, status: 201, text: () => Promise.resolve('') };
    });
    globalThis.fetch = throwFn;

    const req = mockReq();
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  // ---- Payload validation ----

  it('rejects when datos has fewer than 10 keys', async () => {
    const { fn: fetchFn } = createMockApi(true, { count: 1, retry_after: 60 }, false, 500);
    globalThis.fetch = fetchFn;

    const req = mockReq({ body: { datos: { p1: 'a', p2: 'b' }, token: VALID_TOKEN, tipo_encuesta: 'compradores' } });
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Datos insuficientes' });
  });

  it('rejects when datos is missing', async () => {
    const { fn: fetchFn } = createMockApi(true, { count: 1, retry_after: 60 }, false, 500);
    globalThis.fetch = fetchFn;

    const req = mockReq({ body: { token: VALID_TOKEN, tipo_encuesta: 'compradores' } });
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Datos insuficientes' });
  });

  it('rejects when datos is not an object', async () => {
    const { fn: fetchFn } = createMockApi(true, { count: 1, retry_after: 60 }, false, 500);
    globalThis.fetch = fetchFn;

    const req = mockReq({ body: { datos: 'not an object', token: VALID_TOKEN, tipo_encuesta: 'compradores' } });
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  // ---- tipo_encuesta validation ----

  it('accepts null tipo_encuesta', async () => {
    const { fn: fetchFn } = createMockApi(true, { count: 1, retry_after: 60 }, true, 201);
    globalThis.fetch = fetchFn;

    const req = mockReq({ body: { datos: validAnswers(), token: VALID_TOKEN, tipo_encuesta: null } });
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const insertCall = fetchFn.mock.calls.find(c => c[0].includes('respuestas_encuesta'));
    const body = JSON.parse(insertCall[1].body);
    expect(body.tipo_encuesta).toBeNull();
  });

  it('rejects invalid tipo_encuesta with 400', async () => {
    const { fn: fetchFn } = createMockApi(true, { count: 1, retry_after: 60 }, false, 500);
    globalThis.fetch = fetchFn;

    const req = mockReq({ body: { datos: validAnswers(), token: VALID_TOKEN, tipo_encuesta: 'invalido' } });
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'tipo_encuesta inválido' });
  });

  it('accepts valid tipo_encuesta "vendedores"', async () => {
    const { fn: fetchFn } = createMockApi(true, { count: 1, retry_after: 60 }, true, 201);
    globalThis.fetch = fetchFn;

    const req = mockReq({ body: { datos: validAnswers(), token: VALID_TOKEN, tipo_encuesta: 'vendedores' } });
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const insertCall = fetchFn.mock.calls.find(c => c[0].includes('respuestas_encuesta'));
    const body = JSON.parse(insertCall[1].body);
    expect(body.tipo_encuesta).toBe('vendedores');
  });

  // ---- IP extraction ----

  it('extracts IP from x-real-ip', async () => {
    const { fn: fetchFn, calls } = createMockApi(true, { count: 1, retry_after: 60 }, true, 201);
    globalThis.fetch = fetchFn;

    const req = mockReq({ headers: { 'x-real-ip': '10.0.0.5' } });
    const res = mockRes();
    await handler(req, res);

    const rlCall = calls.find(c => c.url.includes('rpc/increment_rate_limit'));
    expect(JSON.parse(rlCall.options.body)).toEqual({ p_ip: '10.0.0.5' });
  });

  it('extracts IP from x-forwarded-for fallback', async () => {
    const { fn: fetchFn, calls } = createMockApi(true, { count: 1, retry_after: 60 }, true, 201);
    globalThis.fetch = fetchFn;

    const req = mockReq({ headers: { 'x-forwarded-for': '10.0.0.5, 10.0.0.6' } });
    const res = mockRes();
    await handler(req, res);

    const rlCall = calls.find(c => c.url.includes('rpc/increment_rate_limit'));
    expect(JSON.parse(rlCall.options.body)).toEqual({ p_ip: '10.0.0.5' });
  });

  it('defaults IP to "unknown" when headers missing', async () => {
    const { fn: fetchFn, calls } = createMockApi(true, { count: 1, retry_after: 60 }, true, 201);
    globalThis.fetch = fetchFn;

    const req = mockReq({ headers: {} });
    const res = mockRes();
    await handler(req, res);

    const rlCall = calls.find(c => c.url.includes('rpc/increment_rate_limit'));
    expect(JSON.parse(rlCall.options.body)).toEqual({ p_ip: 'unknown' });
  });

  // ---- Supabase insert error ----

  it('returns 500 when Supabase insert fails', async () => {
    const { fn: fetchFn } = createMockApi(true, { count: 1, retry_after: 60 }, false, 500);
    globalThis.fetch = fetchFn;

    const req = mockReq();
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error al guardar la encuesta' });
  });

  // ---- Missing environment variables ----

  it('returns 500 when SUPABASE_URL is missing', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_KEY', 'key');
    vi.stubEnv('SECRET_NONCE', VALID_TOKEN);

    const req = mockReq();
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns 500 when SUPABASE_SERVICE_KEY is missing', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_KEY', '');
    vi.stubEnv('SECRET_NONCE', VALID_TOKEN);

    const req = mockReq();
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns 500 when SECRET_NONCE is missing', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_KEY', 'key');
    vi.stubEnv('SECRET_NONCE', '');

    const req = mockReq();
    const res = mockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ---- Headers passed to Supabase ----

  it('sends correct auth headers to Supabase', async () => {
    const { fn: fetchFn } = createMockApi(true, { count: 1, retry_after: 60 }, true, 201);
    globalThis.fetch = fetchFn;

    const req = mockReq();
    const res = mockRes();
    await handler(req, res);

    const insertCall = fetchFn.mock.calls.find(c => c[0].includes('respuestas_encuesta'));
    const headers = insertCall[1].headers;
    expect(headers['apikey']).toBe('test-service-key');
    expect(headers['Authorization']).toBe('Bearer test-service-key');
  });
});
