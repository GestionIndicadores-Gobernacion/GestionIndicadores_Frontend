import re
import sys
from pathlib import Path

routes_path = Path("src/app/app.routes.ts")
if not routes_path.exists():
    print("❌ No se encontró src/app/app.routes.ts. Verifica estar en la carpeta frontend.")
    sys.exit(1)

content = routes_path.read_text(encoding="utf-8")

# 1. Respaldar archivo original
routes_path.with_suffix(".ts.bak").write_text(content, encoding="utf-8")

# 2. Eliminar cualquier registro previo de 'sismo' (incluso el de auth)
clean_content = re.sub(r"\s*\{\s*path:\s*['\"](?:dashboard/)?sismo['\"],[\s\S]*?loadChildren:[\s\S]*?\},?", "", content)

# 3. Ubicar DashboardLayoutComponent
dash_idx = clean_content.find("DashboardLayoutComponent")
if dash_idx == -1:
    print("❌ No se encontró DashboardLayoutComponent en app.routes.ts")
    sys.exit(1)

# 4. Ubicar el arreglo children: [ de DashboardLayoutComponent
children_match = re.search(r"children\s*:\s*\[", clean_content[dash_idx:])
if not children_match:
    print("❌ No se encontró 'children: [' dentro de DashboardLayoutComponent")
    sys.exit(1)

insert_pos = dash_idx + children_match.end()

# 5. Insertar antes de 'dashboard' para que tenga prioridad de coincidencia
sismo_routes = """
        // SISMO 2026 (coincidencia para /dashboard/sismo y /sismo)
        {
          path: 'dashboard/sismo',
          loadChildren: () =>
            import('./features/sismo/sismo.routes').then(m => m.SISMO_ROUTES),
        },
        {
          path: 'sismo',
          loadChildren: () =>
            import('./features/sismo/sismo.routes').then(m => m.SISMO_ROUTES),
        },"""

final_content = clean_content[:insert_pos] + sismo_routes + clean_content[insert_pos:]
routes_path.write_text(final_content, encoding="utf-8")

print("✅ Rutas de Sismo insertadas correctamente dentro de DashboardLayoutComponent.")
