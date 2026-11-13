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


## Sprint 4 — Boleta interna de movimientos (iteración adicional)
- Se incorporó una boleta de **control de inventario**, sin validez tributaria y distinta de una boleta de venta SUNAT.
- Disponible para **administrador y empleado** desde la columna **Boleta interna** del historial de entradas y salidas.
- Después de registrar correctamente un movimiento, aparece **Ver boleta del último movimiento** si la RPC devuelve un identificador válido.
- Los campos provienen del registro real en `movimientos_inventario`: identificador `MOV-...`, fecha/hora, sucursal, producto/código, tipo, cantidad, stock anterior, stock nuevo y motivo.
- Para abrir el comprobante se vuelve a consultar por identificador usando la sesión autenticada de Supabase, respetando **RLS** y la asignación de sucursal.
- La vista ofrece **Imprimir / Guardar PDF** a través de la opción de impresión del navegador. No existe generación ni almacenamiento permanente de archivos PDF en Supabase.
- Archivos: `js/sprint4-boleta.js` (nuevo), `js/inventario.js`, `administrador.html`, `empleado.html` y `css/sprint4-premium.css`.
- No se modificaron tablas ni funciones SQL, y no se incluyeron datos ficticios o cifras de ventas.

### Pruebas pendientes de la boleta
1. Registrar una entrada de prueba y confirmar que el botón del último movimiento abre la boleta correcta.
2. Registrar una salida de prueba y confirmar el signo de la cantidad y los stocks.
3. Abrir boletas históricas desde el administrador y el empleado; verificar la sucursal autorizada.
4. Elegir **Imprimir / Guardar PDF**, revisar tipografía y márgenes del documento resultante.
5. Verificar que la boleta no permite modificar el registro y que no se expone información de otras sucursales.
6. Verificar el uso en celular, la impresión y la recuperación después de recargar la página.

## Sprint 4 — Mejoras prácticas del panel de empleado

Se añadieron tres mejoras solicitadas al sistema sin ampliar permisos ni modificar la base de datos:

- **Acciones rápidas independientes:** los botones «Registrar entrada» y «Registrar salida» abren el formulario existente con el tipo de movimiento preseleccionado; el usuario debe completar y confirmar el registro, que continúa usando la RPC existente.
- **Filtro por tipo del historial:** «Todos / Entradas / Salidas» muestra u oculta filas de los movimientos ya consultados mediante Supabase; es complementario al filtro por fecha y no cambia el gráfico de entradas/salidas. Si los movimientos consultados no contienen un tipo, se muestra un estado vacío. El límite sigue siendo hasta 40 movimientos recientes o 500 para un intervalo elegido.
- **Última consulta y actualización manual:** la hora indicada corresponde a la consulta más reciente realizada desde el navegador. El botón «Actualizar datos» vuelve a consultar catálogo, inventario, indicadores y movimientos de la sucursal autorizada, sin recargar la página ni guardar operaciones.
- **Legibilidad:** botones, tarjetas, descripciones y menú lateral del empleado presentan letras algo mayores y mejor separación.

**Archivos modificados:** `empleado.html`, `js/sprint4-navegacion.js`, `js/inventario.js` y `css/sprint4-premium.css`.

**Pruebas funcionales pendientes con cuenta de empleado:**
1. Pulsar «Registrar entrada»: comprobar que se abra Movimientos con «Entrada» seleccionado; repetir con «Registrar salida».
2. Comprobar que los filtros de tipo funcionen en combinación con calendario y que la boleta se abra desde cualquier fila visible.
3. Pulsar «Actualizar datos» y verificar que cambie «Última consulta» y que los indicadores muestren datos de Supabase.
4. Comprobar que se mantienen los permisos del empleado y que no aparecen funciones del administrador.
5. Revisar la visualización en computadora y celular.

## Validación pendiente en el navegador
1. Iniciar sesión como administrador y como empleado con cuentas autorizadas.
2. Confirmar que al cambiar de sucursal se actualizan los gráficos, las listas y las alertas.
3. Probar los enlaces del menú, las acciones rápidas y el botón de cerrar sesión.
4. Registrar una entrada y una salida de prueba autorizadas y comprobar la actualización de los paneles.
5. Revisar el diseño en escritorio y teléfono.
6. Recopilar capturas **antes y después** para el PowerPoint.
7. No cambiar la rama de producción en Netlify hasta concluir estas pruebas.

> Nota: los archivos fueron actualizados en GitHub `sprint4`. La validación funcional con sesión real todavía no está concluida.

## Publicación de prueba en Netlify — rama sprint4
- Se habilitó en la configuración de Netlify la rama adicional `sprint4` para obtener una publicación de prueba, manteniendo `sprint3` como rama de producción.
- Después de habilitar una rama que ya existía en GitHub, un nuevo commit en dicha rama permite iniciar su primer despliegue mediante la integración Git con Netlify.
- Este cambio de documentación genera ese nuevo commit sin afectar código, datos, permisos ni el sitio principal.
- La publicación por Netlify se debe comprobar en **Deploys** antes de anunciar que ya funciona por Internet.
- Verificar en la URL de la rama: inicio de sesión, panel administrador/empleado, calendario, boletas, filtros y exportación; confirmar la sucursal autorizada.
- Los avisos automáticos de correo con Resend todavía no forman parte de esta versión.

## Corrección de sucursales nuevas sin inventario — vista empleado

- Diagnóstico de Supabase (13/11/2026): hay 52 productos en el catálogo, pero los 52 registros de stock y 1 450 unidades pertenecen a Minimarket Central. Trujillo, Arequipa y Cusco no tienen filas en `inventarios` ni movimientos. **No es un fallo del inicio de sesión ni un error de sincronización.**
- Los indicadores del empleado diferencian ahora el **catálogo global** (productos y categorías) del **stock de la sucursal**, que continúa en cero hasta registrar operaciones reales.
- En «Productos» se puede consultar el catálogo aunque una sucursal no tenga inventario; las referencias sin fila de stock indican **«Pendiente de ingreso»** y presentan el stock como «—», en lugar de inventar una cantidad.
- En «Inicio» se muestra un mensaje claro de «Sucursal sin inventario» y un enlace para registrar su primera entrada, que utiliza la RPC existente `registrar_movimiento`. Esa RPC ya crea el registro inicial de inventario cuando corresponde, con stock anterior de cero; la operación solo se guarda tras confirmar el formulario.
- Las alertas dejan de afirmar «Todo en orden» cuando una sucursal aún no tiene inventario registrado.
- Para utilizar alertas de reposición, el administrador debe configurar el stock mínimo para los productos que ingrese en cada nueva sede.
- **No se modificó Supabase** ni se copiaron existencias entre sucursales.
- Pendiente de prueba real: abrir el perfil del empleado de Trujillo en la web desplegada, verificar catálogo, registrar una entrada válida y confirmar actualización de stock, historial y boleta interna. No dar por completada esta prueba sin evidencia en el navegador.

