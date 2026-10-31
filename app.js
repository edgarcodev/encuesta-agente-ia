(function() {
    'use strict';

    // ================================================================
    // ENCUESTAS — cada tipo con sus preguntas, título, color, etc.
    // ================================================================

    function opts(arr) { return arr.map(label => ({ label, value: label })); }

    const peruLocalidades = [
        'Lima Metropolitana / Callao', 'Arequipa', 'Trujillo',
        'Piura', 'Chiclayo', 'Cusco', 'Ica', 'Huaraz',
        'Chimbote', 'Nuevo Chimbote', 'Coishco', 'Santa',
        'Nepeña', 'Moro', 'Casma', 'Huarmey', 'Chao', 'Virú',
        'Otra localidad de Áncash',
        'Otra localidad de la costa peruana',
        'Otra localidad de la sierra peruana',
        'Otra localidad de la selva peruana',
        'Principalmente compro por Internet'
    ];

    const ENCUESTAS = {};

    // ============================================================
    // COMPRADORES
    // ============================================================
    ENCUESTAS.compradores = {
        tipo: 'compradores',
        titulo: '📦 Investigación Comercial',
        endpoint: '/api/encuesta',
        color: '#3b82f6',
        STORAGE_KEY: 'megaremates_encuesta_enviada',
        NONCE: 'f8fc62c3199a7c297b576ac9aadb9a52',
        steps: []
    };

    // --- COMPRADORES: questions ---
    (function() {
        const s = ENCUESTAS.compradores.steps;

        s.push({ id: 'p1', question: '1. ¿Qué compras habitualmente? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Alimentos y bebidas','Ropa, calzado y accesorios','Productos para el hogar','Muebles','Tecnología y electrónica','Belleza y cuidado personal','Productos de salud','Productos para niños','Construcción y ferretería','Herramientas y maquinaria','Productos para vehículos','Productos agrícolas/agropecuarios','Productos para mascotas','Productos para empresas','Servicios profesionales','Educación/capacitación','Transporte/logística','Entretenimiento/eventos','Productos digitales','Otros']), allowOther: true, condition: () => true });
        s.push({ id: 'p2', question: '2. ¿Con qué frecuencia realizas compras?', type: 'radio', options: opts(['Varias veces por semana','Aproximadamente una vez por semana','Varias veces al mes','Aproximadamente una vez al mes','Cada pocos meses','Principalmente cuando surge una necesidad','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p3', question: '3. ¿Dónde realizas normalmente tus compras? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Tiendas físicas','Mercados','Ferias','Centros comerciales','Comercios de barrio','Venta directa','Facebook','Facebook Marketplace','WhatsApp','Instagram','TikTok','Página web','Marketplace/plataforma especializada','Aplicaciones móviles','Recomendaciones de conocidos','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p4', question: '4. Cuando necesitas comprar algo, ¿cómo lo buscas normalmente? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Pregunto a familiares/amigos/conocidos','Busco en Google','Busco en Facebook','Busco en Marketplace','Busco en Instagram','Busco en TikTok','Busco en WhatsApp','Busco en una tienda o marketplace específico','Voy directamente a una tienda física','Pregunto a vendedores','Comparo en varios lugares','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p5', question: '5. ¿Qué haces normalmente antes de decidir una compra? (hasta 4)', type: 'checkbox', maxSelections: 4, options: opts(['Comparo precios','Comparo productos','Leo opiniones/comentarios','Pregunto a otras personas','Pregunto directamente al vendedor','Reviso fotografías/videos','Reviso características','Compruebo la reputación del vendedor','Busco promociones','Espero una oferta','Visito físicamente el lugar','Comparo opciones por Internet','Compro directamente sin comparar mucho','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p6', question: '6. Piensa en tu última compra importante. ¿Cómo encontraste finalmente lo que compraste? (respuesta abierta)', type: 'textarea', placeholder: 'Cuéntanos brevemente qué necesitabas, dónde buscaste y cómo elegiste...', condition: () => true });
        s.push({ id: 'p7', question: '7. ¿Qué importancia tiene el precio cuando decides una compra?', type: 'radio', options: opts(['Es el factor principal','Es muy importante, pero no es el único','Tiene importancia moderada','Tiene poca importancia','Depende del producto o servicio']), condition: () => true });
        s.push({ id: 'p8', question: '8. Cuando encuentras una oferta, descuento, liquidación, lote o precio especialmente bajo, ¿qué haces normalmente? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Compro inmediatamente si lo necesito','Comparo antes con otras opciones','Pregunto si el precio realmente es bueno','Compro más cantidad de la que pensaba','Compro para aprovechar y guardar','Compro para compartir con otras personas','Compro para revender','No suelo cambiar mi decisión por una oferta','Depende del producto','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p9', question: '9. ¿Has comprado alguna vez productos en liquidación, remate, lote, saldo, excedente o por cierre de negocio?', type: 'radio', options: opts(['Sí, frecuentemente','Sí, algunas veces','Sí, una vez','No','No estoy seguro/a de cómo se clasificaba la compra']), condition: () => true });
        s.push({ id: 'p9_motivo', question: '¿Qué te motivó principalmente a comprar de esa manera? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Precio','Cantidad','Oportunidad','Producto difícil de encontrar','Para uso personal','Para mi negocio','Para revender','Otro']), allowOther: true, condition: () => { const v = answers.p9; return v === 'Sí, frecuentemente' || v === 'Sí, algunas veces' || v === 'Sí, una vez'; } });
        s.push({ id: 'p10', question: '10. ¿Para quién o para qué realizas principalmente tus compras? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Para mí','Para mi hogar o familia','Para mis hijos u otras personas que dependen de mí','Para mi trabajo o actividad profesional','Para mi negocio','Para revender','Para producir o transformar otros productos','Para prestar un servicio','Para una institución, organización o empresa','Para otra persona','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p11', question: '11. ¿Qué condiciones influyen actualmente en la forma en que realizas tus compras? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Necesito ahorrar lo máximo posible','Tengo un presupuesto limitado o variable','Tengo poco tiempo disponible','Necesito comprar desde casa o a distancia','Tengo responsabilidades de cuidado de hijos','Tengo responsabilidades de cuidado de otros familiares','Necesito comprar cerca de donde vivo o trabajo','Tengo dificultades para desplazarme','Prefiero comprar cuando puedo pagar en efectivo','Prefiero pagar digitalmente','Necesito comparar varias opciones antes de decidir','Necesito comprar rápidamente cuando surge una necesidad','Ninguna de estas condiciones influye significativamente','Otra']), allowOther: true, condition: () => true });
        s.push({ id: 'p12', question: '12. ¿Qué necesitas saber o comprobar para confiar en un vendedor? (hasta 5)', type: 'checkbox', maxSelections: 5, options: opts(['Identidad del vendedor','Ubicación','Teléfono/WhatsApp','Opiniones de otros compradores','Historial/reputación','Fotografías reales','Información detallada del producto','Precio claro','Condiciones de venta','Garantía','Posibilidad de devolución','Comprobante de compra','Poder verlo presencialmente','Pago seguro','Referencias de otras personas','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p13', question: '13. ¿Has tenido alguna experiencia problemática al comprar? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Producto diferente de lo ofrecido','Producto defectuoso','Producto falsificado o de dudosa procedencia','Pago que resultó ser fraudulento','Vendedor que desapareció','No recibí el producto','Entrega tardía','Problema con una devolución','Problema con garantía','Información engañosa','Cuenta/perfil falso','Otro problema','No he tenido problemas importantes']), allowOther: true, condition: () => true });
        s.push({ id: 'p13_abierta', question: '¿Qué ocurrió y cómo lo resolviste? (opcional)', type: 'textarea', placeholder: 'Cuéntanos brevemente...', condition: () => { const v = answers.p13; if (!v || !Array.isArray(v)) return false; return !v.includes('No he tenido problemas importantes'); } });
        s.push({ id: 'p14', question: '14. ¿Cómo pagas normalmente tus compras? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Efectivo','Tarjeta de débito','Tarjeta de crédito','Transferencia bancaria','Billetera digital','Aplicación de pagos','Pago contraentrega','Crédito/fiado','Pago en cuotas','Separación con adelanto','PayPal u otro servicio internacional','Otro medio de pago local','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p15', question: '15. ¿Qué es lo más importante para ti al momento de pagar? (hasta 3)', type: 'checkbox', maxSelections: 3, options: opts(['Seguridad','Rapidez','Facilidad','Poder pagar en efectivo','Poder pagar digitalmente','No pagar comisiones elevadas','Poder pagar después','Poder pagar en cuotas','Tener comprobante','Poder reclamar si algo sale mal','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p16', question: '16. ¿Cómo recibes normalmente tus compras? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Las recojo personalmente','Me las entregan en mi domicilio','Me las entregan en mi trabajo','Las recojo en una tienda/punto de entrega','Uso delivery','Uso courier','El vendedor las envía por transporte interprovincial','Las recibo por correo/servicio postal','Depende de la compra','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p17', question: '17. ¿Qué problemas has tenido con la entrega de tus compras? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Demora','Costo elevado','Producto dañado','Producto perdido','Dirección incorrecta','Problemas de coordinación','No encontrar un horario conveniente','Problemas de seguridad','No poder recibir personalmente','Ninguno importante','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p18', question: '18. Cuando ocurre un imprevisto importante, ¿qué sucede normalmente con tus compras? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Las postergo','Busco otro proveedor/vendedor','Compro presencialmente','Compro por otro canal','Busco un producto sustituto','Compro en otra localidad','Cancelo la compra','Continúo normalmente','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p19', question: '19. ¿Qué situaciones han dificultado alguna vez tus compras? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Problemas de transporte','Clima o fenómenos naturales','Cortes de Internet','Cortes de electricidad','Falta de disponibilidad del producto','Incremento fuerte de precios','Problemas de seguridad','Problemas con plataformas digitales','Problemas con pagos','Falta de tiempo','Problemas de entrega','Ninguna importante','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p20', question: '20. Si mañana dejara de funcionar el principal canal digital que utilizas para encontrar productos o servicios, ¿qué harías? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Buscaría en otra plataforma','Buscaría en Google','Contactaría directamente a vendedores conocidos','Iría a tiendas físicas','Preguntaría a conocidos','Buscaría en redes sociales alternativas','Esperaría a que volviera a funcionar','Me resultaría muy difícil encontrar alternativas','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p21', question: '21. ¿En qué país realizas principalmente tus compras?', type: 'radio', options: opts(['Perú','Argentina','Bolivia','Brasil','Chile','Colombia','Costa Rica','Ecuador','El Salvador','España','Guatemala','Honduras','México','Nicaragua','Panamá','Paraguay','Portugal','República Dominicana','Uruguay','Venezuela','Otro país']), allowOther: true, condition: () => true });
        s.push({ id: 'p22', question: '22. ¿En qué localidad, ciudad o zona realizas principalmente tus compras?', getDefinition: () => { if (answers.p21 === 'Perú') { return { type: 'radio', hint: 'Selecciona la zona donde compras habitualmente.', options: opts([...peruLocalidades, 'Otra:']), allowOther: true }; } return { type: 'text', hint: 'Escribe el nombre de tu ciudad o localidad (fuera de Perú).', placeholder: 'Ej. Santiago, Bogotá, São Paulo, Madrid...' }; }, condition: () => true });
        s.push({ id: 'p23', question: '23. ¿En qué país realizas principalmente tu actividad laboral, comercial o profesional?', type: 'radio', options: opts(['En el mismo país donde realizo mis compras','En otro país','Actualmente no realizo una actividad laboral/comercial','Mi actividad se desarrolla principalmente por Internet','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p24', question: '24. ¿En qué localidad, ciudad o zona realizas principalmente esa actividad?', getDefinition: () => { const v = answers.p23; if (answers.p21 === 'Perú' && (v === 'En el mismo país donde realizo mis compras' || v === 'Mi actividad se desarrolla principalmente por Internet')) { return { type: 'radio', hint: 'Selecciona la zona donde realizas tu actividad.', options: opts([...peruLocalidades, 'Otra:']), allowOther: true }; } return { type: 'text', hint: 'Escribe la ciudad o localidad donde realizas tu actividad.', placeholder: 'Ej. Santiago, Bogotá, São Paulo, Madrid...' }; }, condition: () => answers.p23 !== 'Actualmente no realizo una actividad laboral/comercial' });
        s.push({ id: 'p25', question: '25. ¿Has comprado alguna vez productos o servicios de otro país?', type: 'radio', options: opts(['Sí, frecuentemente','Sí, algunas veces','Sí, una vez','No','No recuerdo']), condition: () => true });
        s.push({ id: 'p26', question: '26. ¿Qué te motivó principalmente a comprar en otro país? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Mejor precio','Producto que no encontraba localmente','Mayor variedad','Mejor calidad','Marca específica','Promoción/oferta','Recomendación','Producto especializado','Mayor confianza','Otro']), allowOther: true, condition: () => { const v = answers.p25; return v === 'Sí, frecuentemente' || v === 'Sí, algunas veces' || v === 'Sí, una vez'; } });
        s.push({ id: 'p27', question: '27. ¿Cuál ha sido el principal problema que has encontrado al comprar desde otro país? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Costo de envío','Tiempo de entrega','Aduanas/impuestos','Confianza en el vendedor','Devoluciones','Garantía','Formas de pago','Tipo de cambio','Idioma/comunicación','Producto diferente a lo esperado','Riesgo de fraude','No he tenido problemas importantes','Otro']), allowOther: true, condition: () => { const v = answers.p25; return v === 'Sí, frecuentemente' || v === 'Sí, algunas veces' || v === 'Sí, una vez'; } });
        s.push({ id: 'p28', question: '28. ¿En qué moneda realizas normalmente tus compras? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Moneda de mi país','Dólares estadounidenses (USD)','Euros (EUR)','Reales brasileños (BRL)','Otra moneda','Utilizo diferentes monedas según la compra']), allowOther: true, condition: () => true });
        s.push({ id: 'p29', question: '29. ¿En qué idioma prefieres recibir información y comunicarte con un vendedor?', type: 'radio', options: opts(['Español','Português','Inglés','Otro','Me es indiferente mientras pueda comprender la información']), allowOther: true, condition: () => true });
        s.push({ id: 'p30', question: '30. Cuando encuentras un producto que te interesa, ¿comprarías a un vendedor que está fuera de tu ciudad o país?', type: 'radio', options: opts(['Sí, ya lo hago actualmente','Sí, si el precio o beneficio lo justifica','Sí, si existe una forma segura de recibirlo','Sí, pero solamente para determinados productos','Prefiero comprar localmente','No estoy seguro/a']), condition: () => true });
        s.push({ id: 'p31', question: '31. Si pudieras mejorar una sola parte de tu experiencia actual de compra, ¿cuál escogerías? (respuesta abierta)', type: 'textarea', placeholder: 'Puede ser encontrar productos, comparar precios, confiar en vendedores, pagar, recibir compras...', condition: () => true });
        s.push({ id: 'p32', question: '32. ¿Cómo resuelves actualmente esa necesidad? (respuesta abierta)', type: 'textarea', placeholder: 'Cuéntanos cómo lo haces hoy...', condition: () => true });
        s.push({ id: 'p33', question: '33. ¿Qué tipo de oportunidad te interesaría encontrar con mayor frecuencia? (hasta 3)', type: 'checkbox', maxSelections: 3, options: opts(['Precios más bajos','Liquidaciones','Remates','Productos por lote','Compras grupales','Productos difíciles de encontrar','Productos nuevos','Productos usados en buen estado','Servicios a buen precio','Proveedores','Productos directamente de fabricantes','Productos directamente de productores','Comerciantes confiables','Ofertas de negocios locales','Oportunidades de otros lugares o ciudades','Oportunidades internacionales','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p34', question: '34. ¿Qué tendría que ofrecerte una nueva forma de comprar para que realmente te resultara útil? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Mejores precios','Mayor variedad','Vendedores confiables','Información clara','Productos auténticos/verificables','Comparación de opciones','Formas de pago variadas','Pago en efectivo','Pagos digitales','Entrega confiable','Posibilidad de recoger personalmente','Garantías claras','Devoluciones','Atención humana','Posibilidad de comprar por Internet y continuar presencialmente','Posibilidad de comprar localmente y también fuera de mi ciudad/país','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p35', question: '35. ¿Cuál de estas posibilidades te resultaría más útil? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Encontrar productos de diferentes vendedores en un mismo lugar','Encontrar oportunidades de liquidación o remate','Encontrar productos por lote','Encontrar ofertas de negocios cercanos','Encontrar productos de otras ciudades','Encontrar productos de otros países','Encontrar servicios','Comparar precios y condiciones','Encontrar vendedores confiables','Organizar compras grupales','Facilitar entrega o recojo','Facilitar diferentes formas de pago','Otra']), allowOther: true, condition: () => true });
        s.push({ id: 'p36', question: '36. ¿Qué te haría confiar en un servicio de este tipo? (hasta 3)', type: 'checkbox', maxSelections: 3, options: opts(['Vendedores identificables','Información verificable','Reputación comprobable','Protección frente a estafas','Precios transparentes','Atención humana','Posibilidad de trato presencial','Pago seguro','Posibilidad de pagar en efectivo','Garantías claras','Devoluciones','Entrega confiable','Bajo costo','Facilidad de uso','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p37', question: '37. ¿Te gustaría participar posteriormente en una entrevista o prueba relacionada con esta investigación?', type: 'radio', options: opts(['Sí','No','Tal vez']), condition: () => true });
        s.push({ id: 'p38', question: '38. ¿Por qué medio prefieres que te contactemos?', type: 'radio', options: opts(['WhatsApp','Llamada','Correo electrónico','Otro']), allowOther: true, condition: () => (answers.p37 === 'Sí' || answers.p37 === 'Tal vez') });
        s.push({ id: 'p39', question: '39. Datos de contacto (opcional):', type: 'text', placeholder: 'Ej. 987654321 o correo@ejemplo.com', condition: () => (answers.p37 === 'Sí' || answers.p37 === 'Tal vez') });
    })();

    // ============================================================
    // VENDEDORES
    // ============================================================
    ENCUESTAS.vendedores = {
        tipo: 'vendedores',
        titulo: '📦 Mega Remates · Vendedores',
        endpoint: '/api/encuesta',
        color: '#f97316',
        STORAGE_KEY: 'megaremates_encuesta_vendedores_enviada',
        NONCE_KEY: 'encuesta_nonce_vendedores',
        steps: []
    };

    // --- VENDEDORES: questions ---
    (function() {
        const s = ENCUESTAS.vendedores.steps;

        s.push({ id: 'p1', question: '1. ¿Qué vendes actualmente? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Productos físicos nuevos','Productos físicos usados','Productos fabricados por mí','Productos que compro para revender','Productos digitales','Servicios','Productos + servicios','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p2', question: '2. ¿Qué categorías vendes principalmente? (máximo 3)', type: 'checkbox', maxSelections: 3, options: opts(['Alimentos y bebidas','Ropa, calzado y accesorios','Hogar y muebles','Tecnología y electrónica','Belleza y cuidado personal','Salud','Construcción y ferretería','Maquinaria/equipos','Automotriz','Agricultura/agro','Productos para empresas','Educación/capacitación','Servicios profesionales','Transporte/logística','Inmobiliario','Joyería/metales/objetos de valor','Artesanía','Otros']), allowOther: true, condition: () => true });
        s.push({ id: 'p3', question: '3. ¿Desde dónde realizas principalmente tu actividad comercial? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Desde un local comercial','Desde mi vivienda','Desde un taller/oficina','Desde un puesto/mercado/feria','Desde la calle o venta ambulante','Desde un almacén','Sin ubicación física fija','Principalmente por Internet','Combinación de varios','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p4', question: '4. ¿Desde hace cuánto tiempo vendes?', type: 'radio', options: opts(['Menos de 3 meses','3–6 meses','7–12 meses','1–2 años','3–5 años','Más de 5 años']), condition: () => true });
        s.push({ id: 'p5', question: '5. ¿Por qué medios consigues actualmente la mayoría de tus clientes? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Facebook','Facebook Marketplace','WhatsApp','Instagram','TikTok','Página web propia','Google/Google Maps','Plataformas o marketplaces especializados','Local físico','Mercado/feria','Venta directa en calle','Recomendaciones de clientes','Amigos/familiares/conocidos','Vendedores/intermediarios','Publicidad física','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p6', question: '6. ¿Cuál de esos canales te genera actualmente más ventas?', type: 'radio', options: opts(['Facebook','Facebook Marketplace','WhatsApp','Instagram','TikTok','Página web propia','Google/Google Maps','Plataformas o marketplaces especializados','Local físico','Mercado/feria','Venta directa en calle','Recomendaciones de clientes','Amigos/familiares/conocidos','Vendedores/intermediarios','Publicidad física','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p7', question: '7. Piensa en una venta reciente que hayas conseguido por Internet. ¿Cómo llegó ese cliente hasta ti? (respuesta abierta)', type: 'textarea', placeholder: 'Describe el proceso...', condition: () => true });
        s.push({ id: 'p8', question: '8. Cuando alguien se interesa por lo que vendes, ¿qué ocurre normalmente? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Me escribe por WhatsApp','Me escribe por Messenger','Me llama','Comenta una publicación','Me pregunta por mensaje privado de otra red','Viene directamente al local','Nos encontramos presencialmente','Le envío catálogo/lista de precios','Le envío fotos o videos','Coordinamos una visita','Negociamos precio','Separamos el producto','Entrego directamente','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p9', question: '9. ¿Qué formas de pago utilizas actualmente? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Efectivo','Yape','Plin','Transferencia bancaria','Tarjeta','PayPal','Otra billetera digital','Contraentrega','Fiado/crédito directo','Pago por partes/cuotas','Separación con adelanto','Intercambio/barter','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p10', question: '10. Cuando vendes al crédito, fiado o en cuotas, ¿cómo lo manejas actualmente? (puedes seleccionar varias)', type: 'checkbox', options: opts(['No vendo al crédito','Confío en clientes conocidos','Anoto manualmente la deuda','Uso WhatsApp','Uso una hoja/cuaderno','Uso Excel/Google Sheets','Uso una aplicación','Solicito adelanto','Establezco fechas de pago','Cobro intereses','Utilizo algún tercero','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p10_abierta', question: '¿Qué es lo más difícil de vender al crédito o fiado? (respuesta abierta)', type: 'textarea', placeholder: 'Cuéntanos...', condition: () => { const val = answers.p10; if (!val || !Array.isArray(val)) return false; return !val.includes('No vendo al crédito'); } });
        s.push({ id: 'p11', question: '11. ¿Qué haces actualmente cuando tienes productos que no se venden? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Bajo el precio','Hago una promoción','Publico nuevamente','Lo ofrezco por otro canal','Lo agrupo con otros productos','Lo vendo por lote','Lo remato','Lo devuelvo al proveedor','Lo utilizo para otro propósito','Lo intercambio','Lo guardo hasta que aparezca comprador','Lo vendo a otro comerciante','Lo vendo a mayorista/intermediario','Lo termino perdiendo/deteriorando','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p12', question: '12. En los últimos 3 meses, ¿has tenido productos o mercadería que hayan permanecido demasiado tiempo sin venderse?', type: 'radio', options: opts(['Sí, frecuentemente','Sí, algunas veces','Sí, una vez','No','No manejo inventario']), condition: () => true });
        s.push({ id: 'p12_abierta', question: '¿Qué hiciste finalmente con esa mercadería? (respuesta abierta)', type: 'textarea', placeholder: 'Cuéntanos...', condition: () => { const val = answers.p12; return val && (val === 'Sí, frecuentemente' || val === 'Sí, algunas veces' || val === 'Sí, una vez'); } });
        s.push({ id: 'p13', question: '13. ¿Cuáles son actualmente tus principales dificultades para vender? (máximo 5)', type: 'checkbox', maxSelections: 5, options: opts(['Conseguir nuevos clientes','Conseguir clientes que realmente compren','Competencia','Precios de la competencia','Regateo/negociación','Publicidad','Alcance de mis publicaciones','Confianza del cliente','Clientes que no responden','Clientes que separan y no compran','Incumplimiento de pagos','Estafas/fraudes','Productos falsificados o imitaciones en el mercado','Devoluciones','Entregas','Transporte','Costos de envío','Abastecimiento','Falta de capital','Inventario que no rota','Seguridad','Conectividad/Internet','Falta de tiempo','Falta de personal','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p14', question: '14. De todos esos problemas, ¿cuál es el que más afecta actualmente a tu negocio?', type: 'radio', options: opts(['Conseguir nuevos clientes','Conseguir clientes que realmente compren','Competencia','Precios de la competencia','Regateo/negociación','Publicidad','Alcance de mis publicaciones','Confianza del cliente','Clientes que no responden','Clientes que separan y no compran','Incumplimiento de pagos','Estafas/fraudes','Productos falsificados o imitaciones en el mercado','Devoluciones','Entregas','Transporte','Costos de envío','Abastecimiento','Falta de capital','Inventario que no rota','Seguridad','Conectividad/Internet','Falta de tiempo','Falta de personal','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p14_abierta', question: '¿Por qué este problema es importante para ti? (respuesta abierta)', type: 'textarea', placeholder: 'Cuéntanos...', condition: () => true });
        s.push({ id: 'p15', question: '15. ¿Has tenido alguna experiencia problemática con un comprador o una venta durante el último año? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Comprador que no pagó','Comprobante/pago falso','Cliente que desapareció después de separar','Producto devuelto inesperadamente','Reclamo injustificado','Intento de estafa','Suplantación de identidad','Cuenta falsa','Problema durante la entrega','Robo/pérdida','Amenaza o situación de inseguridad','No he tenido problemas','Otro']), allowOther: true, condition: () => true });
        s.push({ id: 'p15_abierta', question: 'Si quieres, cuéntanos brevemente qué ocurrió y cómo lo resolviste. (opcional)', type: 'textarea', placeholder: 'Describe la situación...', condition: () => true });
        s.push({ id: 'p16', question: '16. ¿Ha cambiado durante el último año la forma en que entregas, cobras o atiendes a tus clientes por razones de seguridad o confianza?', type: 'radio', options: opts(['Sí, bastante','Sí, algo','No','No estoy seguro/a','Prefiero no responder']), condition: () => true });
        s.push({ id: 'p16_abierta', question: '¿Qué cambiaste? (respuesta abierta)', type: 'textarea', placeholder: 'Cuéntanos...', condition: () => { const val = answers.p16; return val && (val === 'Sí, bastante' || val === 'Sí, algo'); } });
        s.push({ id: 'p17', question: '17. Cuando ocurre un imprevisto importante, ¿qué parte de tu negocio se afecta primero? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Conseguir productos','Transporte','Entregas','Cobros','Comunicación con clientes','Internet/conectividad','Publicidad','Acceso al local','Personal','Capital/caja','Inventario','Otro','Normalmente puedo continuar sin grandes problemas']), allowOther: true, condition: () => true });
        s.push({ id: 'p18', question: '18. En los últimos 12 meses, ¿qué tipo de imprevistos han afectado tu actividad comercial? (puedes seleccionar varias)', type: 'checkbox', options: opts(['Problemas de transporte','Clima/inundaciones u otros fenómenos naturales','Cortes de Internet','Cortes de electricidad','Problemas de abastecimiento','Incremento fuerte de precios','Problemas de seguridad','Problemas con plataformas digitales','Problemas de pago/cobro','Falta de personal','Problemas familiares/personales','Otro','Ninguno importante']), allowOther: true, condition: () => true });
        s.push({ id: 'p19', question: '19. Cuando uno de esos problemas ocurre, ¿qué haces normalmente para continuar vendiendo? (respuesta abierta)', type: 'textarea', placeholder: 'Describe qué alternativa usas...', condition: () => true });
        s.push({ id: 'p20', question: '20. Si mañana dejaras de utilizar el principal canal digital que hoy te ayuda a vender, ¿qué ocurriría con tu negocio?', type: 'radio', options: opts(['Podría continuar casi igual','Perdería algunas ventas','Perdería muchas ventas','Una parte importante de mi negocio quedaría afectada','Prácticamente no podría vender','No depende de canales digitales','No estoy seguro/a']), condition: () => true });
        s.push({ id: 'p20_abierta', question: '¿Qué harías para continuar vendiendo? (respuesta abierta)', type: 'textarea', placeholder: 'Cuéntanos tu plan...', condition: () => true });
        s.push({ id: 'p21', question: '21. ¿En qué localidad o zona realizas principalmente tus ventas o actividad comercial?', type: 'radio', options: opts(['Lima Metropolitana / Callao','Arequipa','Trujillo','Piura','Chiclayo','Cusco','Ica','Huaraz','Chimbote','Nuevo Chimbote','Coishco','Santa','Nepeña','Moro','Casma','Huarmey','Chao','Virú','Otra ciudad/localidad de Áncash','Otra localidad de la costa','Otra localidad de la sierra','Otra localidad de la selva','Principalmente trabajo/comercializo por Internet','Otra:']), allowOther: true, condition: () => true });
        s.push({ id: 'p22', question: '22. ¿En qué localidad o zona se encuentran principalmente tus clientes?', type: 'radio', options: opts(['Lima Metropolitana / Callao','Arequipa','Trujillo','Piura','Chiclayo','Cusco','Ica','Huaraz','Chimbote','Nuevo Chimbote','Coishco','Santa','Nepeña','Moro','Casma','Huarmey','Chao','Virú','Otra ciudad/localidad de Áncash','Otra localidad de la costa','Otra localidad de la sierra','Otra localidad de la selva','Principalmente trabajo/comercializo por Internet','Otra:']), allowOther: true, condition: () => true });
        s.push({ id: 'p23', question: '23. Aproximadamente, ¿cuántas personas participan actualmente en tu actividad comercial?', type: 'radio', options: opts(['Solo yo','2 personas','3–5','6–10','11–20','Más de 20']), condition: () => true });
        s.push({ id: 'p24', question: '24. Aproximadamente, ¿cuántas ventas realizas en un mes normal?', type: 'radio', options: opts(['1–5','6–10','11–30','31–50','51–100','Más de 100','Es variable','Prefiero no responder']), condition: () => true });
        s.push({ id: 'p25', question: '25. Si pudieras resolver una sola parte de tu proceso actual de venta, ¿cuál escogerías? (respuesta abierta)', type: 'textarea', placeholder: 'Escribe cuál sería...', condition: () => true });
        s.push({ id: 'p26', question: '26. ¿Cómo resuelves actualmente esa necesidad? (respuesta abierta)', type: 'textarea', placeholder: 'Cuéntanos cómo lo haces...', condition: () => true });
        s.push({ id: 'p27', question: '27. ¿Qué tipo de ayuda externa te resultaría más útil para mejorar tus ventas? (máximo 3)', type: 'checkbox', maxSelections: 3, options: opts(['Encontrar nuevos clientes','Dar mayor visibilidad a mis productos','Encontrar compradores para mercadería que no rota','Encontrar proveedores','Comprar productos a mejores precios','Vender por lotes','Encontrar otros comerciantes con quienes negociar','Organizar pedidos','Gestionar entregas','Facilitar cobros','Generar confianza entre comprador y vendedor','Verificar productos o vendedores','Conseguir información de precios','Acceder a servicios profesionales','Acceder a financiamiento/crédito','Organizar compras grupales','Ninguna de las anteriores','Otra']), allowOther: true, condition: () => true });
        s.push({ id: 'p28', question: '28. Si existiera un servicio que reuniera algunas de esas oportunidades comerciales, ¿qué función te parecería más útil? (máximo 3)', type: 'checkbox', maxSelections: 3, options: opts(['Encontrar compradores','Publicar productos','Liquidar productos que no se venden','Encontrar proveedores','Comprar/vender por lotes','Encontrar servicios','Encontrar oportunidades de compra','Facilitar contacto entre comerciantes','Organizar compras grupales','Ayudar con entregas','Facilitar distintas formas de pago','Ayudar a verificar vendedores/productos','Otra']), allowOther: true, condition: () => true });
        s.push({ id: 'p29', question: '29. ¿Qué condición tendría que cumplir un servicio de este tipo para que confiaras en él? (máximo 3)', type: 'checkbox', maxSelections: 3, options: opts(['Precios transparentes','Vendedores identificables','Compradores identificables','Información real del producto','Sistema para reportar problemas','Reputación verificable','Protección frente a estafas','Posibilidad de trato presencial','Pago en efectivo','Pagos digitales','Buen servicio de atención','Entregas confiables','Garantías claras','Bajo costo','Facilidad de uso','Otra']), allowOther: true, condition: () => true });
        s.push({ id: 'p30', question: '30. ¿Te gustaría participar posteriormente en una entrevista o prueba relacionada con esta investigación?', type: 'radio', options: opts(['Sí','No','Tal vez']), condition: () => true });
        s.push({ id: 'p31', question: '31. ¿Por qué medio prefieres que te contactemos?', type: 'radio', options: opts(['WhatsApp','Llamada telefónica','Correo electrónico','Otro']), allowOther: true, condition: () => (answers.p30 === 'Sí' || answers.p30 === 'Tal vez') });
        s.push({ id: 'p32', question: '32. Datos de contacto (WhatsApp, email o teléfono) – opcional:', type: 'text', placeholder: 'Ej. 987654321 o correo@ejemplo.com', condition: () => (answers.p30 === 'Sí' || answers.p30 === 'Tal vez') });
    })();

    // ================================================================
    // ESTADO GLOBAL
    // ================================================================
    let encuestaActiva = null;
    let steps = [];
    const answers = {};
    let datosEnviados = false;
    let geoData = null;
    const inicioEncuesta = new Date();
    const tiemposPorPregunta = {};
    let preguntaActualId = null;
    let inicioPregunta = null;
    let fuente = 'desconocida';
    let dispositivo = 'desktop';
    let conexion = {};
    let currentStepIndex = 0;

    // ================================================================
    // HELPERS
    // ================================================================
    function resolveStep(step) {
        if (!step) return null;
        if (typeof step.getDefinition === 'function') {
            const def = step.getDefinition();
            return Object.assign({}, step, def);
        }
        return step;
    }

    function detectarDispositivo() {
        const ua = navigator.userAgent;
        if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
        if (/mobile|iphone|ipod|android|blackberry|windows phone/i.test(ua)) return 'celular';
        return 'laptop/PC';
    }

    function obtenerFuente() {
        const params = new URLSearchParams(window.location.search);
        const utm = params.get('utm_source');
        if (utm) return utm;
        try {
            const ref = document.referrer || '';
            if (ref.includes('facebook.com')) return 'Facebook';
            if (ref.includes('messenger.com')) return 'Messenger';
            if (ref.includes('whatsapp.com')) return 'WhatsApp';
            if (ref.includes('instagram.com')) return 'Instagram';
            if (ref.includes('tiktok.com')) return 'TikTok';
            if (ref.includes('youtube.com')) return 'YouTube';
            if (ref.includes('google.com')) return 'Google';
            if (ref.includes('twitter.com')) return 'Twitter';
            if (ref.includes('linkedin.com')) return 'LinkedIn';
            if (ref.includes('web.telegram.org')) return 'Telegram';
            return 'directo';
        } catch (e) { return 'desconocida'; }
    }

    function obtenerGeoData() {
        return fetch('https://ipapi.co/json/')
            .then(r => r.ok ? r.json() : null)
            .then(d => d ? {
                ip: d.ip || 'desconocida',
                ciudad: d.city || '',
                region: d.region || '',
                pais: d.country_name || '',
                lat: d.latitude || null,
                lon: d.longitude || null
            } : null)
            .catch(() => null);
    }

    function obtenerConexion() {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn) return {
            effectiveType: conn.effectiveType || 'unknown',
            downlink: conn.downlink || null,
            rtt: conn.rtt || null
        };
        return {};
    }

    // ================================================================
    // ENVÍO
    // ================================================================
    function enviarRespuestas(geo) {
        const dataToSend = {};
        for (const key in answers) {
            if (answers[key] !== undefined && answers[key] !== null && answers[key] !== '') {
                dataToSend[key] = answers[key];
            }
        }

        const fin = new Date();
        dataToSend._metadata = {
            fuente, dispositivo,
            inicio: inicioEncuesta.toISOString(),
            fin: fin.toISOString(),
            tiempo_total_segundos: Math.round((fin - inicioEncuesta) / 1000),
            tiempos_por_pregunta: tiemposPorPregunta,
            conexion,
            navegador: navigator.userAgent,
            plataforma: navigator.platform || 'desconocida'
        };
        if (geo) dataToSend._geo = geo;

        const nonce = encuestaActiva.NONCE_KEY
            ? (sessionStorage.getItem(encuestaActiva.NONCE_KEY) || '')
            : (encuestaActiva.NONCE || '');

        return fetch(encuestaActiva.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ datos: dataToSend, token: nonce, tipo_encuesta: encuestaActiva.tipo })
        })
        .then(async res => {
            if (!res.ok) {
                const t = await res.text();
                let msg;
                try { msg = JSON.parse(t).error || `Error ${res.status}`; }
                catch (e) { msg = `Error ${res.status}: ${t || res.statusText}`; }
                throw new Error(msg);
            }
            const t = await res.text();
            if (!t) return {};
            try { return JSON.parse(t); } catch (e) { return { success: true }; }
        })
        .then(data => {
            datosEnviados = true;
            try { localStorage.setItem(encuestaActiva.STORAGE_KEY, 'true'); } catch (e) {}
            return { success: true, data };
        })
        .catch(error => {
            console.error('❌ Error al enviar:', error);
            return { success: false, error: error.message };
        });
    }

    // ================================================================
    // NAVEGACIÓN
    // ================================================================
    function getVisibleSteps() { return steps.filter(s => s.condition()); }
    function getCurrentVisibleIndex() {
        const visible = getVisibleSteps();
        if (currentStepIndex >= visible.length) currentStepIndex = visible.length - 1;
        if (currentStepIndex < 0) currentStepIndex = 0;
        return currentStepIndex;
    }
    function getCurrentStep() {
        const visible = getVisibleSteps();
        return visible[getCurrentVisibleIndex()] || null;
    }

    function saveCurrentAnswer() {
        const step = getCurrentStep();
        if (!step) return;
        const el = document.querySelector(`[data-step-id="${step.id}"]`);
        if (!el) return;

        const effective = resolveStep(step);
        let value;

        if (effective.type === 'radio') {
            const c = el.querySelector('input[type="radio"]:checked');
            if (c) {
                value = c.value;
                if (value === 'Otra:' || value === 'Otro' || value === 'Otro país') {
                    const lbl = c.closest('label');
                    if (lbl) {
                        const ti = lbl.querySelector('.otro-input');
                        if (ti && ti.value.trim() !== '') {
                            value = value + ' ' + ti.value.trim();
                        }
                    }
                }
            } else value = null;
        } else if (effective.type === 'checkbox') {
            const cbs = el.querySelectorAll('input[type="checkbox"]:checked');
            value = Array.from(cbs).map(cb => cb.value);
            const otroInput = el.querySelector('.otro-input');
            if (otroInput && otroInput.value.trim() !== '') {
                const hasOtro = value.includes('Otro') || value.includes('Otra') || value.includes('Otros');
                if (hasOtro) {
                    value = value.filter(v => v !== 'Otro' && v !== 'Otra' && v !== 'Otros');
                    value.push(otroInput.value.trim());
                }
            }
        } else {
            const inp = el.querySelector('input, textarea');
            value = inp ? inp.value : '';
        }
        if (value !== undefined) answers[step.id] = value;
    }

    function loadAnswer(step) {
        const el = document.querySelector(`[data-step-id="${step.id}"]`);
        if (!el) return;
        const val = answers[step.id];
        if (val === undefined) return;

        const effective = resolveStep(step);

        if (effective.type === 'radio') {
            const radios = el.querySelectorAll('input[type="radio"]');
            let found = false;
            radios.forEach(r => {
                if (r.value === val) { r.checked = true; found = true; }
            });
            if (!found && typeof val === 'string') {
                const match = val.match(/^(Otra:|Otro|Otro país)\s+(.+)$/);
                if (match) {
                    const base = match[1];
                    const resto = match[2];
                    radios.forEach(r => {
                        if (r.value === base && !found) {
                            r.checked = true;
                            const lbl = r.closest('label');
                            if (lbl) {
                                const ti = lbl.querySelector('.otro-input');
                                if (ti) ti.value = resto;
                            }
                            found = true;
                        }
                    });
                }
            }
        } else if (effective.type === 'checkbox') {
            const cbs = el.querySelectorAll('input[type="checkbox"]');
            cbs.forEach(cb => {
                if (Array.isArray(val)) cb.checked = val.some(v => v === cb.value || (typeof v === 'string' && v.startsWith(cb.value)));
            });
            const otroInput = el.querySelector('.otro-input');
            if (otroInput && Array.isArray(val)) {
                const otroVal = val.find(v => typeof v === 'string' && !effective.options.some(o => o.value === v));
                if (otroVal) otroInput.value = otroVal;
            }
        } else {
            const inp = el.querySelector('input, textarea');
            if (inp) inp.value = val;
        }
    }

    function registrarTiempoPregunta(stepId) {
        if (preguntaActualId && inicioPregunta) {
            tiemposPorPregunta[preguntaActualId] = Math.round((new Date() - inicioPregunta) / 1000);
        }
        preguntaActualId = stepId;
        inicioPregunta = new Date();
    }

    function renderStep() {
        const step = getCurrentStep();
        const area = document.getElementById('dynamicArea');
        if (!step) { showSummary(); return; }

        const effective = resolveStep(step);

        if (step.id !== preguntaActualId) registrarTiempoPregunta(step.id);

        const visible = getVisibleSteps();
        const idx = getCurrentVisibleIndex();
        document.getElementById('stepCounter').textContent = `Paso ${idx+1} de ${visible.length}`;
        const progress = ((idx) / (visible.length - 1)) * 100;
        document.getElementById('progressFill').style.width = (visible.length === 1 ? 100 : progress) + '%';

        // Color dinámico del progress bar
        document.getElementById('progressFill').style.background = `linear-gradient(90deg, ${encuestaActiva.color}, ${encuestaActiva.color}dd)`;

        let html = `<div class="question-area" data-step-id="${step.id}">`;
        html += `<div class="question-text">${step.question}`;
        if (effective.type === 'text' || effective.type === 'textarea') html += ` <span class="sub-label">(respuesta corta)</span>`;
        if (effective.maxSelections) html += ` <span class="sub-label">(máximo ${effective.maxSelections})</span>`;
        html += `</div>`;

        if (effective.hint) {
            html += `<div class="info-hint">${effective.hint}</div>`;
        }

        const options = effective.options || [];

        if (effective.type === 'radio' || effective.type === 'checkbox') {
            html += `<div class="options-group">`;
            options.forEach(opt => {
                html += `<label>`;
                html += `<input type="${effective.type}" name="${step.id}" value="${opt.value}">`;
                html += `<span>${opt.label}</span>`;
                if ((opt.label === 'Otro' || opt.label === 'Otra' || opt.label === 'Otra:' || opt.label === 'Otro país') && effective.allowOther) {
                    html += `<input type="text" class="otro-input" placeholder="Especifica...">`;
                }
                html += `</label>`;
            });
            html += `</div>`;
        } else if (effective.type === 'text') {
            html += `<input type="text" class="text-input" placeholder="${effective.placeholder || ''}">`;
        } else if (effective.type === 'textarea') {
            html += `<textarea class="text-input textarea" placeholder="${effective.placeholder || ''}"></textarea>`;
        }

        html += `<div class="navigation">`;
        html += `<button class="btn btn-secondary" id="prevBtn" ${idx===0?'disabled':''}>← Anterior</button>`;
        html += (idx === visible.length - 1)
            ? `<button class="btn btn-success" id="nextBtn">Enviar respuestas ✓</button>`
            : `<button class="btn btn-primary" id="nextBtn">Siguiente →</button>`;
        html += `</div></div>`;
        area.innerHTML = html;

        loadAnswer(step);

        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');

        area.querySelectorAll('input, textarea').forEach(inp => {
            inp.addEventListener('change', () => {
                saveCurrentAnswer();
                if (effective.type === 'radio') {
                    // Both survey types share these conditional parents
                    const condicionantes = ['p9','p10','p12','p13','p16','p21','p23','p25','p30','p37'];
                    if (condicionantes.includes(step.id)) {
                        const vis = getVisibleSteps();
                        const ni = vis.findIndex(s => s.id === step.id);
                        if (ni !== -1) currentStepIndex = ni;
                        renderStep();
                    }
                }
            });
            inp.addEventListener('blur', saveCurrentAnswer);
        });

        nextBtn.addEventListener('click', function(e) {
            e.preventDefault();
            saveCurrentAnswer();
            const s = getCurrentStep();
            if (!s) return;
            const eff = resolveStep(s);

            if (eff.type === 'radio' && !answers[s.id]) { alert('Selecciona una opción.'); return; }
            if (eff.type === 'checkbox') {
                const v = answers[s.id];
                if (!v || !Array.isArray(v) || v.length === 0) { alert('Selecciona al menos una opción.'); return; }
                if (eff.maxSelections && v.length > eff.maxSelections) { alert(`Máximo ${eff.maxSelections} opciones.`); return; }
            }
            if ((eff.type === 'text' || eff.type === 'textarea') && (!answers[s.id] || String(answers[s.id]).trim() === '')) {
                alert('Escribe tu respuesta.'); return;
            }

            const vis = getVisibleSteps();
            if (currentStepIndex === vis.length - 1) {
                nextBtn.disabled = true;
                nextBtn.textContent = 'Enviando...';
                registrarTiempoPregunta(s.id);

                (geoData ? Promise.resolve(geoData) : obtenerGeoData().then(g => geoData = g))
                    .then(g => enviarRespuestas(g))
                    .then(showSummary);
                return;
            }
            registrarTiempoPregunta(s.id);
            currentStepIndex++;
            renderStep();
        });

        prevBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (currentStepIndex > 0) {
                const s = getCurrentStep();
                if (s) registrarTiempoPregunta(s.id);
                currentStepIndex--;
                renderStep();
            }
        });
    }

    // ================================================================
    // RESUMEN
    // ================================================================
    function showSummary(envioResult) {
        const area = document.getElementById('dynamicArea');
        saveCurrentAnswer();
        const allAnswers = { ...answers };
        const visibleSteps = getVisibleSteps();
        const exito = envioResult && envioResult.success;

        let html = `<div class="summary">`;

        if (exito) {
            html += `<div class="alert alert-success" style="text-align:center; font-size:18px;">
                        ✅ ¡Encuesta enviada correctamente! Muchas gracias por tu tiempo.
                        <p style="margin-top:12px; font-size:16px; color:#5b6f82;">Tus respuestas han sido registradas.</p>
                    </div>`;
        } else {
            if (envioResult) {
                html += `<div class="alert alert-error">❌ Error al enviar: ${envioResult.error}.<br>Tus respuestas se guardaron localmente.</div>`;
            } else {
                html += `<div class="alert alert-info">⚠️ Aún no has enviado los datos.</div>`;
            }

            html += `<h3 style="margin-bottom:16px; font-weight:600;">Resumen de tus respuestas</h3>`;
            visibleSteps.forEach(step => {
                const val = allAnswers[step.id];
                if (!val || (Array.isArray(val) && val.length === 0) || (typeof val === 'string' && val.trim() === '')) return;
                html += `<div class="summary-item"><strong>${step.question}</strong>`;
                if (Array.isArray(val)) {
                    html += `<div class="answer multi">`;
                    val.forEach(v => html += `<span>${v}</span>`);
                    html += `</div>`;
                } else {
                    html += `<div class="answer">${val}</div>`;
                }
                html += `</div>`;
            });

            html += `<div style="margin-top:24px; display:flex; gap:12px;">
                        <button class="btn btn-secondary" id="backBtn">← Volver</button>
                        <button class="btn btn-primary" id="restartBtn" style="flex:1;">🔁 Nueva encuesta</button>
                     </div>`;
        }
        html += `</div>`;
        area.innerHTML = html;

        document.getElementById('progressFill').style.width = '100%';
        document.getElementById('stepCounter').textContent = exito ? '¡Completado!' : 'Resumen';

        if (!exito) {
            const back = document.getElementById('backBtn');
            const restart = document.getElementById('restartBtn');
            if (back) back.addEventListener('click', () => {
                const v = getVisibleSteps();
                if (v.length) { currentStepIndex = v.length - 1; renderStep(); }
            });
            if (restart) restart.addEventListener('click', () => {
                for (const k in answers) delete answers[k];
                datosEnviados = false;
                currentStepIndex = 0;
                try { localStorage.removeItem(encuestaActiva.STORAGE_KEY); } catch (e) {}
                renderStep();
            });
        }
    }

    // ================================================================
    // INICIO
    // ================================================================
    function init() {
        // Leer tipo de encuesta desde URL
        const params = new URLSearchParams(window.location.search);
        const tipoParam = params.get('tipo') || 'compradores';

        if (!ENCUESTAS[tipoParam]) {
            // Tipo inválido — mostrar error
            const splash = document.getElementById('splashScreen');
            if (splash) splash.style.display = 'none';
            document.getElementById('app').style.display = '';
            document.getElementById('stepCounter').textContent = '';
            document.getElementById('progressFill').style.width = '0%';
            document.getElementById('dynamicArea').innerHTML = `
                <div class="alert alert-info" style="margin-top:40px; text-align:center; font-size:18px;">
                    <p>❌ Tipo de encuesta no disponible.</p>
                    <p style="margin-top:12px; font-size:16px; color:#5b6f82;">
                        Los tipos válidos son: <strong>compradores</strong>, <strong>vendedores</strong>.
                    </p>
                    <p style="margin-top:8px; font-size:14px; color:#8b9aab;">
                        Ejemplo: <code>?tipo=compradores</code>
                    </p>
                </div>`;
            return;
        }

        encuestaActiva = ENCUESTAS[tipoParam];
        steps = encuestaActiva.steps;

        // Actualizar título
        document.querySelector('.survey-header h1').textContent = encuestaActiva.titulo;

        // Splash screen con título dinámico
        const splash = document.getElementById('splashScreen');
        const app = document.getElementById('app');
        if (splash && app) {
            const splashTitle = splash.querySelector('.splash-title');
            if (splashTitle) {
                splashTitle.textContent = `Encuesta de ${encuestaActiva.tipo} — MegaRemates`;
            }
            splash.style.display = 'flex';
            app.style.display = 'none';
            document.getElementById('startSurveyBtn').addEventListener('click', function() {
                splash.style.display = 'none';
                app.style.display = '';
                startSurvey();
            });
            return;
        }

        startSurvey();
    }

    function startSurvey() {
        // Check si ya enviada (antes de cualquier otra acción)
        try {
            if (localStorage.getItem(encuestaActiva.STORAGE_KEY) === 'true') {
                const area = document.getElementById('dynamicArea');
                area.innerHTML = `
                    <div class="alert alert-info" style="margin-top:40px; text-align:center; font-size:18px;">
                        <p>✅ Ya has completado esta encuesta anteriormente.</p>
                        <p style="margin-top:12px; font-size:16px; color:#5b6f82;">Gracias por tu participación.</p>
                    </div>`;
                document.getElementById('stepCounter').textContent = 'Completado';
                document.getElementById('progressFill').style.width = '100%';
                return;
            }
        } catch (e) {}

        fuente = obtenerFuente();
        dispositivo = detectarDispositivo();
        conexion = obtenerConexion();

        obtenerGeoData().then(g => geoData = g).catch(() => geoData = null);

        preguntaActualId = null;
        inicioPregunta = new Date();
        currentStepIndex = 0;
        datosEnviados = false;
        renderStep();
    }

    window.addEventListener('load', init);
})();
