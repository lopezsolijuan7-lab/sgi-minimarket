# Entrega de Sprint 4_02 — integración del ZIP recibido

**Archivo revisado:** `SGI_Minimarket_Sprint4_02.zip` (13/11/2026).  
**Rama de destino:** `sprint4_02`, derivada de `sprint4-mejorado`.

## Contenido del ZIP
El paquete contiene **48 archivos**, todos bajo `SGI_MINIMARKET/`:
- Interfaces: `index.html`, `administrador.html`, `empleado.html` y `dashboard.html`.
- Estilos y recursos: `css/`, `img/`, `icons/`, `app.webmanifest` y `service-worker.js`.
- JavaScript: `js/inventario.js`, `js/comercial.js`, `js/ventas-empleado.js` y los scripts del Sprint 4.
- SQL: diagnóstico, compatibilidad, compras y recepciones, cajas y ventas del empleado.
- `tests/`, instrucciones de Windows, README y documentación Scrum.

## Comparación y decisión de integración
La mayor parte del código recibido ya había sido incorporada previamente en `sprint4-mejorado`. El nuevo ZIP recupera versiones **anteriores** de algunos componentes que habían sido reparados después de la primera entrega. Por seguridad, se conserva en `sprint4_02` la versión funcional más reciente de esos archivos, en lugar de sobrescribirla con la copia antigua.

**Hallazgo reproducible del ZIP recibido:** ejecutar `python tests/verificar_estructura.py` sobre el contenido descomprimido produce un error en `empleado.html` por falta de `selector-sucursal`, `formulario-movimiento` y `tabla-productos`. La prueba `python tests/verificar_comercial.py` sí finaliza con resultado OK. Estas deficiencias del ZIP se habían solucionado en la rama origen.

La nueva rama conserva:
1. Los indicadores, catálogo, sucursal asignada, formulario de entradas/salidas y alertas del empleado.
2. Los nuevos paneles de ventas, compras, recepciones, proveedores y cajas.
3. Gráficos, calendario, boletas internas, consultas y exportación CSV.
4. Los scripts SQL de integración, incluidos los ajustes para no bloquear operaciones manuales autorizadas.
5. La documentación Scrum actualizada en `DOCUMENTACION_SPRINTS.md`, incorporando la organización de Sprints 0–5 del paquete.

## Base de datos y publicación
Las funciones SQL nuevas fueron instaladas y verificadas en Supabase en la iteración anterior. Una prueba transaccional reversible de compra → recepción → venta → movimiento resultó correcta. **No se han probado aún todos los formularios de esta rama en un navegador con cuentas reales.**

No se han cambiado desde esta entrega las existencias de Supabase, las ramas históricas ni la configuración de Netlify. Puedes configurar `sprint4_02` como rama adicional en Netlify para probarla antes de ponerla en producción.

## Límites importantes
- La boleta de inventario **no** es una boleta electrónica SUNAT.
- Un número de referencia de transferencia/voucher no confirma automáticamente que el banco recibió el dinero.
- Las alertas de stock visuales no envían mensajes por correo o teléfono.
- La seguridad debe evaluarse nuevamente con perfiles autenticados antes del uso comercial.
