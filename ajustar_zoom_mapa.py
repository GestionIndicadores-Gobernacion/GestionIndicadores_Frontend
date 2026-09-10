from pathlib import Path

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

# 1. Habilitar zoom fraccional suave en inicializarMapa
code = code.replace(
    """    this.map = L.map('mapa-valle', {
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: true
    }).setView([3.85, -76.35], 8.5);""",
    """    this.map = L.map('mapa-valle', {
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: true,
      zoomSnap: 0.05,
      zoomDelta: 0.25
    }).setView([3.85, -76.35], 8.8);"""
)

# 2. Centralizar el ajuste de zoom con +15% de tamaño (+0.22 zoom level)
nuevo_reset = """  resetearMapa(): void {
    if (this.map && this.geoJsonLayer) {
      this.map.fitBounds(this.geoJsonLayer.getBounds(), { padding: [0, 0] });
      this.map.setZoom(this.map.getZoom() + 0.22);
    }
  }"""

# Reemplazar la función resetearMapa
viejo_reset = """  resetearMapa(): void {
    if (this.map && this.geoJsonLayer) {
      this.map.fitBounds(this.geoJsonLayer.getBounds(), { padding: [10, 10] });
    }
  }"""

if viejo_reset in code:
    code = code.replace(viejo_reset, nuevo_reset)
else:
    # Si tiene ligeras variaciones
    import re
    code = re.sub(
        r"resetearMapa\(\): void \{[\s\S]*?this\.map\.fitBounds\(this\.geoJsonLayer\.getBounds\(\)[^}]*\}",
        nuevo_reset.strip(),
        code
    )

# 3. Hacer que renderizarPoligonos use el mismo zoom inicial optimizado
code = code.replace(
    "this.map.fitBounds(this.geoJsonLayer.getBounds(), { padding: [10, 10] });",
    "this.resetearMapa();"
)

ts_file.write_text(code, encoding="utf-8")
print("✅ Zoom del mapa ampliado un 15% con zoomSnap fraccional en resumen.component.ts")
