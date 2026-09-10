import os
from pathlib import Path

front_dir = Path("src")
if not front_dir.exists():
    front_dir = Path("frontend/src")

print("🔍 Buscando el componente del 'Mapa de cobertura' de Estefanía...\n")

# 1. Buscar menciones en HTML / TS
terminos = ["Mapa de cobertura", "Distribución geográfica", "cobertura", "municipios"]
encontrados = []

for ext in ["*.html", "*.ts"]:
    for f in front_dir.rglob(ext):
        # Ignorar la carpeta de sismo
        if "sismo" in str(f):
            continue
        try:
            txt = f.read_text(encoding="utf-8", errors="ignore")
            if "Mapa de cobertura" in txt or "Distribución geográfica" in txt:
                encontrados.append(f)
                print(f"📍 ENCONTRADO EN: {f}")
        except Exception:
            pass

# 2. Buscar si hay archivos GeoJSON o mapas en assets
print("\n🗺️ Buscando archivos GeoJSON o mapas vectoriales en assets:")
for f in front_dir.rglob("*"):
    if f.suffix.lower() in [".geojson", ".topojson", ".svg", ".json"] and any(k in f.name.lower() for k in ["valle", "municip", "map"]):
        print(f"📦 ASSET DE MAPA: {f}")

# 3. Si encontramos el archivo principal, mostrar un extracto
if encontrados:
    print("\n--- Fragmento del archivo encontrado ---")
    primer_archivo = encontrados[0]
    txt = primer_archivo.read_text(encoding="utf-8", errors="ignore")
    lineas = txt.splitlines()
    for i, l in enumerate(lineas):
        if "Mapa de cobertura" in l or "Distribución geográfica" in l:
            ini = max(0, i - 5)
            fin = min(len(lineas), i + 35)
            print("\n".join(lineas[ini:fin]))
            break
else:
    print("\n⚠️ No se encontró la frase literal exacta. Buscando componentes de mapa generales...")
    for f in front_dir.rglob("*map*.component.ts"):
        if "sismo" not in str(f):
            print(f"🗺️ Componente de mapa: {f}")

