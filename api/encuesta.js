export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { datos, token } = req.body;

  if (!token || typeof token !== 'string' || token.length < 20 || token.length > 50) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  if (!datos || typeof datos !== 'object' || Object.keys(datos).length < 10) {
    return res.status(400).json({ error: 'Datos insuficientes' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Variables de entorno faltantes');
    return res.status(500).json({ error: 'Configuración del servidor incompleta' });
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
