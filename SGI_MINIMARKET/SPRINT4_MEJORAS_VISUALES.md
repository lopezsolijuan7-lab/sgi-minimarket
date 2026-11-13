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
- `css/sprint4-premium.css`
- `js/inventario.js`
- `js/sprint4-navegacion.js`

**Archivos nuevos:** `js/sprint4-dashboard.js`, `js/sprint4-calendario.js` y `css/sprint4-premium.css`.

## Límites de la visualización
- El gráfico de movimientos resume hasta 40 registros recientes, no todo el histórico de ventas o movimientos.
- El inventario visible y sus indicadores dependen de la sucursal seleccionada y de las políticas de seguridad de Supabase.
- Las alertas visibles **todavía no envían correos**. La integración de notificaciones con Resend se planificará después de validar el diseño.

## Diseño premium y calendario funcional (nueva iteración)
- Se creó `css/sprint4-premium.css` para aproximar el **modelo azul oscuro y turquesa elegido**, con menús, tarjetas y botones consistentes y adaptables.
- Administrador: selector nativo de **Desde / Hasta**, botón **Actualizar** y opción **Ver todos**. El filtro consulta por `creado_en` en Supabase y modifica la tabla, el resumen de entradas/salidas y la lista de últimos movimientos.
- Administrador: botón **Exportar CSV**, que descarga exclusivamente los registros de movimientos cargados y autorizados de la vista actual, con protección básica contra fórmulas de hoja de cálculo.
- Empleado: controles **Hoy / 7 días / 30 días / Todos** y selector de **fecha exacta** tanto en el inicio como en el módulo de movimientos; ambos grupos permanecen sincronizados.
- Se creó `js/sprint4-calendario.js` y se adaptaron `js/inventario.js` y `js/sprint4-dashboard.js` para filtrar movimientos reales y actualizar los gráficos.
- Los indicadores de productos, unidades y valor de inventario describen **existencias actuales**, y **no** se recalculan como un inventario histórico al cambiar las fechas.
- **Límites por consulta:** sin filtro se consultan los últimos 40 movimientos; con fechas, hasta 500 movimientos del intervalo. El CSV exporta solo los registros cargados, no toda la base de datos.
- La selección se interpreta según la **zona horaria del navegador** y se envía a Supabase como intervalo de fecha/hora UTC.
- No se envían correos y no se ha cambiado ningún despliegue de producción.

## Pruebas adicionales del calendario (pendientes de verificación con sesión real)
1. Seleccionar dos fechas válidas, pulsar **Actualizar** y comparar tabla, actividad reciente y gráfico.
2. Seleccionar fechas invertidas: el formulario debe avisar, sin consultar.
3. Probar un período sin registros: debe aparecer un mensaje vacío, sin datos inventados.
4. Pulsar **Ver todos**: debe recuperar los movimientos más recientes.
5. Exportar CSV como administrador y verificar que las filas coinciden con la consulta.
6. En empleado, probar **Hoy**, **7 días**, **30 días**, **Todos** y una **fecha exacta**; verificar que ambos filtros estén sincronizados.
7. Comprobar cambios de sucursal (si el usuario tiene más de una), permisos y visualización móvil.
8. Probar gráficos, formularios y enlaces existentes con ambas cuentas.

## Validación pendiente en el navegador
1. Iniciar sesión como administrador y como empleado con cuentas autorizadas.
2. Confirmar que al cambiar de sucursal se actualizan los gráficos, las listas y las alertas.
3. Probar los enlaces del menú, las acciones rápidas y el botón de cerrar sesión.
4. Registrar una entrada y una salida de prueba autorizadas y comprobar la actualización de los paneles.
5. Revisar el diseño en escritorio y teléfono.
6. Recopilar capturas **antes y después** para el PowerPoint.
7. No cambiar la rama de producción en Netlify hasta concluir estas pruebas.

> Nota: los archivos fueron actualizados en GitHub `sprint4`. La validación funcional con sesión real todavía no está concluida.
