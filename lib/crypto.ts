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
      iv: iv,
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
      iv: iv,
    },
    key,
    encryptedBuffer
  );

  return new Blob([decryptedContent]);
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  const exportedKeyBuffer = new Uint8Array(exported);
  return Buffer.from(exportedKeyBuffer).toString('base64');
}

export async function importKeyFromRaw(rawArray: Uint8Array): Promise<CryptoKey> {
  return await window.crypto.subtle.importKey(
    "raw",
    rawArray,
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
  return Buffer.from(bytes).toString('base64');
}

export function base64ToBytes(base64: string): Uint8Array {
  const buffer = Buffer.from(base64, 'base64');
  return new Uint8Array(buffer);
}
