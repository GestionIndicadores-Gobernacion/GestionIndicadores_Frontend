import re
from pathlib import Path

service_file = Path("src/app/core/services/sismo.service.ts")
if not service_file.exists():
    print("❌ No se encontró sismo.service.ts")
    exit()

code = service_file.read_text(encoding="utf-8")

# Reemplazar la propiedad baseUrl para que apunte directamente a localhost:5001/api
code_fixed = re.sub(
    r"private get baseUrl\(\): string \{[\s\S]*?return url;\s*\}",
    "private readonly baseUrl = 'http://localhost:5001/api';",
    code
)

service_file.write_text(code_fixed, encoding="utf-8")
print("✅ sismo.service.ts configurado fijamente a http://localhost:5001/api")
