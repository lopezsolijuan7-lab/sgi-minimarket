# Integración del paquete Sprint 4 mejorado — 13/11/2026

## Rama y objetivo
- Rama de trabajo: `sprint4-mejorado`, creada desde `sprint4`.
- Conserva `main`, `sprint3` y `sprint4` intactas.
- Integración de los archivos aportados: nuevos módulos de proveedores, compras y recepciones, cajas, consulta de ventas/pagos y registro de ventas del empleado.
- Conserva el calendario, gráficos, catálogo, alertas visuales, boletas internas y exportación CSV ya desarrollados.
- La interfaz del empleado ya no muestra ajuste manual de existencias, para que el nuevo flujo sea consistente con las reglas del SQL 06. El administrador conserva los ajustes.

## Estado de integración
- Subida de código a GitHub: completada.
- Verificación estática de JavaScript y HTML (IDs únicos, secciones y rutas): realizada sin errores detectados.
- Funciones de compras y ventas en Supabase: **pendientes**. Consulta de solo lectura al 13/11/2026: no hay funciones `public.sgi_%`.
- Pruebas autenticadas (administrador y empleado) de compras, pagos y recepciones: **pendientes**.
- Configuración de Netlify para `sprint4-mejorado`: **pendiente**. No se ha modificado el sitio principal.
- No se han ejecutado SQL ni operaciones de inventario desde esta integración.

## Orden técnico recomendado antes de habilitar producción
1. Respaldar la base de datos Supabase.
2. Ejecutar primero y revisar el diagnóstico de solo lectura: `sql/00_diagnostico_sin_cambios.sql`.
3. Comparar el esquema real de Supabase y las políticas existentes con las referencias del paquete.
4. Con autorización y tras validación, aplicar en orden los scripts:
   - `sql/04_compras_recepciones.sql`
   - `sql/05_cajas_consultas.sql`
   - `sql/06_ventas_empleado.sql`
5. Revisar funciones SECURITY DEFINER, políticas RLS para cada tabla, permisos de sucursal y transacciones. Los scripts no sustituyen una auditoría de seguridad.
6. Probar una compra y recepción parcial con cantidades buenas/dañadas/faltantes y verificar el stock real.
7. Probar ventas con caja/pagos, stock insuficiente, reintentos de venta e independencia de sucursales.
8. Publicar inicialmente la rama en Netlify como **Branch deploy**, sin cambiar producción `sprint4`. Validar inicio de sesión y flujos desde la URL de prueba.
9. Solo tras pasar las pruebas y contar con respaldo, considerar cambiar `Production branch` a `sprint4-mejorado`.

## Atención
- Los comprobantes internos de inventario siguen sin validez tributaria; no emiten boleta electrónica SUNAT.
- Los pagos digitales se registran por referencia aportada por el usuario; no verifican una transferencia bancaria externa.
- El catálogo es global, pero cada sucursal tiene stock independiente.
- La ausencia de movimientos de ventas/compras no debe reemplazarse por cifras simuladas en una instalación real.

## Evidencia
- Consultar `ACTUALIZACION_SUPABASE_SPRINT3_4.md`, `PERMISOS_EMPLEADO_Y_PASOS.md` y `tests/`.
- La instalación SQL se realizará por separado; subir una página web a GitHub o Netlify **no** ejecuta archivos SQL en Supabase.
