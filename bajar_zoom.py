from pathlib import Path
import re

candidates = [
    Path.cwd(),
    Path.cwd() / "frontend",
    Path.cwd() / "GestionIndicadores_Frontend",
    Path("C:/Users/ramon/Documents/pagina/frontend"),
    Path("C:/Users/ramon/Documents/pagina/GestionIndicadores_Frontend")
]

FRONTEND_DIR = next((c for c in candidates if (c / "src" / "app").exists()), None)
if not FRONTEND_DIR:
    print("❌ No se encontró la carpeta del frontend.")
    exit(1)

ts_file = FRONTEND_DIR / "src" / "app" / "features" / "sismo" / "pages" / "resumen" / "resumen.component.ts"
code = ts_file.read_text(encoding="utf-8")

# Reemplazar resetearMapa con padding holgado de 24px y sin forzar setZoom adicional
nuevo_reset = """  resetearMapa(): void {
    if (this.map && this.geoJsonLayer) {
      this.map.fitBounds(this.geoJsonLayer.getBounds(), { padding: [24, 24] });
    }
  }"""

code = re.sub(
    r"  resetearMapa\(\): void \{[\s\S]*?this\.map\.fitBounds\([^}]*\}",
    nuevo_reset.strip(),
    code
)

ts_file.write_text(code, encoding="utf-8")
print("✅ Zoom alejado: padding holgado a 24px sin sobrezoom manual.")
