import UploadFlow from "@/components/UploadFlow";

export default function Home() {
  return (
    <main className="min-h-screen bg-black overflow-hidden relative selection:bg-emerald-500/30">
      {/* Background gradients */}
      <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-emerald-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-cyan-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-12 flex flex-col min-h-screen">
        <nav className="flex items-center justify-between py-6 no-print">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="font-bold text-black text-sm">SP</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">SecurePrint</span>
          </div>
        </nav>

        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <UploadFlow />
        </div>
        
        <footer className="py-6 text-center text-white/30 text-sm">
          <p>End-to-End Encrypted. Built for Aadhaar & PAN security.</p>
        </footer>
      </div>
    </main>
  );
}
