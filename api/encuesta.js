const RATE_LIMIT_MAX = 5;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { datos, token } = req.body;

  // IP del cliente: x-real-ip (la pone Vercel, no spoofeable por el cliente) →
  // primera IP de x-forwarded-for → 'unknown'. Nunca se deja el endpoint sin contar.
  const ip =
    String(req.headers['x-real-ip'] || '').trim() ||
    String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    'unknown';

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Variables de entorno faltantes');
    return res.status(500).json({ error: 'Configuración del servidor incompleta' });
  }

  // Rate limit por IP (SPEC 03): se cuenta ANTES de validar token/datos, así que
  // un ataque de fuerza bruta contra el token también gasta cuota.
  // Fail open: si el RPC falla (caída de Supabase), se sigue adelante; el gate
  // real sigue siendo SECRET_NONCE.
  try {
    const rlResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_rate_limit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ p_ip: ip })
    });

    if (rlResponse.ok) {
      const { count, retry_after } = await rlResponse.json();
      if (count > RATE_LIMIT_MAX) {
        res.setHeader('Retry-After', String(retry_after));
        return res.status(429).json({
          error: 'Demasiados envíos desde esta conexión. Inténtalo de nuevo en unos minutos.'
        });
      }
    } else {
      console.error('Rate limit RPC falló:', rlResponse.status);
    }
  } catch (error) {
    console.error('Rate limit RPC error:', error);
  }

  const SECRET_NONCE = process.env.SECRET_NONCE;
  if (!SECRET_NONCE || typeof SECRET_NONCE !== 'string') {
    console.error('Variable de entorno faltante: SECRET_NONCE');
    return res.status(500).json({ error: 'Configuración del servidor incompleta' });
  }

  if (!token || typeof token !== 'string' || token !== SECRET_NONCE) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  if (!datos || typeof datos !== 'object' || Object.keys(datos).length < 10) {
    return res.status(400).json({ error: 'Datos insuficientes' });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/respuestas_encuesta`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ datos })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase error: ${response.status} - ${errorText}`);
    }

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error en proxy:', error);
    return res.status(500).json({ error: 'Error al guardar la encuesta' });
  }
}
