"use client";
import React, { useState, useRef } from 'react';
import { UploadCloud, File, ShieldCheck, AlertTriangle, ArrowRight, Lock } from 'lucide-react';
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
      setUploadProgress(15);
      
      const { masterKeyRaw, serverPartRaw, clientPartRaw } = splitKey();
      const cryptoKey = await window.crypto.subtle.importKey(
        "raw",
        masterKeyRaw as any,
        "AES-GCM",
        true,
        ["encrypt"]
      );

      const { encryptedBlob, iv } = await encryptFile(file, cryptoKey);
      setUploadProgress(45);
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
      
      setUploadProgress(75);
      setStatus('Generating Secure Print Link...');

      const linkRes = await fetch('/api/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileId: uploadData.storagePath,
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
    <div className="w-full max-w-lg mx-auto glass-premium rounded-[2.5rem] relative overflow-hidden transition-all duration-500 hover:shadow-[0_0_80px_rgba(52,211,153,0.15)] group">
      
      {/* Glossy top highlight */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"></div>

      <div className="p-10 sm:p-12 relative z-10 flex flex-col items-center">
        
        {step === 1 && (
          <div className="w-full flex justify-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-2xl flex items-center justify-center border border-emerald-500/30 shadow-[0_0_30px_rgba(52,211,153,0.2)]">
              <Lock className="w-10 h-10 text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,1)]" />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="w-full text-center mb-8">
            <h2 className="text-3xl font-extrabold mb-3 text-white tracking-tight">Vault Upload</h2>
            <p className="text-white/50 text-sm font-medium">
              Files are mathematically encrypted <span className="text-emerald-400/80">client-side</span> before leaving your device.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="w-full animate-in fade-in zoom-in-95 duration-500">
            <div 
              className={`border-2 border-dashed rounded-[2rem] p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${file ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_40px_rgba(52,211,153,0.15)__inset]' : 'border-white/10 hover:border-emerald-500/50 hover:bg-white/5 group-hover:border-white/20'}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf,image/png,image/jpeg" />
              {file ? (
                <>
                  <File className="w-16 h-16 text-emerald-400 mb-4 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                  <p className="text-white font-bold text-lg text-center tracking-tight">{file.name}</p>
                  <p className="text-emerald-400/70 font-mono text-sm mt-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </>
              ) : (
                <>
                  <UploadCloud className="w-16 h-16 text-white/30 mb-6 transition-transform duration-500 group-hover:-translate-y-2 group-hover:text-emerald-400/80" />
                  <p className="text-white/90 font-semibold text-lg">Click to select file</p>
                  <p className="text-white/40 text-sm mt-3 font-medium tracking-wide border border-white/5 bg-white/5 px-4 py-1.5 rounded-full">PDF, JPG, PNG</p>
                </>
              )}
            </div>

            {status && status.startsWith('Error') && (
              <div className="w-full mt-6 bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm font-medium shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                {status}
              </div>
            )}

            {file && !uploadProgress && !status.startsWith('Error') && (
              <button onClick={handleUpload} className="w-full mt-8 bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-black font-extrabold text-lg py-5 rounded-2xl transition-all shadow-[0_0_30px_rgba(52,211,153,0.4)] hover:shadow-[0_0_50px_rgba(52,211,153,0.6)] hover:-translate-y-1 flex items-center justify-center gap-2">
                Encrypt & Generate Link <ArrowRight className="w-5 h-5" />
              </button>
            )}

            {file && !uploadProgress && status.startsWith('Error') && (
              <button onClick={handleUpload} className="w-full mt-8 bg-white/10 hover:bg-white/20 text-white font-bold text-lg py-5 rounded-2xl transition-all border border-white/20 flex items-center justify-center gap-2">
                 Try Again
              </button>
            )}

            {uploadProgress > 0 && (
              <div className="w-full mt-10">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-emerald-400 font-medium text-sm tracking-wide animate-pulse">{status}</span>
                  <span className="text-white font-mono font-bold text-lg drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-black/50 border border-white/10 rounded-full h-3 p-0.5 overflow-hidden shadow-inner">
                  <div className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_20px_rgba(52,211,153,0.8)] relative overflow-hidden" style={{width: `${uploadProgress}%`}}>
                     <div className="absolute top-0 bottom-0 left-0 right-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)] -translate-x-[100%] animate-[shimmer_1.5s_infinite]"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h2 className="text-3xl font-extrabold mb-8 text-white tracking-tight">Print Ready</h2>
            
            <div className="bg-white p-6 rounded-[2rem] mb-10 shadow-[0_0_60px_rgba(52,211,153,0.4)] border border-white border-opacity-20 transform hover:scale-105 transition-transform duration-500">
              <QRCodeSVG value={generatedUrl} size={220} level="H" />
            </div>
            
            <div className="w-full bg-black/60 border border-white/10 p-5 rounded-2xl flex items-center justify-between mb-8 shadow-inner backdrop-blur-md hover:border-emerald-500/30 transition-colors duration-500">
              <p className="text-emerald-400 text-sm font-mono leading-tight pr-4 break-all truncate font-medium">{generatedUrl}</p>
              <button 
                onClick={() => navigator.clipboard.writeText(generatedUrl)}
                 className="shrink-0 bg-white/10 hover:bg-emerald-500 hover:text-black font-semibold text-white px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg active:scale-95"
              >
                Copy
              </button>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl flex gap-4 items-start text-amber-200/90 text-sm leading-relaxed shadow-[0_0_30px_rgba(245,158,11,0.1)]">
              <AlertTriangle className="shrink-0 w-6 h-6 text-amber-400 mt-0.5 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]"/>
              <div>
                <strong className="block text-amber-400 mb-1 font-bold">CRITICAL SECURITY WARNING</strong>
                This link contains the 256-bit decryption key. It cannot be recovered. It will expire in 4 hours and will permanently self-destruct upon printing.
              </div>
            </div>
            
            <button 
              onClick={() => { setFile(null); setStep(1); setUploadProgress(0); }} 
              className="mt-8 text-white/40 hover:text-white font-medium transition-colors duration-300 border-b border-transparent hover:border-white/30 pb-1"
            >
              Encrypt another document
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
