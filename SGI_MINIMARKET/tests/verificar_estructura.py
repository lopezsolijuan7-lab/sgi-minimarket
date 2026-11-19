"""Verificación estática del proyecto. No requiere conexión remota Supabase."""
from pathlib import Path
from html.parser import HTMLParser
import json

ROOT = Path(__file__).resolve().parents[1]

class Checker(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids=[]
        self.scripts=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if a.get('id'): self.ids.append(a['id'])
        if tag=='script' and a.get('src'):self.scripts.append(a['src'])

needed={
 'index.html': ['loginForm','correo','password','btnIngresar','mostrarPassword','mensaje','sgi-form-recuperar'],
 'administrador.html': ['selector-sucursal','tabla-productos','formulario-producto','categoria',
   'formulario-movimiento','tabla-movimientos','formulario-asignacion', 'sgi-form-editar-empleado',
   'sgi-form-clave-empleado','unidad-medida','sgi-prov-cancelar'],
 'empleado.html': ['tabla-productos','tabla-movimientos', 'sgi-form-cambiar-mi-clave',
   'sgi-form-venta','sgi-form-recepcion','sgi-venta-carrito'],
 'restablecer-clave.html': ['sgi-reset-form','sgi-reset-password','sgi-reset-btn']
}
for file, ids in needed.items():
    contenido=(ROOT/file).read_text(encoding='utf-8')
    parser=Checker(); parser.feed(contenido)
    assert len(parser.ids)==len(set(parser.ids)), f'IDs duplicados: {file}'
    assert set(ids).issubset(set(parser.ids)), f'Faltan IDs en {file}: {set(ids)-set(parser.ids)}'
    assert all((ROOT/src).is_file() for src in parser.scripts), f'Script faltante en {file}'
    assert 'Dragon Ball' not in contenido and 'One Piece' not in contenido
    if file == 'empleado.html':
        assert 'selector-sucursal' not in parser.ids, 'No mostrar selector de sucursal al empleado'

sesiones=(ROOT/'js/sesiones.js').read_text(encoding='utf-8')
inventario=(ROOT/'js/inventario.js').read_text(encoding='utf-8')
login=(ROOT/'js/login.js').read_text(encoding='utf-8')
assert "from('usuarios')" in sesiones and "from('sucursales')" in sesiones
assert 'usuarios_sucursales' not in sesiones and 'perfiles' not in sesiones
assert "todosDe('categorias'" in inventario and "todosDe('inventarios'" in inventario
for rpc in ['sgi_crear_producto_con_unidad','sgi_actualizar_producto_ficha','registrar_movimiento','configurar_stock_minimo']:
    assert rpc in inventario
assert 'signInWithPassword' in login
assert 'minimarket.jpg' in (ROOT/'css/style.css').read_text(encoding='utf-8')
assert (ROOT/'img/minimarket.jpg').is_file()
assert (ROOT/'icons/sgi-192.png').is_file()
assert (ROOT/'icons/sgi-512.png').is_file()
json.loads((ROOT/'app.webmanifest').read_text(encoding='utf-8'))
assert 'CREATE OR REPLACE FUNCTION public.crear_producto_con_stock' in (ROOT/'sql/03_compatibilidad_web.sql').read_text(encoding='utf-8')
assert 'CREATE OR REPLACE FUNCTION public.sgi_crear_producto_con_unidad' in (ROOT/'sql/08_unidades_proveedores.sql').read_text(encoding='utf-8')
print('OK: HTML, JavaScript, recursos, tablas y RPC revisados estáticamente.')
