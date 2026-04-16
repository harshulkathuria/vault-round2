"use client";
import React, { useState, useRef } from 'react';
import { Upload, FileText, ShieldCheck, AlertCircle, ArrowRight, Lock, Copy, Check, ShieldAlert } from 'lucide-react';
import { encryptFile, splitKey, bytesToBase64 } from '@/lib/crypto';
import { QRCodeSVG } from 'qrcode.react';

export default function UploadFlow() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      setStatus('Fragmenting Encryption Keys (AES-256-GCM)...');
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
      setStatus('Dispatching Secure Payload to Vault...');

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
      setStatus('Generating Sovereign Link ID...');

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
      setStatus(`System Error: ${e.message}`);
      setUploadProgress(0);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto glass-sovereign rounded-3xl relative overflow-hidden transition-all duration-700 cyber-glow group">
      
      {/* Structural Accent Line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-primary-container data-glow opacity-50"></div>

      <div className="p-10 lg:p-14 relative z-10">
        
        {step === 1 && (
          <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-primary-container mb-2">
                <ShieldCheck className="w-5 h-5 data-glow" />
                <span className="text-label-sm font-black">Secure Ingest Protocol</span>
              </div>
              <h2 className="text-4xl font-black text-white uppercase tracking-tighter font-space-grotesk">Vault Upload</h2>
              <p className="text-white/30 text-sm font-medium leading-relaxed">
                Documents are cryptographically fragmented <span className="text-primary-container opacity-80">client-side</span> before server transmission.
              </p>
            </div>

            <div 
              className={`relative group/zone border border-outline-variant bg-surface-container-lowest/50 rounded-2xl p-16 flex flex-col items-center justify-center cursor-pointer transition-all duration-500 overflow-hidden ${file ? 'border-primary-container/40 bg-surface-container-high' : 'hover:border-primary-container/30 hover:bg-surface-container-low'}`}
              onClick={() => fileInputRef.current?.click()}
            >
              {/* Bottom focus accent */}
              <div className={`absolute bottom-0 inset-x-0 h-[2px] bg-primary-container transition-transform duration-500 origin-center ${file ? 'scale-x-100' : 'scale-x-0 group-hover/zone:scale-x-100'}`}></div>
              
              <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf,image/png,image/jpeg" />
              
              {file ? (
                <div className="flex flex-col items-center animate-in zoom-in-90 duration-300">
                  <div className="w-20 h-20 rounded-2xl bg-primary-container/10 flex items-center justify-center text-primary-container mb-6 cyber-glow">
                    <FileText className="w-10 h-10 data-glow" />
                  </div>
                  <p className="text-white font-black text-xl text-center tracking-tight mb-2 uppercase font-space-grotesk">{file.name}</p>
                  <p className="text-primary-container/60 font-mono text-[10px] font-black uppercase tracking-widest bg-primary-container/5 px-4 py-2 rounded-full border border-primary-container/20">{(file.size / 1024 / 1024).toFixed(2)} MEGABYTES</p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-2xl bg-surface-container-high flex items-center justify-center text-white/10 mb-8 group-hover/zone:text-primary-container/40 transition-colors duration-500">
                    <Upload className="w-10 h-10 transition-transform duration-700 group-hover/zone:-translate-y-2" />
                  </div>
                  <p className="text-white/80 font-bold text-lg uppercase tracking-tight font-space-grotesk">Initiate Data Transfer</p>
                  <p className="text-white/20 text-xs mt-3 font-black tracking-[0.2em] uppercase">Allowed formats: PDF • PNG • JPG</p>
                </div>
              )}
            </div>

            {status && status.startsWith('System Error') && (
              <div className="w-full mt-6 bg-error/10 border border-error/30 text-error p-5 rounded-xl text-sm font-bold flex gap-4 items-center animate-in slide-in-from-top-2">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                {status}
              </div>
            )}

            {!uploadProgress && (
              <button 
                onClick={file ? handleUpload : undefined} 
                disabled={!file}
                className={`w-full py-6 rounded-xl font-black text-lg uppercase tracking-widest transition-all duration-700 font-space-grotesk flex items-center justify-center gap-4 ${file ? 'bg-primary-container text-on-primary cyber-glow hover:scale-[1.02] active:scale-95 cursor-pointer' : 'bg-surface-container-high text-white/10 cursor-not-allowed border border-outline-variant'}`}
              >
                Encrypt & Vault <ArrowRight className="w-6 h-6" />
              </button>
            )}

            {uploadProgress > 0 && (
              <div className="w-full space-y-6 pt-4">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col gap-1">
                    <span className="text-label-sm text-primary-container data-glow animate-pulse">{status}</span>
                    <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Protocol status: Processing</span>
                  </div>
                  <span className="text-4xl font-black font-space-grotesk text-white tabular-nums">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-surface-container-lowest border border-outline-variant rounded-full h-[6px] p-0 overflow-hidden shadow-inner">
                  <div className="bg-primary-container h-full rounded-full transition-all duration-500 ease-out cyber-glow relative overflow-hidden" style={{width: `${uploadProgress}%`}}>
                     <div className="absolute top-0 bottom-0 left-0 right-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)] -translate-x-[100%] animate-burn"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="w-full space-y-3 mb-12">
              <div className="flex items-center gap-3 text-secondary-container">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-label-sm font-black">Encryption Verified</span>
              </div>
              <h2 className="text-4xl font-black text-white uppercase tracking-tighter font-space-grotesk">Protocol Ready</h2>
            </div>
            
            <div className="relative group/qr">
              <div className="absolute inset-0 bg-primary-container/10 blur-3xl rounded-full opacity-50 group-hover/qr:opacity-100 transition-opacity duration-700"></div>
              <div className="bg-white p-8 rounded-3xl mb-12 shadow-2xl relative border-4 border-surface-container-high transform group-hover/qr:scale-105 transition-transform duration-500">
                <QRCodeSVG value={generatedUrl} size={240} level="H" includeMargin={false} />
              </div>
            </div>
            
            <div className="w-full bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl flex items-center justify-between mb-12 group/link transition-all duration-500 hover:border-primary-container/20">
              <div className="flex flex-col gap-1 overflow-hidden">
                <span className="text-label-sm opacity-30">Sovereign Link ID</span>
                <p className="text-primary-container text-xs font-mono pr-4 truncate font-black lowercase tracking-wider">{generatedUrl}</p>
              </div>
              <button 
                onClick={handleCopy}
                 className={`shrink-0 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all duration-500 ${isCopied ? 'bg-secondary-container text-black' : 'bg-surface-container-high text-white hover:bg-primary-container hover:text-on-primary active:scale-95'}`}
              >
                {isCopied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy ID</>}
              </button>
            </div>

            <div className="bg-error/5 border border-error/20 p-6 rounded-2xl flex gap-6 items-start shadow-inner">
              <div className="shrink-0 w-12 h-12 bg-error/10 rounded-xl flex items-center justify-center text-error border border-error/20">
                <AlertCircle className="w-6 h-6 data-glow"/>
              </div>
              <div className="space-y-2">
                <strong className="block text-error text-xs font-black uppercase tracking-widest font-space-grotesk">Critical Destruction Advisory</strong>
                <p className="text-white/40 text-xs font-medium leading-relaxed">
                  The 256-bit encryption fragment resides only in this ID. Zero recovery available. Link expires in 4 hours or upon single-use printing.
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => { setFile(null); setStep(1); setUploadProgress(0); }} 
              className="mt-12 text-label-sm hover:text-white transition-colors duration-300 border-b border-outline-variant hover:border-white/40 pb-1 font-black"
            >
              Initiate New Protocol
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
