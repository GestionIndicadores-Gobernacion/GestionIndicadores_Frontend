from pathlib import Path

ts_file = Path("src/app/features/dashboard/home-dashboard/components/reports-map/reports-map.ts")
if not ts_file.exists():
    ts_file = Path("frontend/src/app/features/dashboard/home-dashboard/components/reports-map/reports-map.ts")

print("=== CONTENIDO DE reports-map.ts ===")
if ts_file.exists():
    lines = ts_file.read_text(encoding="utf-8", errors="ignore").splitlines()
    for line in lines:
        # Filtrar o mostrar las líneas relevantes de Leaflet y GeoJSON
        if any(k in line.lower() for k in ["geojson", "tilelayer", "l.map", "style", "layer", "assets", "http", "color", "fill"]):
            print(line)
else:
    print("No se encontró reports-map.ts")

helpers_file = ts_file.parent / "helpers" / "reports-map.helpers.ts"
print("\n=== CONTENIDO DE reports-map.helpers.ts ===")
if helpers_file.exists():
    print(helpers_file.read_text(encoding="utf-8", errors="ignore"))
else:
    print("No se encontró helpers")

