"use client";
import React, { useState, useRef } from 'react';
import { UploadCloud, File, ShieldCheck, AlertTriangle } from 'lucide-react';
import { encryptFile, splitKey, bytesToBase64 } from '@/lib/crypto';
import { QRCodeSVG } from 'qrcode.react';

export default function UploadFlow() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generatedUrl, setGeneratedUrl] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      setStatus('Encrypting locally (AES-256-GCM)...');
      setUploadProgress(10);
      
      const { masterKeyRaw, serverPartRaw, clientPartRaw } = splitKey();
      const cryptoKey = await window.crypto.subtle.importKey(
        "raw",
        masterKeyRaw,
        "AES-GCM",
        true,
        ["encrypt"]
      );

      const { encryptedBlob, iv } = await encryptFile(file, cryptoKey);
      setUploadProgress(40);
      setStatus('Uploading secure payload...');

      const formData = new FormData();
      formData.append('file', encryptedBlob);
      formData.append('iv', bytesToBase64(iv));

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();

      if(!uploadData.success) throw new Error(uploadData.error);
      
      setUploadProgress(70);
      setStatus('Generating Secure Print Link...');

      const linkRes = await fetch('/api/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId: uploadData.fileId,
          serverKeyPart: bytesToBase64(serverPartRaw)
        })
      });

      const linkData = await linkRes.json();
      if(!linkData.linkId) throw new Error(linkData.error);

      setUploadProgress(100);
      setStatus('');
      
      const baseUrl = window.location.origin;
      const hashData = `${bytesToBase64(clientPartRaw)}.${bytesToBase64(iv)}`;
      setGeneratedUrl(`${baseUrl}/print/${linkData.linkId}#${hashData}`);
      setStep(2);

    } catch (e: any) {
      console.error(e);
      setStatus(`Error: ${e.message}`);
      setUploadProgress(0);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-10 p-8 glass-panel rounded-3xl relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 border border-white/10 shadow-xl">
          <ShieldCheck className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Anonymous Secure Upload</h2>
        <p className="text-white/60 text-center mb-8 text-sm">
          Military-grade encryption. Generate a one-time link. Self-destructs immediately upon printing.
        </p>

        {step === 1 && (
          <div className="w-full animate-in fade-in zoom-in-95">
            <div 
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/20 hover:border-white/40 hover:bg-white/5'}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf,image/png,image/jpeg" />
              {file ? (
                <>
                  <File className="w-12 h-12 text-emerald-400 mb-4" />
                  <p className="text-white font-medium text-center">{file.name}</p>
                  <p className="text-white/40 text-sm mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </>
              ) : (
                <>
                  <UploadCloud className="w-12 h-12 text-white/40 mb-4" />
                  <p className="text-white/80 font-medium">Click or drag document to encrypt</p>
                  <p className="text-white/40 text-xs mt-2">Only PDF, JPG, PNG allowed</p>
                </>
              )}
            </div>

            {file && !uploadProgress && (
              <button onClick={handleUpload} className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold py-3 rounded-xl transition-all">
                Encrypt & Generate Link
              </button>
            )}

            {uploadProgress > 0 && (
              <div className="w-full mt-6">
                <div className="flex justify-between text-xs text-white/60 mb-2">
                  <span>{status}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 transition-all duration-300 h-full" style={{width: `${uploadProgress}%`}}></div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white p-4 rounded-2xl mb-6 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
              <QRCodeSVG value={generatedUrl} size={200} level="M" />
            </div>
            
            <div className="w-full bg-black/40 border border-white/10 p-4 rounded-xl flex items-center justify-between mb-4 break-all">
              <p className="text-emerald-400 text-sm font-mono leading-tight pr-4">{generatedUrl}</p>
              <button 
                onClick={() => navigator.clipboard.writeText(generatedUrl)}
                 className="shrink-0 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-sm transition-all"
              >
                Copy
              </button>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-3 text-amber-200 text-sm">
              <AlertTriangle className="shrink-0 w-5 h-5"/>
              <p>This link contains the decryption key. Keep it safe. It will expire in 4 hours and will permanently self-destruct immediately upon generation of the print spool.</p>
            </div>
            
            <button 
              onClick={() => { setFile(null); setStep(1); setUploadProgress(0); }} 
              className="mt-6 text-white/50 hover:text-white transition"
            >
              Upload another document
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
