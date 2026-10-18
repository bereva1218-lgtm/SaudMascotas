// Reduce y comprime una foto en el navegador antes de enviarla (data URL JPEG).
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_FILE_MB = 10;

export function compressImage(file: File, maxDim = 1024, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      reject(new Error("Formato no soportado. Usa fotos JPG, PNG o WebP"));
      return;
    }
    if (file.size > MAX_IMAGE_FILE_MB * 1024 * 1024) {
      reject(new Error(`La foto supera los ${MAX_IMAGE_FILE_MB} MB`));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la foto"));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo procesar la foto"));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo procesar la foto"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
