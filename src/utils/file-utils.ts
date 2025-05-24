/**
 * Utility functions for handling files, types, and extensions
 */

/**
 * Get the file extension from a filename or path
 */
export function getExtension(filename: string): string {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
}

/**
 * Get the MIME type based on file extension
 */
export function getMimeType(extension: string): string | null {
  const ext = extension.toLowerCase();
  const mimeTypes: Record<string, string> = {
    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    heic: 'image/heic',
    heif: 'image/heif',
    
    // Videos
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    webm: 'video/webm',
    
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    
    // Other common types
    txt: 'text/plain',
    json: 'application/json',
    xml: 'application/xml',
  };
  
  return mimeTypes[ext] || null;
}

/**
 * Converts a base64 string to a Blob
 */
export function base64ToBlob(base64: string, contentType: string): Blob {
  const byteCharacters = atob(base64);
  const byteArrays = [];
  
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  
  return new Blob(byteArrays, { type: contentType });
}

/**
 * Get a readable file size string (e.g., "1.5 MB")
 */
export function getReadableFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Sanitize a filename by removing invalid characters
 */
export function sanitizeFilename(filename: string): string {
  // Replace invalid characters with underscores
  return filename.replace(/[\\/:*?"<>|]/g, '_');
}
