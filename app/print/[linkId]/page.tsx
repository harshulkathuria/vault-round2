"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { base64ToBytes, combineKeys, decryptFile, applyPdfSecurity } from '@/lib/crypto';
import { Printer, ShieldAlert, AlertCircle, Lock, ShieldCheck, Trash2 } from 'lucide-react';

export default function SecurePrintPage() {
  const { linkId } = useParams();
  const [status, setStatus] = useState('Initializing Sovereign Connection...');
  const [error, setError] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [docUrl, setDocUrl] = useState('');
  const [isPrinted, setIsPrinted] = useState(false);

  useEffect(() => {
    // 1. Anti-Screenshot & Copy Protection logic (preserved)
    const blockKeys = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        navigator.clipboard.writeText('');
        alert("ACCESS DENIED: Screenshots are cryptographically blocked.");
      }
      if (e.ctrlKey && (e.key === 'p' || e.key === 's' || e.key === 'c' || e.key === 'i' || e.key === 'u')) {
        if (e.key !== 'p') e.preventDefault();
      }
      if (e.key === 'F12') e.preventDefault();
    };
    
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keyup', blockKeys);
    document.addEventListener('keydown', blockKeys);

    return () => {
      document.removeEventListener('contextmenu', e => e.preventDefault());
      document.removeEventListener('keyup', blockKeys);
      document.removeEventListener('keydown', blockKeys);
    };
  }, []);

  useEffect(() => {
    // Self-Destruct Hook (preserved)
    const handleBeforePrint = async () => {
      try {
        console.log("Print Dialog Triggered! Initiating self-destruct.");
        await fetch(`/api/destruct/${linkId}`, { method: 'POST' });
        
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          for (let name of cacheNames) {
            await caches.delete(name);
          }
        }
        localStorage.clear();
        sessionStorage.clear();
        
        setTimeout(() => {
          setIsPrinted(true);
        }, 3000);

      } catch (err) {
        console.error("Destruct failed", err);
      }
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    return () => window.removeEventListener('beforeprint', handleBeforePrint);
  }, [linkId]);

  useEffect(() => {
    const initialize = async () => {
      try {
        const hash = window.location.hash.substring(1);
        if (!hash) throw new Error("CRITICAL: Decryption fragment missing from URL. Handshake failed.");
        const [clientKeyB64, ivB64] = hash.split('.');

        const verifyRes = await fetch(`/api/verify/${linkId}`);
        const verifyData = await verifyRes.json();
        
        if (!verifyRes.ok) throw new Error(verifyData.error || "Verification sequence failed.");

        setStatus('Decrypting Sovereign Payloads...');
        
        const clientKeyPart = base64ToBytes(clientKeyB64);
        const serverKeyPart = base64ToBytes(verifyData.serverKeyPart);
        const iv = base64ToBytes(ivB64);

        const masterKeyRaw = combineKeys(clientKeyPart, serverKeyPart);
        const cryptoKey = await window.crypto.subtle.importKey(
          "raw",
          masterKeyRaw as any,
          "AES-GCM",
          true,
          ["decrypt"]
        );

        const encryptedBuffer = base64ToBytes(verifyData.encryptedDocument).buffer as ArrayBuffer;
        
        const decryptedBlob = await decryptFile(encryptedBuffer, cryptoKey, iv);
        let finalBlob = decryptedBlob;

        if (decryptedBlob.type === 'application/pdf') {
          setStatus('Finalizing Security Headers...');
          const decryptedBuffer = await decryptedBlob.arrayBuffer();
          finalBlob = await applyPdfSecurity(decryptedBuffer, linkId as string);
        }

        const url = URL.createObjectURL(finalBlob);
        setDocUrl(url);
        setIsReady(true);
        setStatus("");
      } catch (err: any) {
        setError(err.message);
      }
    };

    initialize();
  }, [linkId]);

  const triggerPrint = () => {
    window.print();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-8">
        <div className="glass-sovereign border-error/30 p-12 rounded-3xl max-w-lg text-center space-y-8 cyber-glow">
          <div className="w-20 h-20 bg-error/10 rounded-2xl flex items-center justify-center text-error mx-auto border border-error/20">
            <ShieldAlert className="w-10 h-10 data-glow" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-black uppercase tracking-tighter font-space-grotesk text-white">Access Denied</h2>
            <p className="text-error/60 font-mono text-sm leading-relaxed">{error}</p>
          </div>
          <button onClick={() => window.location.reload()} className="text-label-sm border-b border-outline-variant hover:border-white text-white/40 hover:text-white transition-all pb-1">Retry Authentication</button>
        </div>
      </div>
    );
  }

  if (isPrinted) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-8 no-print">
        <div className="glass-sovereign border-primary-container/30 p-12 rounded-3xl max-w-lg text-center space-y-8 cyber-glow">
          <div className="w-20 h-20 bg-primary-container/10 rounded-2xl flex items-center justify-center text-primary-container mx-auto border border-primary-container/20">
            <Trash2 className="w-10 h-10 data-glow" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-black uppercase tracking-tighter font-space-grotesk text-white">Payload Burned</h2>
            <p className="text-white/30 text-sm font-medium leading-relaxed">
              The printing protocol was successfully authorized. As per zero-knowledge policy, the document and its decryption fragments have been permanently erased from our sovereign network.
            </p>
          </div>
          <div className="flex justify-center gap-2 items-center text-label-sm text-primary-container opacity-50">
            <ShieldCheck className="w-4 h-4" />
            <span>Sovereign Security Guarantee Compliance</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center w-full relative select-none font-inter overflow-x-hidden py-24">
      
      {/* Structural Decoration */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-primary-container/20 data-glow z-0"></div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30 pointer-events-none z-0"></div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          body, html { background: white !important; }
          .printable-doc { width: 100% !important; height: 100vh !important; object-fit: contain; }
        }
      `}} />

      {!isReady ? (
        <div className="flex flex-col items-center gap-8">
           <div className="w-16 h-16 border-2 border-primary-container/20 border-t-primary-container rounded-full animate-spin"></div>
           <div className="text-center space-y-2">
             <div className="text-primary-container font-black uppercase tracking-[0.3em] font-mono text-[10px] data-glow">{status}</div>
             <div className="text-white/10 text-[8px] uppercase tracking-widest font-mono">Bypassing insecure nodes...</div>
           </div>
        </div>
      ) : (
        <>
          <nav className="no-print absolute top-0 inset-x-0 p-8 flex justify-between items-center z-50">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-surface-container-high border border-outline-variant flex items-center justify-center rounded-sm">
                <Lock className="w-4 h-4 text-primary-container" />
              </div>
              <span className="text-label-sm tracking-widest font-black text-white">Vault Terminal View</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-primary-container/60 uppercase">AES-256-GCM Active</span>
              <div className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse shadow-[0_0_10px_#00f0ff]"></div>
            </div>
          </nav>

          {/* Document Workspace */}
          <div className="relative w-full max-w-5xl h-[75vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center border-4 border-surface-container-high transition-all duration-700 hover:border-primary-container/20 mt-12">
            
            <embed src={docUrl} className="printable-doc w-full h-full object-contain" style={{ border: 'none' }} />
            
            {/* High-End Editorial Watermark (Visible on screen, Hidden on print) */}
            <div className="no-print absolute inset-0 z-50 pointer-events-none overflow-hidden flex flex-col items-center justify-center opacity-40">
               {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex whitespace-nowrap -rotate-[30deg] relative mix-blend-difference text-white/20 select-none uppercase font-black" style={{ top: `${(i-3) * 12}%`, left: '-20%' }}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <span key={j} className="text-6xl mx-8 tracking-tighter">
                        Protected Document • Preview Mode • Decryption Required
                      </span>
                    ))}
                  </div>
               ))}
               <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 glass-sovereign border-primary-container/40 text-primary-container px-12 py-6 rounded-2xl text-3xl font-black uppercase tracking-tighter rotate-12 shadow-2xl backdrop-blur-xl border-4 data-glow">
                  Restricted View
               </div>
            </div>

            {/* Interaction Shield */}
            <div className="no-print absolute inset-0 z-[60]" onContextMenu={(e)=>e.preventDefault()}></div>
          </div>

          {/* Sovereign Action Bar */}
          <div className="no-print mt-12 w-full max-w-2xl px-8 flex flex-col gap-10 relative z-50">
             <button 
                onClick={triggerPrint}
                className="w-full bg-primary-container hover:bg-white text-on-primary text-xl font-black py-8 rounded-2xl transition-all flex items-center justify-center gap-4 cyber-glow uppercase tracking-widest active:scale-95 group font-space-grotesk"
              >
                <Printer className="w-8 h-8 transition-transform duration-500 group-hover:scale-110" />
                Authorize Print Protocol
             </button>
             
             <div className="flex gap-6 p-8 bg-surface-container-high/50 border border-outline-variant rounded-2xl items-start">
               <div className="w-12 h-12 rounded-xl bg-primary-container/10 border border-primary-container/20 flex items-center justify-center text-primary-container shrink-0">
                 <AlertCircle className="w-6 h-6 data-glow" />
               </div>
               <div className="space-y-2">
                 <h4 className="text-xs font-black uppercase tracking-widest text-white/90">Destruction Sequence Initialized</h4>
                 <p className="text-white/30 text-xs font-medium leading-relaxed">
                   Activating the print dialog will trigger the sovereign self-destruct sequence. The link will be permanently burned from the network once the dialog closes.
                 </p>
               </div>
             </div>
          </div>
        </>
      )}
    </div>
  );
}
