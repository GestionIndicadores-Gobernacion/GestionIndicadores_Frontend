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

# Ajuste calibrado: padding de 8px y un micro-incremento de +0.07
nuevo_reset = """  resetearMapa(): void {
    if (this.map && this.geoJsonLayer) {
      this.map.fitBounds(this.geoJsonLayer.getBounds(), { padding: [8, 8] });
      this.map.setZoom(this.map.getZoom() + 0.07);
    }
  }"""

code = re.sub(
    r"resetearMapa\(\): void \{[\s\S]*?this\.map\.fitBounds\(this\.geoJsonLayer\.getBounds\(\)[^}]*\}",
    nuevo_reset.strip(),
    code
)

ts_file.write_text(code, encoding="utf-8")
print("✅ Zoom calibrado suavemente a +0.07 en resumen.component.ts")
