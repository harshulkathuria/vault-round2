import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

export async function encryptFile(file: File, key: CryptoKey): Promise<{ encryptedBlob: Blob; iv: Uint8Array }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const arrayBuffer = await file.arrayBuffer();
  
  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as any,
    },
    key,
    arrayBuffer
  );

  return {
    encryptedBlob: new Blob([encryptedContent]),
    iv,
  };
}

export async function decryptFile(encryptedBuffer: ArrayBuffer, key: CryptoKey, iv: Uint8Array): Promise<Blob> {
  const decryptedContent = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv as any,
    },
    key,
    encryptedBuffer as any
  );

  // Detect basic mime types from magic bytes
  const bytes = new Uint8Array(decryptedContent);
  let type = "application/octet-stream";
  
  if (bytes.length >= 4) {
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      type = "application/pdf";
    } else if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      type = "image/jpeg";
    } else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      type = "image/png";
    }
  }

  return new Blob([decryptedContent], { type });
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  const exportedKeyBuffer = new Uint8Array(exported);
  return bytesToBase64(exportedKeyBuffer);
}

export async function importKeyFromRaw(rawArray: Uint8Array): Promise<CryptoKey> {
  return await window.crypto.subtle.importKey(
    "raw",
    rawArray as any,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"]
  );
}

export function splitKey(): { masterKeyRaw: Uint8Array; serverPartRaw: Uint8Array; clientPartRaw: Uint8Array } {
  const masterKeyRaw = window.crypto.getRandomValues(new Uint8Array(32));
  const serverPartRaw = window.crypto.getRandomValues(new Uint8Array(32));
  const clientPartRaw = new Uint8Array(32);

  for (let i = 0; i < 32; i++) {
    clientPartRaw[i] = masterKeyRaw[i] ^ serverPartRaw[i];
  }

  return { masterKeyRaw, serverPartRaw, clientPartRaw };
}

export function combineKeys(clientPartRaw: Uint8Array, serverPartRaw: Uint8Array): Uint8Array {
  const masterKeyRaw = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    masterKeyRaw[i] = clientPartRaw[i] ^ serverPartRaw[i];
  }
  return masterKeyRaw;
}

export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined' && Buffer.from) {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined' && Buffer.from) {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

export async function applyPdfSecurity(pdfBuffer: ArrayBuffer, linkId: string): Promise<Blob> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // We only set the permission locking here as requested
    // Note: Owner password is required to activate permission flags
    const ownerPassword = Math.random().toString(36).substring(2, 15);
    
    const securedPdfBytes = await pdfDoc.save({
      ownerPassword: ownerPassword,
      permissions: {
        printing: 'highResolution',
        modifying: false,
        copying: false,
        annotating: false,
        fillingForms: false,
        contentAccessibility: true, // Keep accessible but locked
        documentAssembly: false,
      },
    } as any);

    return new Blob([securedPdfBytes as any], { type: 'application/pdf' });
  } catch (e) {
    console.error("PDF Security failed, falling back to raw blob", e);
    return new Blob([pdfBuffer], { type: 'application/pdf' });
  }
}
