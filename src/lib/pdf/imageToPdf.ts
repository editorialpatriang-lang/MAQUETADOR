import { PDFDocument } from 'pdf-lib';

/**
 * Convierte una imagen (JPEG/PNG) en un PDF de una página.
 * Útil para imponer imágenes como si fueran páginas.
 */
export async function imageToPdf(imageBytes: ArrayBuffer, imageType: 'jpeg' | 'png'): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const image = imageType === 'jpeg'
    ? await pdfDoc.embedJpg(imageBytes)
    : await pdfDoc.embedPng(imageBytes);
  const page = pdfDoc.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
  return pdfDoc.save();
}

/**
 * Detecta el tipo de imagen a partir de los primeros bytes.
 */
export function detectImageType(bytes: Uint8Array): 'jpeg' | 'png' | null {
  if (bytes.length < 4) return null;
  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'jpeg';
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'png';
  return null;
}