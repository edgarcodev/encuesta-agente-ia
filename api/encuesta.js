export default async function handler(req, res) {
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { datos, token } = req.body;

  // Validar token: debe ser un string de entre 20 y 50 caracteres (generado por el cliente)
  if (!token || typeof token !== 'string' || token.length < 20 || token.length > 50) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  // Validar datos mínimos (evitar spam vacío)
  if (!datos || typeof datos !== 'object' || Object.keys(datos).length < 3) {
    return res.status(400).json({ error: 'Datos insuficientes' });
  }

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
