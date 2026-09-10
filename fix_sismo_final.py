import re
import sys
from pathlib import Path

print("🔧 Corrigiendo enrutamiento de Sismo 2026...")

# 1. Rutas de archivos
app_routes_file = Path("src/app/app.routes.ts")
menu_service_file = Path("src/app/core/services/menu.service.ts")
resumen_html_file = Path("src/app/features/sismo/pages/resumen/resumen.component.html")

if not app_routes_file.exists() or not menu_service_file.exists():
    print("❌ Asegúrate de ejecutar este comando dentro de la carpeta 'frontend'.")
    sys.exit(1)

# =========================================================================
# PASO 1: CORREGIR APP.ROUTES.TS (Ubicar Sismo en DashboardLayoutComponent)
# =========================================================================
routes_txt = app_routes_file.read_text(encoding="utf-8")

# Limpiar cualquier mención previa de sismo en todo el archivo
routes_clean = re.sub(r"\s*\{\s*path:\s*['\"](?:dashboard/)?sismo['\"],[\s\S]*?import\(['\"].*?sismo\.routes['\"]\)\.then\(m => m\.SISMO_ROUTES\),?\s*\},?", "", routes_txt)

# Buscar específicamente 'component: DashboardLayoutComponent' (NO el import)
dash_match = re.search(r"component:\s*DashboardLayoutComponent[\s\S]*?children\s*:\s*\[", routes_clean)
if not dash_match:
    print("❌ No se encontró 'component: DashboardLayoutComponent' con 'children: [' en app.routes.ts")
    sys.exit(1)

insert_pos = dash_match.end()

sismo_routes_block = """
        // SISMO 2026
        {
          path: 'sismo',
          loadChildren: () =>
            import('./features/sismo/sismo.routes').then(m => m.SISMO_ROUTES),
        },
        {
          path: 'dashboard/sismo',
          loadChildren: () =>
            import('./features/sismo/sismo.routes').then(m => m.SISMO_ROUTES),
        },"""

routes_final = routes_clean[:insert_pos] + sismo_routes_block + routes_clean[insert_pos:]
app_routes_file.write_text(routes_final, encoding="utf-8")
print("✅ app.routes.ts: Rutas registradas dentro de DashboardLayoutComponent.")

# =========================================================================
# PASO 2: CORREGIR MENU.SERVICE.TS (Estandarizar rutas sin /dashboard/ inicial)
# =========================================================================
menu_txt = menu_service_file.read_text(encoding="utf-8")

# Reemplazar rutas de Sismo para que usen la misma convención que 'reports' y 'datasets'
menu_txt = menu_txt.replace("'/dashboard/sismo/resumen'", "'sismo/resumen'")
menu_txt = menu_txt.replace("'/dashboard/sismo/despachos'", "'sismo/despachos'")
menu_txt = menu_txt.replace("'/dashboard/sismo/buscador'", "'sismo/buscador'")
menu_txt = menu_txt.replace("'/dashboard/sismo/farmacologia'", "'sismo/farmacologia'")
menu_txt = menu_txt.replace("'/dashboard/sismo/albergues'", "'sismo/albergues'")
menu_txt = menu_txt.replace("'/dashboard/sismo/voluntarios'", "'sismo/voluntarios'")

menu_txt = menu_txt.replace('" /dashboard/sismo/resumen"', '"sismo/resumen"')
menu_txt = menu_txt.replace('" /dashboard/sismo/despachos"', '"sismo/despachos"')
menu_txt = menu_txt.replace('" /dashboard/sismo/buscador"', '"sismo/buscador"')
menu_txt = menu_txt.replace('" /dashboard/sismo/farmacologia"', '"sismo/farmacologia"')
menu_txt = menu_txt.replace('" /dashboard/sismo/albergues"', '"sismo/albergues"')
menu_txt = menu_txt.replace('" /dashboard/sismo/voluntarios"', '"sismo/voluntarios"')

menu_service_file.write_text(menu_txt, encoding="utf-8")
print("✅ menu.service.ts: Rutas del menú estandarizadas a 'sismo/...'.")

# =========================================================================
# PASO 3: ACTUALIZAR ENLACES DEL DOCK EN RESUMEN HTML
# =========================================================================
if resumen_html_file.exists():
    html_txt = resumen_html_file.read_text(encoding="utf-8")
    html_txt = html_txt.replace('routerLink="/dashboard/sismo/', 'routerLink="/sismo/')
    resumen_html_file.write_text(html_txt, encoding="utf-8")
    print("✅ resumen.component.html: Enlaces del dock actualizados a '/sismo/...'.")

print("\n🚀 ¡Configuración reparada con éxito! Comprobando compilación...")
