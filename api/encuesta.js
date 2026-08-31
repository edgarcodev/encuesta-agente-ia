export default async function handler(req, res) {
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Obtener datos del body
  const { datos, token } = req.body;

  // 1. Validar token simple (nonce) - lo generamos en el cliente
  if (!token || token !== process.env.SECRET_NONCE) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  // 2. (Opcional) Rate limiting básico por IP
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  // Aquí podrías implementar un contador en memoria o usar Redis/Vercel KV

  // 3. Validar que los datos tengan al menos algunas claves (evitar spam vacío)
  if (!datos || typeof datos !== 'object' || Object.keys(datos).length < 3) {
    return res.status(400).json({ error: 'Datos insuficientes' });
  }

  // 4. Insertar en Supabase usando la clave de servicio (NUNCA expuesta al cliente)
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

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
