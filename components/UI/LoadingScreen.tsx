
import React, { useEffect, useState } from 'react';
import { Cpu, HardDrive, Zap, ShieldCheck } from 'lucide-react';

interface LoadingScreenProps {
    onComplete: () => void;
}

const BOOT_SEQUENCE = [
    { text: "INITIALIZING ENRON_OS V4.0...", delay: 200 },
    { text: "CHECKING MEMORY INTEGRITY... 64MB OK", delay: 400 },
    { text: "MOUNTING OFFSHORE ACCOUNTS...", delay: 600 },
    { text: "LOADING SHADER CACHE...", delay: 800 },
    { text: "CONNECTING TO CALIFORNIA GRID...", delay: 1000 },
    { text: "BYPASSING SEC PROTOCOLS...", delay: 1500 },
    { text: "SYSTEM READY.", delay: 2000 }
];

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete }) => {
    const [lines, setLines] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let currentIndex = 0;
        
        const typeNextLine = () => {
            if (currentIndex >= BOOT_SEQUENCE.length) {
                setTimeout(onComplete, 500);
                return;
            }

            const item = BOOT_SEQUENCE[currentIndex];
            setLines(prev => [...prev, item.text]);
            setProgress(((currentIndex + 1) / BOOT_SEQUENCE.length) * 100);
            
            currentIndex++;
            setTimeout(typeNextLine, item.delay / 2); // Speed up for UX
        };

        typeNextLine();
    }, [onComplete]);

    return (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center font-mono text-blue-500 p-8">
            <div className="w-full max-w-2xl">
                <div className="border-b-2 border-blue-500 mb-4 pb-2 flex justify-between items-end">
                    <h1 className="text-4xl font-black italic">ENRON BIOS</h1>
                    <span className="animate-pulse">v.1999.build.45</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-8 text-xs text-blue-300">
                    <div className="flex items-center gap-2"><Cpu size={14}/> CPU: PENTIUM III @ 800MHZ</div>
                    <div className="flex items-center gap-2"><HardDrive size={14}/> RAM: 256MB ECC</div>
                    <div className="flex items-center gap-2"><Zap size={14}/> GPU: VOODOO 3 3000</div>
                    <div className="flex items-center gap-2"><ShieldCheck size={14}/> SECURE BOOT: DISABLED</div>
                </div>

                <div className="h-64 overflow-hidden mb-4 border border-blue-900 bg-blue-950/20 p-4 font-mono text-sm shadow-[inset_0_0_20px_rgba(0,0,50,0.5)]">
                    {lines.map((line, i) => (
                        <div key={i} className="mb-1">{`> ${line}`}</div>
                    ))}
                    <div className="animate-pulse">_</div>
                </div>

                <div className="w-full h-2 bg-blue-900 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-blue-400 transition-all duration-300 ease-out" 
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
