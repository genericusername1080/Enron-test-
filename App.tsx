
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RotateCcw, AlertTriangle, Zap, DollarSign, Activity, ShieldAlert, TrendingUp, TrendingDown, Lock, Globe, XCircle, Siren, Briefcase, Flag, CloudRain, CloudSun, Snowflake, CloudLightning, Atom, MessageSquareQuote } from 'lucide-react';
import Scene3D from './components/Scene3D';
import ProgressBar from './components/UI/ProgressBar';
import { GameState, LogEvent, StockPoint, Difficulty, SPE } from './types';
import { INITIAL_STATE, PRICES, MAX_TEMP, MAX_PRES, MAX_RAD, MAX_POWER, HISTORIC_EVENTS, START_DATE, HISTORIC_WEATHER_PATTERNS, MELTDOWN_TEMP_START, MELTDOWN_PRES_START } from './constants';
import { playSound, initAudio, startAmbience } from './utils/audioUtils';
import { generateCorporateSpin, speakCorporateAdvice } from './services/geminiService';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const App: React.FC = () => {
    const gameState = useRef<GameState>({ ...INITIAL_STATE });
    const [uiState, setUiState] = useState<GameState>({ ...INITIAL_STATE });
    const [logs, setLogs] = useState<LogEvent[]>([]);
    const [stockHistory, setStockHistory] = useState<StockPoint[]>([]);
    const [activeTab, setActiveTab] = useState<'market' | 'bank' | 'partnerships' | 'shop'>('market');
    const [cutaway, setCutaway] = useState(true);
    const [started, setStarted] = useState(false);
    const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.ETHICAL);
    const [ticker, setTicker] = useState("Initializing Enron Data Feed...");
    const [activeAlert, setActiveAlert] = useState<{title: string, message: string, type: 'info' | 'warning' | 'danger'} | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const addLog = useCallback((message: string, type: LogEvent['type'] = 'info') => {
        const newLog = { id: Date.now(), message, type, timestamp: new Date().toLocaleTimeString() };
        setLogs(prev => [newLog, ...prev].slice(0, 5));
    }, []);

    const triggerAlert = useCallback((title: string, message: string, type: 'info' | 'warning' | 'danger' = 'warning') => {
        setActiveAlert({ title, message, type });
        addLog(`${title}: ${message}`, type);
        if (type === 'danger') playSound('alarm');
        else playSound('repair');
        setTimeout(() => setActiveAlert(null), 5000);
    }, [addLog]);

    const handleConsultCEO = async () => {
        if (isSpeaking) return;
        playSound('click');
        setIsSpeaking(true);
        addLog("Dialing Ken Lay's private line...", 'info');
        const audioData = await speakCorporateAdvice(gameState.current);
        if (audioData) {
            const ctx = new AudioContext();
            const buffer = await ctx.decodeAudioData(audioData.buffer);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.onended = () => setIsSpeaking(false);
            source.start();
        } else {
            setIsSpeaking(false);
        }
    };

    const createSPE = () => {
        const s = gameState.current;
        if (s.score < PRICES.CREATE_SPE) {
            addLog("Not enough capital to create SPE.", 'danger');
            playSound('error');
            return;
        }
        const names = ["LJM", "Chewco", "Raptor I", "Raptor II", "JEDI"];
        const name = names[s.spes.length % names.length];
        const hiddenAmt = 15000 + (Math.random() * 10000);
        const trigger = s.score * 0.7;

        const newSPE: SPE = {
            id: Math.random().toString(),
            name,
            debtHidden: hiddenAmt,
            triggerPrice: trigger,
            active: true
        };

        s.score -= PRICES.CREATE_SPE;
        s.score += (hiddenAmt / 100); // Artificial boost
        s.spes.push(newSPE);
        s.totalHiddenDebt += hiddenAmt;
        playSound('buy');
        addLog(`Off-balance partnership ${name} created. Hiding $${Math.floor(hiddenAmt).toLocaleString()} liabilities.`, 'success');
    };

    // Ticker Update Loop
    useEffect(() => {
        if (!started) return;
        const tickInterval = setInterval(() => {
            const s = gameState.current;
            // Find historic event for current date
            const currentMonth = new Date(s.date).getMonth() + 1; // 1-12
            const currentYear = new Date(s.date).getFullYear();
            
            const event = HISTORIC_EVENTS.find(e => e.month === currentMonth && e.year === currentYear);
            if (event) {
                setTicker(`BREAKING: ${event.title} - ${event.description}`);
            } else {
                const headlines = [
                    "ANALYSTS RATE ENE 'STRONG BUY'",
                    "NEW BROADBAND DIVISION ANNOUNCED",
                    "CALIFORNIA ROLLING BLACKOUTS REPORTED",
                    "BLOCKBUSTER DEAL RUMORED",
                    "ARTHUR ANDERSEN SHREDDING PARTY CONFIRMED",
                    "SEC: 'EVERYTHING LOOKS FINE'",
                    "KEN LAY: 'COMPANY FUNDAMENTALS STRONG'"
                ];
                setTicker(headlines[Math.floor(Math.random() * headlines.length)]);
            }
        }, 8000);
        return () => clearInterval(tickInterval);
    }, [started]);

    // Main Game Loop
    useEffect(() => {
        if (!started) return;

        const interval = setInterval(() => {
            const s = gameState.current;
            if (s.gameOver) return;

            // --- Physics & Environmental Update ---
            s.dayTime += 0.05;
            if (s.dayTime >= 24) {
                s.dayTime = 0;
                s.dayCount++;
                const currentDate = new Date(START_DATE);
                currentDate.setDate(currentDate.getDate() + (s.dayCount * 7));
                s.date = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                
                // Update Weather based on history
                const m = currentDate.getMonth() + 1;
                const y = currentDate.getFullYear();
                const weatherPattern = HISTORIC_WEATHER_PATTERNS.find(w => w.month === m && w.year === y);
                if (weatherPattern) {
                    s.weather = weatherPattern.type;
                    if (s.dayTime < 1) { // Trigger once per week start
                        addLog(`WEATHER ALERT: ${weatherPattern.name}`, 'warning');
                    }
                } else {
                    s.weather = 'sunny';
                }
            }

            // SPE Trigger Check
            s.spes.forEach((spe, idx) => {
                if (spe.active && s.score < spe.triggerPrice) {
                    spe.active = false;
                    s.loan += spe.debtHidden;
                    s.auditRisk += 30;
                    s.score -= (spe.debtHidden / 50);
                    triggerAlert(`SPE COLLAPSE: ${spe.name}`, `Trigger price $${spe.triggerPrice.toFixed(2)} hit. Debt returned to balance sheet.`, 'danger');
                }
            });

            // --- Reactor Physics 2.0 (Xenon Poisoning) ---
            const rodInsertion = s.rods / 100; // 1.0 = fully inserted (shutdown), 0.0 = fully out (max power)
            
            // Reactivity
            const xenonPenalty = s.xenon * 0.005; // Xenon poisoning effect
            const tempPenalty = (s.temp - 300) * 0.0001; // Temp feedback
            
            s.reactivity = (1 - rodInsertion) - xenonPenalty - tempPenalty;
            s.reactivity = Math.max(-1, Math.min(1, s.reactivity)); // Clamp

            // Xenon Dynamics
            const xenonProduction = s.power * 0.0015;
            const xenonBurn = s.xenon * s.power * 0.00005;
            const xenonDecay = s.xenon * 0.001;
            s.xenon = Math.max(0, Math.min(100, s.xenon + xenonProduction - xenonBurn - xenonDecay));

            // Thermal Hydraulics
            const heatGen = Math.max(0, s.reactivity * 50) + (s.power * 0.1); // Residual heat + fission
            const targetFlow = s.pump ? s.pumpHealth : 0;
            s.flowRate = s.flowRate * 0.9 + targetFlow * 0.1;
            
            // Cooling effectiveness depends on flow rate and delta T
            const cooling = (s.temp - 20) * 0.005 + (s.temp - 80) * 0.3 * (s.flowRate/100) * s.pumpLevel;
            
            // Add randomness/noise to temp
            s.temp = Math.max(20, s.temp + (heatGen - cooling) + (Math.random() - 0.5));
            
            const steam = Math.max(0, (s.temp - 100) * 0.6);
            const valveOut = (s.valve/100) * s.pressure * 0.15;
            s.pressure = Math.max(0, s.pressure + steam - valveOut);

            if (s.temp > 2500 || s.pressure > 1800) s.radiation += 1.5;
            else s.radiation = Math.max(0, s.radiation - 0.1);

            const output = valveOut * 25 * (s.turbineHealth/100);
            s.power = Math.min(1500, output);
            
            // --- Meltdown Sequence ---
            const isMeltdownCritical = s.temp > MELTDOWN_TEMP_START || s.pressure > MELTDOWN_PRES_START;
            if (isMeltdownCritical) {
                s.meltdownProgress = Math.min(100, s.meltdownProgress + 0.3); // Approx 16s to doom
                if (s.meltdownProgress > 20 && Math.random() < 0.1) playSound('alarm'); 
            } else {
                s.meltdownProgress = Math.max(0, s.meltdownProgress - 0.5);
            }

            if (s.meltdownProgress >= 100) {
                s.gameOver = true;
                s.failReason = "CRITICAL CORE MELTDOWN";
            }

            // --- Financial Physics ---
            // Score tracks power output but punished by audit risk
            const revenue = (s.power - 500) * 0.02;
            const debtInterest = s.loan * 0.0001;
            s.score += revenue - debtInterest;
            
            if (s.temp > MAX_TEMP) { s.gameOver = true; s.failReason = "CATASTROPHIC FAILURE"; }
            if (s.pressure > MAX_PRES) { s.gameOver = true; s.failReason = "CONTAINMENT BREACH"; }
            if (s.score < -5000) { s.gameOver = true; s.failReason = "TOTAL BANKRUPTCY"; }

            setUiState({ ...s });
        }, 50);

        return () => clearInterval(interval);
    }, [started, triggerAlert]);

    // Financial Chart
    useEffect(() => {
        if (!started) return;
        const hInt = setInterval(() => {
            setStockHistory(prev => [...prev.slice(-40), { time: '', price: gameState.current.score }]);
        }, 1000);
        return () => clearInterval(hInt);
    }, [started]);

    if (!started) return (
        <div className="h-screen w-screen flex items-center justify-center bg-black text-white">
            <div className="max-w-md p-10 bg-gray-900 border border-blue-500 rounded-xl text-center shadow-[0_0_50px_rgba(59,130,246,0.3)]">
                <h1 className="text-4xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">ENRON: MELTDOWN</h1>
                <div className="space-y-4 mb-8">
                    {Object.values(Difficulty).filter(v => typeof v === 'number').map(v => (
                        <button 
                            key={v} 
                            onClick={() => { setDifficulty(v as Difficulty); playSound('click'); }} 
                            className={`w-full p-3 rounded border font-mono transition-all ${difficulty === v ? 'bg-blue-600 border-blue-400 text-white shadow-lg scale-105' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                        >
                            {Difficulty[v as number]} MODE
                        </button>
                    ))}
                </div>
                <button 
                    onClick={() => { initAudio(); startAmbience(); playSound('buy'); setStarted(true); }} 
                    className="w-full py-4 bg-green-600 hover:bg-green-500 border border-green-400 rounded font-bold text-xl shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all hover:scale-105"
                >
                    START FRAUD
                </button>
            </div>
        </div>
    );

    return (
        <div className={`h-screen w-screen relative bg-black overflow-hidden font-sans ${uiState.meltdownProgress > 0 ? 'animate-shake' : ''} ${uiState.radiation > 100 ? 'contrast-125 saturate-150 brightness-110' : ''}`}>
            {/* Visual Overlays for Radiation/Heat/Meltdown */}
            {uiState.radiation > 150 && <div className="absolute inset-0 z-40 pointer-events-none mix-blend-screen opacity-30 bg-[radial-gradient(circle,rgba(0,255,0,0.2)_0%,transparent_70%)] animate-pulse" />}
            {uiState.temp > 2400 && <div className="absolute inset-0 z-40 pointer-events-none mix-blend-overlay opacity-20 bg-orange-900 animate-pulse" />}
            
            {uiState.meltdownProgress > 0 && (
                <div className="fixed inset-0 z-40 flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-full h-full absolute bg-red-900/20 animate-pulse"></div>
                    <div className="bg-black/90 border-4 border-red-500 p-8 rounded-xl text-center z-50 shadow-[0_0_100px_rgba(220,38,38,0.5)]">
                        <h2 className="text-6xl font-black text-red-500 tracking-tighter animate-pulse drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">MELTDOWN IMMINENT</h2>
                        <div className="text-4xl font-mono text-white mt-4">{uiState.meltdownProgress.toFixed(1)}%</div>
                        <div className="w-96 h-8 bg-gray-900 rounded-full mt-4 border border-red-500 overflow-hidden relative">
                            <div className="h-full bg-red-600 transition-all duration-100 ease-linear" style={{width: `${uiState.meltdownProgress}%`}}></div>
                            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.3)_50%,transparent_75%)] bg-[length:20px_20px]"></div>
                        </div>
                        <div className="text-red-300 font-mono mt-2 animate-bounce">EVACUATE FACILITY</div>
                    </div>
                </div>
            )}
            
            <Scene3D gameState={gameState} cutaway={cutaway} />

            {/* Top HUD */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-30 pointer-events-none">
                <div className="flex flex-col gap-2 pointer-events-auto">
                    <div className="bg-black/60 backdrop-blur border border-white/10 p-4 rounded shadow-xl">
                        <div className="text-xs text-blue-400 font-bold tracking-widest">ENRON CORP (NYSE: ENE)</div>
                        <div className={`text-4xl font-black ${uiState.score > 0 ? 'text-green-400' : 'text-red-500'}`}>
                            ${uiState.score.toFixed(2)}
                        </div>
                    </div>
                    <div className="bg-black/60 border border-white/10 px-3 py-1 rounded text-[10px] font-mono w-64 overflow-hidden">
                        <div className="animate-ticker text-gray-400 uppercase tracking-tighter">{ticker}</div>
                    </div>
                </div>

                <div className="flex gap-4 items-center pointer-events-auto">
                    <button onClick={handleConsultCEO} disabled={isSpeaking} className={`p-4 rounded-full bg-blue-600 border border-blue-400 text-white shadow-lg transition-all ${isSpeaking ? 'opacity-50 scale-90' : 'hover:scale-110 hover:shadow-blue-500/50'}`}>
                        <MessageSquareQuote size={24} />
                    </button>
                    <div className="bg-black/60 p-4 rounded border border-white/10 text-right shadow-xl">
                        <div className="text-xl font-bold font-mono">{uiState.date}</div>
                        <div className="flex justify-between w-full">
                            <div className="text-[10px] text-gray-500">WEEK {uiState.dayCount}</div>
                            <div className="text-[10px] text-blue-300 uppercase">{uiState.weather}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl z-30 pointer-events-none">
                <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-6 rounded-xl grid grid-cols-12 gap-6 pointer-events-auto shadow-2xl">
                    
                    {/* Left: Engineering */}
                    <div className="col-span-3 space-y-3 border-r border-white/10 pr-6">
                        <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Atom size={14}/> Core Status</h3>
                        <ProgressBar value={uiState.temp} max={MAX_TEMP} label="TEMP" unit="°C" color="bg-orange-500" warning={uiState.temp > 2000} />
                        <ProgressBar value={uiState.pressure} max={MAX_PRES} label="PRESSURE" unit=" PSI" color="bg-cyan-500" warning={uiState.pressure > 1500} />
                        <ProgressBar value={uiState.xenon} max={100} label="XENON POISON" unit="%" color="bg-purple-500" warning={uiState.xenon > 80} />
                    </div>

                    {/* Middle: Controls */}
                    <div className="col-span-3 space-y-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Zap size={14}/> Automation</h3>
                        <div>
                            <div className="flex justify-between text-[10px] mb-1 text-gray-400"><span>RODS (Reactivity: {uiState.reactivity.toFixed(2)})</span><span>{uiState.rods}%</span></div>
                            <input type="range" className="w-full accent-blue-500 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer" value={uiState.rods} onChange={e => gameState.current.rods = parseInt(e.target.value)} />
                        </div>
                        <div>
                            <div className="flex justify-between text-[10px] mb-1 text-gray-400"><span>VALVE</span><span>{uiState.valve}%</span></div>
                            <input type="range" className="w-full accent-cyan-500 h-1 bg-gray-700 rounded-full appearance-none cursor-pointer" value={uiState.valve} onChange={e => gameState.current.valve = parseInt(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                             <button onClick={() => { gameState.current.pump = !gameState.current.pump; playSound('click'); }} className={`flex-1 py-2 text-[10px] font-bold rounded transition-colors ${uiState.pump ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-700 hover:bg-gray-600'}`}>PUMP: {uiState.pump ? 'ON' : 'OFF'}</button>
                             <button onClick={() => { gameState.current.rods = 100; gameState.current.valve = 100; playSound('alarm'); }} className="flex-1 py-2 text-[10px] font-bold bg-red-600 hover:bg-red-500 rounded transition-colors">SCRAM</button>
                        </div>
                    </div>

                    {/* Right: CFO Dashboard */}
                    <div className="col-span-6 flex flex-col gap-4">
                        <div className="flex gap-2 border-b border-white/10 pb-2">
                            {['market', 'bank', 'partnerships', 'shop'].map(t => (
                                <button key={t} onClick={() => { setActiveTab(t as any); playSound('click'); }} className={`px-4 py-1 text-[10px] font-bold uppercase transition-colors ${activeTab === t ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>{t}</button>
                            ))}
                        </div>
                        
                        <div className="flex-1 min-h-[140px]">
                            {activeTab === 'market' && (
                                <div className="grid grid-cols-2 gap-4 animate-fade-in">
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-xs"><span>Audit Risk</span><span className={uiState.auditRisk > 50 ? 'text-red-500' : 'text-green-500'}>{uiState.auditRisk.toFixed(0)}%</span></div>
                                        <button onClick={() => { gameState.current.score += 5000; gameState.current.auditRisk += 15; playSound('cash'); }} className="w-full py-3 bg-blue-900/30 border border-blue-500/50 text-blue-400 text-[10px] font-bold rounded hover:bg-blue-900/50 transition-colors">COOK BOOKS (MARK-TO-MARKET)</button>
                                        <button onClick={() => { gameState.current.auditRisk = Math.max(0, uiState.auditRisk-20); gameState.current.score -= 2000; playSound('shred'); }} className="w-full py-3 bg-red-900/30 border border-red-500/50 text-red-400 text-[10px] font-bold rounded hover:bg-red-900/50 transition-colors">SHRED DOCUMENTS</button>
                                    </div>
                                    <div className="h-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={stockHistory}>
                                                <Area type="monotone" dataKey="price" stroke="#4ade80" fill="#4ade8033" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'partnerships' && (
                                <div className="animate-fade-in space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-400">Hidden Liabilities: <b className="text-purple-400">${Math.floor(uiState.totalHiddenDebt).toLocaleString()}</b></span>
                                        <button onClick={createSPE} className="px-4 py-2 bg-purple-600 text-[10px] font-bold rounded hover:bg-purple-500 transition-colors shadow-lg shadow-purple-900/20">NEW PARTNERSHIP (-$1K)</button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 h-20 overflow-y-auto">
                                        {uiState.spes.map(spe => (
                                            <div key={spe.id} className={`p-2 rounded border text-[9px] ${spe.active ? 'bg-green-900/20 border-green-500' : 'bg-red-900/20 border-red-500'}`}>
                                                <div className="font-bold">{spe.name}</div>
                                                <div>Debt: ${Math.floor(spe.debtHidden)}</div>
                                                <div className="text-gray-500">Trigger: ${spe.triggerPrice.toFixed(0)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'shop' && (
                                <div className="grid grid-cols-2 gap-2 animate-fade-in">
                                    <button onClick={() => { if(uiState.score > 1000) { gameState.current.score -= 1000; gameState.current.pumpHealth = 100; playSound('repair'); } else playSound('error'); }} className="p-2 border border-white/10 rounded flex justify-between text-[10px] hover:bg-white/5 transition-colors"><span>REPAIR PUMP</span><span className="text-yellow-500">$1000</span></button>
                                    <button onClick={() => { if(uiState.score > 2000) { gameState.current.score -= 2000; gameState.current.hasAutoScram = true; playSound('buy'); } else playSound('error'); }} className="p-2 border border-white/10 rounded flex justify-between text-[10px] hover:bg-white/5 transition-colors"><span>AUTO-SCRAM</span><span className="text-yellow-500">$2000</span></button>
                                    <button onClick={() => { if(uiState.score > 500) { gameState.current.score -= 500; gameState.current.fuel = 100; playSound('repair'); } else playSound('error'); }} className="p-2 border border-white/10 rounded flex justify-between text-[10px] hover:bg-white/5 transition-colors"><span>REFUEL CORE</span><span className="text-yellow-500">$500</span></button>
                                    <button onClick={() => { setCutaway(!cutaway); playSound('click'); }} className="p-2 border border-white/10 rounded text-[10px] hover:bg-white/5 transition-colors">TOGGLE CAMERA VIEW</button>
                                </div>
                            )}

                             {activeTab === 'bank' && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="flex justify-between text-xs"><span>Offshore Holdings</span><span className="text-purple-400 font-bold">${Math.floor(uiState.offshore).toLocaleString()}</span></div>
                                    <div className="grid grid-cols-2 gap-2">
                                         <button onClick={() => { if(uiState.score > 2000) { gameState.current.score -= 2000; gameState.current.offshore += 2000; playSound('cash'); } else playSound('error'); }} className="py-4 bg-purple-900/40 border border-purple-500/50 text-purple-300 text-[10px] font-bold rounded hover:bg-purple-900/60 transition-colors">SIPHON $2K TO CAYMANS</button>
                                         <button onClick={() => { gameState.current.score += 10000; gameState.current.loan += 10000; playSound('cash'); }} className="py-4 bg-green-900/40 border border-green-500/50 text-green-300 text-[10px] font-bold rounded hover:bg-green-900/60 transition-colors">BORROW $10K (EMERGENCY)</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Game Over Modal */}
            {uiState.gameOver && (
                <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center text-center animate-fade-in backdrop-blur-xl">
                    <h1 className="text-8xl font-black text-red-600 mb-4 italic tracking-tighter animate-pulse">{uiState.failReason}</h1>
                    <div className="text-2xl font-mono text-gray-400 mb-10">Wealth Extracted: <span className="text-green-400">${Math.floor(uiState.offshore).toLocaleString()}</span></div>
                    <button onClick={() => window.location.reload()} className="px-10 py-4 border-2 border-white/20 rounded-full hover:bg-white hover:text-black transition-all font-black uppercase tracking-widest">RETRY FRAUD</button>
                </div>
            )}
            
            {/* Event Alerts */}
            {activeAlert && (
                <div className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg animate-pop-in pointer-events-none">
                    <div className={`p-8 border-4 rounded-2xl shadow-2xl ${activeAlert.type === 'danger' ? 'bg-red-950/90 border-red-500 text-white shadow-red-500/50' : 'bg-blue-950/90 border-blue-500 text-blue-100 shadow-blue-500/50'}`}>
                        <div className="text-4xl font-black mb-2 uppercase italic">{activeAlert.title}</div>
                        <div className="text-lg font-mono leading-tight">{activeAlert.message}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
