import os
import re
import sys
from pathlib import Path

# 1. Localizar directorio frontend
candidates = [
    Path.cwd(),
    Path.cwd() / "frontend",
    Path.cwd() / "GestionIndicadores_Frontend",
    Path("C:/Users/ramon/Documents/pagina/frontend"),
    Path("C:/Users/ramon/Documents/pagina/GestionIndicadores_Frontend")
]

front_dir = next((c for c in candidates if (c / "src" / "app").exists()), None)
if not front_dir:
    print("❌ No se encontró la carpeta del Frontend ('src/app').")
    sys.exit(1)

# 2. Localizar la carpeta de páginas activa
posibles_pages = [
    front_dir / "src" / "app" / "features" / "sismo" / "pages",
    front_dir / "src" / "app" / "modules" / "sismo-2026" / "pages"
]
pages_dir = next((p for p in posibles_pages if p.exists()), None)

if not pages_dir:
    print(f"❌ No se encontró la carpeta de páginas en {front_dir}")
    sys.exit(1)

print("\n" + "="*60)
print(f"📐 APLICANDO MÁRGENES Y ESPACIADOS INSTITUCIONALES")
print(f"📁 Ruta: {pages_dir}")
print("="*60)

submodulos = ["resumen", "despachos", "entrega", "buscador", "farmacologia", "albergues", "voluntarios"]
archivos_modificados = 0

for sub in submodulos:
    folder = pages_dir / sub
    if not folder.exists():
        continue

    for html_file in folder.glob("*.component.html"):
        contenido = html_file.read_text(encoding="utf-8")

        # Reemplazar el contenedor principal por uno con padding institucional responsivo
        nuevo_contenido = re.sub(
            r'<div class="[^"]*space-y-6[^"]*"',
            '<div class="p-4 sm:p-6 lg:p-8 pb-12 space-y-6"',
            contenido,
            count=1
        )

        # Si no encontró space-y-6, reemplazar el primer div contenedor que encuentre
        if nuevo_contenido == contenido:
            nuevo_contenido = re.sub(
                r'<div class="[^"]*"',
                '<div class="p-4 sm:p-6 lg:p-8 pb-12 space-y-6"',
                contenido,
                count=1
            )

        if nuevo_contenido != contenido:
            html_file.write_text(nuevo_contenido, encoding="utf-8")
            print(f"✅ Margen aplicado a: {sub}/{html_file.name}")
            archivos_modificados += 1

print(f"\n🎉 Se ajustaron los márgenes con éxito en {archivos_modificados} páginas.")
print("Recarga tu navegador con Ctrl + Shift + R para ver el espaciado limpio y holgado.\n")
