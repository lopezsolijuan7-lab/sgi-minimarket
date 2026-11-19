"""Validaciones estáticas de la interfaz; no requieren conexión a Supabase."""
from pathlib import Path
from bs4 import BeautifulSoup

BASE = Path(__file__).resolve().parents[1]

def comprobar(pagina):
    ruta=BASE/pagina
    html=ruta.read_text(encoding='utf-8')
    soup=BeautifulSoup(html,'html.parser')
    ids=[x.get('id') for x in soup.select('[id]')]
    assert len(ids)==len(set(ids)), f'{pagina}: identificadores HTML duplicados'
    for node in soup.select('script[src],link[href]'):
        src=node.get('src') or node.get('href')
        if src and not src.startswith(('http:','https:','#')) and not src.endswith('.webmanifest'):
            assert (BASE/src).is_file(), f'{pagina}: recurso no encontrado {src}'
    for a in soup.select('a[href^="#"]'):
        target=a['href'][1:]
        assert not target or target in ids, f'{pagina}: ancla inexistente {target}'
    assert 'SPRINT 4' not in soup.get_text(' ',strip=True).upper(), f'{pagina}: texto académico visible'
    return soup

admin=comprobar('administrador.html')
empleado=comprobar('empleado.html')
assert admin.select_one('#empleados') and admin.select_one('#nav-empleados')
assert admin.select_one('#sgi-form-empleado') and admin.select_one('#formulario-asignacion')
assert admin.select_one('#sgi-form-editar-empleado') and admin.select_one('#sgi-editar-empleado-nombre')
assert admin.select_one('#sgi-editar-empleado-sucursal') and admin.select_one('#sgi-editar-empleado-activo')
assert admin.select_one('#administracion-sucursales')
assert admin.select_one('#selector-sucursal')
assert not empleado.select_one('#selector-sucursal'), 'El empleado no debe escoger sucursal'
assert not empleado.select_one('#formulario-movimiento'), 'El empleado no debe ajustar stock manualmente'
assert not empleado.select_one('#nav-empleados') and not empleado.select_one('#empleados')
assert empleado.select_one('#sgi-form-venta') and empleado.select_one('#sgi-form-recepcion')
assert empleado.select_one('#tabla-movimientos')
assert (BASE/'supabase/functions/crear-empleado/index.ts').is_file()
assert (BASE/'sql/07_permisos_inventario_admin.sql').is_file()
print('OK: paneles, enlaces, módulos, permisos de interfaz, empleados y recursos.')
