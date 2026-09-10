import json
from pathlib import Path

front_dir = Path("src/app")
if not front_dir.exists():
    front_dir = Path("frontend/src/app")

print("=== 1. LOCALIZANDO ARCHIVOS DE app-reports-map ===")
map_files = list(front_dir.rglob("*reports-map*"))
for f in map_files:
    print(f"📄 {f}")

print("\n=== 2. PROPIEDADES DE LOS MUNICIPIOS EN EL GEOJSON ===")
geojson_path = Path("src/assets/geojsons/VALLE_DEL _CAUCA_SIMPLIFICADO.geojson")
if not geojson_path.exists():
    geojson_path = Path("frontend/src/assets/geojsons/VALLE_DEL _CAUCA_SIMPLIFICADO.geojson")

if geojson_path.exists():
    with open(geojson_path, "r", encoding="utf-8") as gf:
        data = json.load(gf)
        features = data.get("features", [])
        print(f"Total municipios en GeoJSON: {len(features)}")
        if features:
            print("Campos del primer municipio:", list(features[0].get("properties", {}).keys()))
            print("Valores de muestra:", features[0].get("properties", {}))
else:
    print("⚠️ No se encontró el archivo GeoJSON en la ruta esperada.")

print("\n=== 3. CÓDIGO FUENTE DE reports-map.component.ts ===")
ts_file = next((f for f in map_files if f.suffix == ".ts"), None)
if ts_file:
    print(f"--- {ts_file.name} ---")
    content = ts_file.read_text(encoding="utf-8", errors="ignore")
    # Imprimir primeras 80 líneas o lógica principal
    lines = content.splitlines()
    print("\n".join(lines[:90]))
    if len(lines) > 90:
        print(f"... ({len(lines) - 90} líneas restantes)")

print("\n=== 4. CÓDIGO HTML DE reports-map.component.html ===")
html_file = next((f for f in map_files if f.suffix == ".html"), None)
if html_file:
    print(f"--- {html_file.name} ---")
    print(html_file.read_text(encoding="utf-8", errors="ignore"))

