// core/utils/image-compress.ts
// Comprime/redimensiona una imagen en el navegador y la devuelve como data URL.
// Se usa antes de enviar adjuntos del centro de soporte para no inflar la BD ni
// superar el límite de tamaño de request del backend (MAX_CONTENT_LENGTH).

export interface CompressOptions {
  /** Dimensión máxima (ancho o alto) en px. La imagen se reescala manteniendo proporción. */
  maxDim?: number;
  /** Calidad de salida 0..1 (solo aplica a formatos con pérdida). */
  quality?: number;
  /** MIME de salida. webp comprime muy bien y conserva transparencia. */
  mime?: string;
}

const DEFAULTS: Required<CompressOptions> = {
  maxDim: 1800,
  quality: 0.85,
  mime: 'image/webp',
};

/**
 * Lee un File/Blob de imagen, lo reescala si excede `maxDim` y lo re-codifica.
 * Si algo falla (canvas no disponible, formato no soportado), cae de vuelta al
 * data URL original sin comprimir.
 */
export function compressImageFile(file: File | Blob, opts: CompressOptions = {}): Promise<string> {
  const { maxDim, quality, mime } = { ...DEFAULTS, ...opts };

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const original = reader.result as string;
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        if (width > maxDim || height > maxDim) {
          const scale = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(original);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        try {
          const out = canvas.toDataURL(mime, quality);
          // Si el navegador no soporta el mime pedido, toDataURL devuelve PNG.
          // Aun así es un data URL de imagen válido, así que lo aceptamos.
          resolve(out && out.startsWith('data:image/') ? out : original);
        } catch {
          resolve(original);
        }
      };

      img.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
      img.src = original;
    };

    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}
