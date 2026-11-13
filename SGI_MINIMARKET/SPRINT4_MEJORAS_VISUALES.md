# Sprint 4 — Mejoras visuales de SGI MINIMARKET

**Rama:** `sprint4`  
**Objetivo:** mejorar los paneles de administrador y empleado sin modificar los permisos existentes, la lógica de negocio ni el despliegue de producción.

## Cambios implementados en el código

### Panel del administrador
- Se conservan los cuatro indicadores existentes.
- Se conservan el gráfico de dona y las barras de stock por categoría.
- Se agrega un gráfico comparativo de **unidades de entrada y salida**, calculado con los **últimos 40 movimientos** recuperados de Supabase.
- Se agrega una lista de los **últimos cinco movimientos**.
- Se agrega un resumen de **productos que necesitan reposición** y enlace al módulo de alertas.

### Panel del empleado
- Se mantienen los indicadores de productos, unidades y stock bajo.
- Se agrega un indicador de **categorías visibles** en la sucursal autorizada.
- Se agregan accesos rápidos a consulta de productos y registro de movimientos.
- Se agregan gráficos de entradas/salidas y actividad reciente, basados en registros reales.
- Se incorpora una **vista de alertas informativas**, sin facultades de administración ni envío de correos todavía.

### Navegación y apariencia
- Se mantiene la navegación por módulos sin recorrer toda la página.
- Se mejora la presentación de tarjetas, barras, espaciados, colores y estados vacíos.
- Se adaptan las tarjetas y secciones a pantallas de escritorio y móviles.
- Se reutilizan los datos y restricciones de acceso de Supabase.

## Archivos modificados
- `administrador.html`
- `empleado.html`
- `css/sprint4-ui.css`
- `js/inventario.js`
- `js/sprint4-navegacion.js`

**Archivo nuevo:** `js/sprint4-dashboard.js`.

## Límites de la visualización
- El gráfico de movimientos resume hasta 40 registros recientes, no todo el histórico de ventas o movimientos.
- El inventario visible y sus indicadores dependen de la sucursal seleccionada y de las políticas de seguridad de Supabase.
- Las alertas visibles **todavía no envían correos**. La integración de notificaciones con Resend se planificará después de validar el diseño.

## Validación pendiente en el navegador
1. Iniciar sesión como administrador y como empleado con cuentas autorizadas.
2. Confirmar que al cambiar de sucursal se actualizan los gráficos, las listas y las alertas.
3. Probar los enlaces del menú, las acciones rápidas y el botón de cerrar sesión.
4. Registrar una entrada y una salida de prueba autorizadas y comprobar la actualización de los paneles.
5. Revisar el diseño en escritorio y teléfono.
6. Recopilar capturas **antes y después** para el PowerPoint.
7. No cambiar la rama de producción en Netlify hasta concluir estas pruebas.

> Nota: los archivos fueron actualizados en GitHub `sprint4`. La validación funcional con sesión real todavía no está concluida.
