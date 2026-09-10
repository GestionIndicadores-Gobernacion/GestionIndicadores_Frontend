from pathlib import Path

print("=== 1. RUTAS DE OTROS MÓDULOS EN EL MENÚ ===")
menu_file = Path("src/app/core/services/menu.service.ts")
if menu_file.exists():
    for line in menu_file.read_text(encoding="utf-8").splitlines():
        if "route:" in line or "label:" in line:
            print("  ", line.strip())

print("\n=== 2. RUTAS INTERNAS DEL DASHBOARD (dashboard-layout.routes.ts) ===")
dash_routes = Path("src/app/layout/dashboard-layout/dashboard-layout.routes.ts")
if dash_routes.exists():
    print(dash_routes.read_text(encoding="utf-8"))
else:
    print("No existe dashboard-layout.routes.ts")

print("\n=== 3. BLOQUE EN APP.ROUTES.TS ===")
app_routes = Path("src/app/app.routes.ts")
if app_routes.exists():
    content = app_routes.read_text(encoding="utf-8")
    idx = content.find("DashboardLayoutComponent")
    if idx != -1:
        print(content[idx:idx+650])
