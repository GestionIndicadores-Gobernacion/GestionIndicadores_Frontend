import sqlite3
import shutil
from pathlib import Path

candidates = [
    Path("C:/Users/ramon/Documents/pagina/sismo_backend/auxilio_animal.db"),
    Path.cwd() / "auxilio_animal.db",
    Path.cwd().parent / "sismo_backend" / "auxilio_animal.db",
    Path("C:/Users/ramon/Documents/pagina/backend/auxilio_animal.db")
]

db_path = next((p for p in candidates if p.exists()), None)
if not db_path:
    print("❌ No se encontró auxilio_animal.db. Revisa la ruta de sismo_backend.")
    exit(1)

print(f"📦 Base de datos encontrada en: {db_path}")

# 1. Respaldo de seguridad
backup_path = db_path.with_suffix(".db.bak")
shutil.copyfile(db_path, backup_path)
print(f"🔒 Respaldo creado en: {backup_path.name}")

conn = sqlite3.connect(db_path)
c = conn.cursor()

# 2. Ver registros actuales que contengan Cali pero NO Calima
print("\n--- Variaciones actuales en salidas_alimentos ---")
c.execute("""
    SELECT DISTINCT municipio, COUNT(*) 
    FROM salidas_alimentos 
    WHERE UPPER(municipio) LIKE '%CALI%' AND UPPER(municipio) NOT LIKE '%CALIMA%'
    GROUP BY municipio
""")
filas = c.fetchall()
for m, cant in filas:
    print(f"  • '{m}' ({cant} registros)")

# 3. Unificar a 'Santiago de Cali'
c.execute("""
    UPDATE salidas_alimentos 
    SET municipio = 'Santiago de Cali'
    WHERE UPPER(municipio) LIKE '%CALI%' AND UPPER(municipio) NOT LIKE '%CALIMA%'
""")
afectados_alimentos = c.rowcount

# 4. Unificar también en censo_emergencias_refugios si existe
try:
    c.execute("""
        UPDATE censo_emergencias_refugios
        SET municipio = 'Santiago de Cali'
        WHERE UPPER(municipio) LIKE '%CALI%' AND UPPER(municipio) NOT LIKE '%CALIMA%'
    """)
    afectados_censo = c.rowcount
except Exception:
    afectados_censo = 0

conn.commit()
conn.close()

print(f"\n✅ Unificación completada: {afectados_alimentos} actas de alimentos actualizadas a 'Santiago de Cali'.")
if afectados_censo > 0:
    print(f"✅ {afectados_censo} refugios del censo actualizados a 'Santiago de Cali'.")
print("🎉 Base de datos consolidada con éxito.")
