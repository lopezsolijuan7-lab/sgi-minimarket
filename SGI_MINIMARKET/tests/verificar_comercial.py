"""Pruebas estaticas locales del modulo comercial. No requiere Supabase."""
from pathlib import Path
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1]

class Lector(HTMLParser):
    def __init__(self):
        super().__init__();self.ids=set();self.enlaces=set();self.scripts=[]
    def handle_starttag(self,tag,attrs):
        attr=dict(attrs)
        if attr.get('id'):
            assert attr['id'] not in self.ids, f"ID duplicado: {attr['id']}"
            self.ids.add(attr['id'])
        if tag=='a' and str(attr.get('href','')).startswith('#'):
            self.enlaces.add(attr['href'][1:])
        if tag=='script' and attr.get('src'): self.scripts.append(attr['src'])

for nombre,elementos in {
    'administrador.html':{
        'proveedores','compras','cajas','ventas',
        'sgi-form-compra','sgi-form-proveedor','sgi-form-caja',
        'sgi-form-recepcion','sgi-ventas-lista','sgi-venta-detalles','sgi-venta-pagos',
        'sgi-compras-lista','sgi-cajas-lista'
    },
    'empleado.html':{'compras','sgi-compras-lista','sgi-form-recepcion',
                     'sgi-recepcion-detalles','sgi-panel-recepcion'}
}.items():
    lector=Lector();lector.feed((ROOT/nombre).read_text(encoding='utf-8'))
    assert elementos <= lector.ids, f'Faltan elementos en {nombre}: {elementos-lector.ids}'
    assert 'compras' in lector.enlaces
    assert 'js/comercial.js' in lector.scripts
    assert all((ROOT/s).is_file() for s in lector.scripts)

js=(ROOT/'js/comercial.js').read_text(encoding='utf-8')
for rpc in ['sgi_crear_compra','sgi_confirmar_recepcion','sgi_crear_punto_caja',
            'sgi_registrar_proveedor']:
    assert rpc in js
    assert any(rpc in (ROOT/'sql'/x).read_text(encoding='utf-8')
               for x in ('04_compras_recepciones.sql','05_cajas_consultas.sql'))
assert 'innerHTML' not in js, 'No insertar datos obtenidos de terceros con innerHTML'
assert 'auth.users' in (ROOT/'DOCUMENTACION_SPRINTS.md').read_text(encoding='utf-8')
assert 'recibida' in (ROOT/'sql/04_compras_recepciones.sql').read_text(encoding='utf-8')
print('OK: Modulos comerciales, roles, rutas, archivos RPC y referencias de seguridad.')
