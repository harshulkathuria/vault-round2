import UploadFlow from "@/components/UploadFlow";
import { Shield, Cpu, Lock } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-surface overflow-hidden relative selection:bg-primary/30 font-inter">
      {/* Cinematic Technical Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-surface-container-low opacity-20 -skew-x-[15deg] translate-x-1/2"></div>
        <div className="absolute top-[20%] left-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] mix-blend-screen"></div>
        <div className="absolute bottom-0 right-[10%] w-[600px] h-[600px] bg-secondary-container/5 rounded-full blur-[120px] mix-blend-screen"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:48px_48px] opacity-20"></div>
      </div>
      
      <div className="relative z-10 container mx-auto px-8 lg:px-24 py-12 flex flex-col min-h-screen">
        
        {/* Technical Navbar */}
        <nav className="flex items-center justify-between py-8 no-print mb-32 border-b border-outline-variant">
          <div className="flex items-center gap-6">
            <div className="w-10 h-10 bg-primary-container rounded-sm flex items-center justify-center">
              <span className="font-space-grotesk font-black text-on-primary text-sm tracking-tighter">VP</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter text-white uppercase font-space-grotesk">Vault Print</span>
              <span className="text-label-sm leading-none">V2.4 Secure Protocol</span>
            </div>
          </div>
          <div className="hidden md:flex gap-8 items-center">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-secondary-container animate-pulse"></div>
              <span className="text-label-sm opacity-80">Network Active</span>
            </div>
            <div className="h-4 w-px bg-outline-variant"></div>
            <span className="text-label-sm border border-outline-variant px-5 py-2 rounded-full data-glow">End-to-End Encrypted</span>
          </div>
        </nav>

        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-24 items-start pb-24">
          
          {/* Left Hero Section (Intentional Asymmetry) */}
          <div className="lg:col-span-7 space-y-16 no-print order-2 lg:order-1 pt-8">
            <div className="space-y-6">
              <h1 className="text-display-lg">
                Secure.<br/>
                <span className="text-primary-container data-glow">Zero-Knowledge.</span><br/>
                Printing.
              </h1>
              <p className="text-xl text-white/40 max-w-xl leading-relaxed font-medium">
                Military-grade client-side encryption for your sensitive documents. Print PAN, Aadhaar, or private IDs at any public terminal without leaving a single byte behind.
              </p>
            </div>

            <div className="lg:grid lg:grid-cols-2 gap-12 space-y-8 lg:space-y-0">
               {[
                 { icon: <Shield className="w-5 h-5" />, title: "256-Bit Cryptography", desc: "AES-GCM encryption fragments generated in-browser." },
                 { icon: <Lock className="w-5 h-5" />, title: "Silent Destruct", desc: "Payloads permanently burned immediately after printing." },
                 { icon: <Cpu className="w-5 h-5" />, title: "Local Processing", desc: "No unencrypted data ever touches our sovereign servers." }
               ].map((feature, idx) => (
                 <div key={idx} className="space-y-4 group">
                   <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-primary-container group-hover:cyber-glow transition-all duration-500">
                     {feature.icon}
                   </div>
                   <div className="space-y-2">
                     <h3 className="text-lg font-bold text-white/90">{feature.title}</h3>
                     <p className="text-sm text-white/30 leading-relaxed font-medium">{feature.desc}</p>
                   </div>
                 </div>
               ))}
            </div>
          </div>

          {/* Right Upload Flow Section */}
          <div className="lg:col-span-5 w-full flex justify-center lg:justify-end no-print order-1 lg:order-2">
            <div className="w-full relative">
              {/* Technical Decorative Frame */}
              <div className="absolute -top-6 -left-6 w-12 h-12 border-t-2 border-l-2 border-primary-container opacity-40"></div>
              <div className="absolute -bottom-6 -right-6 w-12 h-12 border-b-2 border-r-2 border-primary-container opacity-40"></div>
              <div className="absolute top-1/2 -right-4 w-1 h-32 bg-primary-container/20 -translate-y-1/2 hidden lg:block"></div>
              
              <UploadFlow />
            </div>
          </div>

        </div>
        
        <footer className="py-12 flex flex-col md:flex-row justify-between items-center text-label-sm no-print mt-auto border-t border-outline-variant gap-8">
          <div className="flex gap-12">
            <p>© {new Date().getFullYear()} Vault Print Infrastructure</p>
            <p className="hidden md:block">ISO-27001 Compliant Strategy</p>
          </div>
          <div className="flex items-center gap-6">
            <span className="opacity-40 uppercase tracking-widest font-mono">STATUS: SOVEREIGN CANNONICAL</span>
            <div className="w-2 h-2 rounded-full bg-secondary-container"></div>
          </div>
        </footer>
      </div>
    </main>
  );
}
