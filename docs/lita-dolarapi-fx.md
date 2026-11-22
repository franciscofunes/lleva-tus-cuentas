# Cotizaciones DolarAPI para Lita (LTC host)

LTC **ya** consulta `https://dolarapi.com/v1/dolares` desde `src/services/usdQuotesService.js`, con caché en memoria de 10 minutos, precios `compra` / `venta` y lista permitida: `bolsa` (MEP), `contadoconliqui` (CCL), `oficial`, `blue` y `cripto`.

## Protocolo mínimo

El iframe Lita autenticado envía `{ type: 'lita:fx:request', payload: { requestId } }`. El host verifica **origen exacto + ventana del iframe** (igual que el resto del bridge), ID de solicitud, sesión de usuario, sección `transactions` y modo privacidad desactivado.

La respuesta `lita:fx:result` lleva solamente `{ requestId, success, source: 'DolarAPI', quotes: [{ key, compra, venta, updatedAt }] }`. Se filtran mercados desconocidos, precios fuera de rango, fechas inválidas y cotizaciones con más de 96 horas; entre 36 y 96 horas se conservan como último cierre identificado. En error o modo privacidad se devuelve `success:false` y lista vacía. Los errores no bloquean reportes financieros deterministas.

**DolarAPI no recibe el ID de usuario, saldo de Portfolio, transacciones, categorías, cookies ni montos;** su fetch público es GET, `credentials:'omit'` sin cuerpo. Los mensajes `postMessage` nunca incluyen esos datos en las consultas de precio.

## Significado financiero

- `compra`: pesos recibidos por vender USD, usado para un equivalente ilustrativo del valor de posiciones USD en ARS y una brecha de caja ARS expresada como USD que se venderían.
- `venta`: pesos requeridos por comprar USD, usado solo cuando el flujo neto USD sea negativo y se ilustre cubrirlo con ARS.
- La cotización de referencia, que puede ser de último cierre, no revaloriza históricamente flujos registrados de los últimos seis meses; los equivalentes son orientativos y no estimaciones de ejecución, ganancias, impuestos o comisiones.
- No hay escrituras en Firestore, ni nueva API, ni nuevas variables de entorno. Las conversiones no generan un ingreso o gasto registrado.

**Despliegue:** fusionar y desplegar LTC primero, luego el PR compañero en `franciscofunes/lita-assitant`, verificando el SHA exacto de `main` de ambos dominios de Vercel.

En fin de semana o feriado algunos mercados conservan el último cierre: **mostrar la fecha y la advertencia de actualización pendiente**, sin presentarlo como precio operativo de hoy. Los precios que superan 96 horas se rechazan y no generan equivalencias.
