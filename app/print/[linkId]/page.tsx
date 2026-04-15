"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { base64ToBytes, combineKeys, decryptFile } from '@/lib/crypto';
import { Printer, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function SecurePrintPage() {
  const { linkId } = useParams();
  const [status, setStatus] = useState('Verifying Secure Link...');
  const [error, setError] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [docUrl, setDocUrl] = useState('');
  const [watermarkId, setWatermarkId] = useState('');
  const [isPrinted, setIsPrinted] = useState(false);

  useEffect(() => {
    // 1. Anti-Screenshot & Copy Protection via DOM events
    const blockKeys = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        navigator.clipboard.writeText(''); // Clear clipboard immediately
        alert("Screenshots are blocked by SecurePrint policy.");
      }
      if (e.ctrlKey && (e.key === 'p' || e.key === 's' || e.key === 'c' || e.key === 'i' || e.key === 'u')) {
        if (e.key !== 'p') {
          e.preventDefault();
        }
      }
      // F12 block
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
    // Self-Destruct Hook
    const handleBeforePrint = async () => {
      try {
        console.log("Print Dialog Triggered! Initiating self-destruct.");
        
        // 1. Invalidate backend URL
        await fetch(`/api/destruct/${linkId}`, { method: 'POST' });
        
        // 2. Clear browser caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          for (let name of cacheNames) {
            await caches.delete(name);
          }
        }
        localStorage.clear();
        sessionStorage.clear();
        
        // We delay setting isPrinted to true so the print dialog captures the document, 
        // then right after we swap to the destroyed state.
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
        if (!hash) throw new Error("Crucial decryption fragment is missing from URL.");
        const [clientKeyB64, ivB64] = hash.split('.');

        const verifyRes = await fetch(`/api/verify/${linkId}`);
        const verifyData = await verifyRes.json();
        
        if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");

        setStatus('Decrypting Document...');
        
        const clientKeyPart = base64ToBytes(clientKeyB64);
        const serverKeyPart = base64ToBytes(verifyData.serverKeyPart);
        const iv = base64ToBytes(ivB64);

        const masterKeyRaw = combineKeys(clientKeyPart, serverKeyPart);
        const cryptoKey = await window.crypto.subtle.importKey(
          "raw",
          masterKeyRaw,
          "AES-GCM",
          true,
          ["decrypt"]
        );

        const encryptedBuffer = base64ToBytes(verifyData.encryptedDocument).buffer;
        
        // Decrypt
        const decryptedBlob = await decryptFile(encryptedBuffer, cryptoKey, iv);
        const url = URL.createObjectURL(decryptedBlob);
        
        setDocUrl(url);
        setWatermarkId(Math.random().toString(36).substring(2, 8).toUpperCase());
        
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
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-red-950/50 border border-red-500/50 p-8 rounded-2xl max-w-md text-center text-red-200">
          <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (isPrinted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 no-print">
        <div className="bg-emerald-950/50 border border-emerald-500/50 p-8 rounded-2xl max-w-md text-center text-emerald-200">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-emerald-500" />
          <h2 className="text-2xl font-bold mb-2">Self-Destruct Sequence Complete</h2>
          <p>This document has been authorized for printing and the URL has been permanently burned.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center w-full relative select-none">

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          .only-print { display: block !important; }
          body, html { background: white; width: 100%; height: 100%; margin: 0; padding: 0; }
          .printable-doc { width: 100% !important; height: 100vh !important; object-fit: contain; }
        }
      `}} />

      {!isReady ? (
        <div className="text-center text-emerald-400 font-mono tracking-widest">{status}</div>
      ) : (
        <>
          {/* Visual Container for the Document */}
          <div className="relative w-full max-w-4xl h-[80vh] bg-white rounded-xl overflow-hidden shadow-2xl flex items-center justify-center border border-white/20">
            
            {/* The actual Document (Visible on screen and on print) */}
            <embed src={docUrl} className="printable-doc w-full h-full object-contain" style={{ border: 'none' }} />
            
            {/* Extremely Heavy Watermark Layer (VISIBLE ON SCREEN, HIDDEN ON PRINT) */}
            <div className="no-print absolute inset-0 z-50 pointer-events-none overflow-hidden flex flex-col items-center justify-center top-0 left-0 right-0 bottom-0">
               {/* Creating dense diagonal repeating pattern */}
               {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} className="flex whitespace-nowrap -rotate-45 relative opacity-30 mix-blend-difference text-white" style={{ top: `${(i-10) * 8}%`, left: '-50%' }}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <span key={j} className="text-4xl font-extrabold mx-4">
                        VAULT PRINT PREVIEW ONLY / PROTECTED
                      </span>
                    ))}
                  </div>
               ))}
               <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600/90 text-white px-8 py-4 rounded-full text-2xl font-black rotate-12 shadow-2xl backdrop-blur-sm border-2 border-red-400">
                  PREVIEW - DO NOT PRINT SCREEN
               </div>
            </div>

            {/* Click hijacker overlay to prevent right clicks and dragging out the preview */}
            <div className="no-print absolute inset-0 z-[60]" onContextMenu={(e)=>e.preventDefault()}></div>

          </div>

          {/* Action Button (Hidden on Print) */}
          <div className="no-print mt-8 w-full max-w-xl text-center">
             <button 
                onClick={triggerPrint}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-black text-xl font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-3 animate-pulse shadow-[0_0_40px_rgba(16,185,129,0.3)]"
              >
                <Printer className="w-8 h-8" />
                PRINT ORIGINAL DOCUMENT
             </button>
             <p className="mt-4 text-white/50 text-sm">
               Clicking print will send the clean, original document to your printer, bypassing the visual watermarks. The link will self-destruct immediately after.
             </p>
          </div>
        </>
      )}
    </div>
  );
}
