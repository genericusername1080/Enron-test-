
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Zap, Activity, MessageSquareQuote, Cpu, TrendingUp, Gauge, Wrench, DollarSign, Menu, Radio, Power, Briefcase, ShieldCheck } from 'lucide-react';
import Scene3D from './components/Scene3D';
import LoadingScreen from './components/UI/LoadingScreen';
import ProgressBar from './components/UI/ProgressBar';
import { GameState, LogEvent, StockPoint, SPE } from './types';
import { INITIAL_STATE, PRICES, MAX_TEMP, MAX_PRES, HISTORIC_EVENTS, START_DATE, HISTORIC_WEATHER_PATTERNS, MELTDOWN_TEMP_START, MELTDOWN_PRES_START, CHAPTERS } from './constants';
import { playSound, initAudio, startAmbience, updateAmbience, playGeiger } from './utils/audioUtils';
import { speakCorporateAdvice } from './services/geminiService';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

const App: React.FC = () => {
    // Refs
    const gameState = useRef<GameState>({ ...INITIAL_STATE });
    const lastLevel = useRef<number>(0);
    
    // UI State
    const [uiState, setUiState] = useState<GameState>({ ...INITIAL_STATE });
    const [loading, setLoading] = useState(true);
    const [gameActive, setGameActive] = useState(false);
    const [activeTab, setActiveTab] = useState<'controls' | 'maintenance' | 'finance' | 'partnerships'>('controls');
    const [cutaway, setCutaway] = useState(true);
    const [logs, setLogs] = useState<LogEvent[]>([]);
    const [stockHistory, setStockHistory] = useState<StockPoint[]>([]);
    const [activeAlert, setActiveAlert] = useState<{title: string, message: string, type: 'info'|'warning'|'danger'} | null>(null);
    const [chapterInfo, setChapterInfo] = useState(CHAPTERS[0]);
    const [speCollapseEffect, setSpeCollapseEffect] = useState(false);

    // --- UTILS ---
    const addLog = useCallback((message: string, type: LogEvent['type'] = 'info') => {
        setLogs(prev => [{ id: Date.now(), message, type, timestamp: new Date().toLocaleTimeString() }, ...prev].slice(0, 5));
    }, []);

    const triggerAlert = useCallback((title: string, message: string, type: 'warning' | 'danger' = 'warning') => {
        setActiveAlert({ title, message, type });
        addLog(`${title}: ${message}`, type);
        playSound(type === 'danger' ? 'alarm' : 'repair');
        setTimeout(() => setActiveAlert(null), 4000);
    }, [addLog]);

    // --- ACTIONS ---
    const handleStart = () => {
        initAudio();
        startAmbience();
        playSound('buy');
        setGameActive(true);
    };

    const repairComponent = (component: 'pump' | 'turbine' | 'condenser') => {
        const s = gameState.current;
        let cost = 0;
        if (component === 'pump') cost = PRICES.FIX_PUMP;
        if (component === 'turbine') cost = PRICES.FIX_TURB;
        if (component === 'condenser') cost = PRICES.FIX_CONDENSER;

        if (s.cash >= cost) {
            s.cash -= cost;
            if (component === 'pump') s.pumpHealth = 100;
            if (component === 'turbine') s.turbineHealth = 100;
            if (component === 'condenser') s.condenserHealth = 100;
            playSound('repair');
            addLog(`Repaired ${component}`, 'success');
        } else {
            playSound('error');
            addLog('Insufficient funds for repair', 'warning');
        }
    };

    const handleCreateSPE = () => {
        const s = gameState.current;
        if (s.score < PRICES.CREATE_SPE) { playSound('error'); return; }
        const name = `LJM-${Math.floor(Math.random()*100)}`;
        const hiddenAmt = 15000 + (Math.random() * 10000);
        
        // Financials
        s.score -= PRICES.CREATE_SPE;
        s.score += hiddenAmt / 200; 
        s.spes.push({ id: Math.random().toString(), name, debtHidden: hiddenAmt, triggerPrice: s.score * 0.7, active: true });
        s.totalHiddenDebt += hiddenAmt;
        
        // Risk
        s.auditRisk += 7; // Instant risk spike
        
        playSound('buy');
        addLog(`Created SPE ${name}. Hid $${Math.floor(hiddenAmt)} debt. Risk +7%.`, 'success');
    };
    
    const handleLobbying = () => {
        const s = gameState.current;
        if (s.cash < PRICES.CAMPAIGN_DONATION) {
            playSound('error');
            addLog("Insufficient funds for campaign donation.", 'warning');
            return;
        }
        
        s.cash -= PRICES.CAMPAIGN_DONATION;
        s.auditRisk = Math.max(0, s.auditRisk - 15);
        s.lobbyingShieldTime = 600; // approx 30 seconds (50ms tick * 600)
        playSound('cash');
        addLog("Campaign donation made. Regulators pacified.", 'success');
    };

    // --- MAIN PHYSICS LOOP ---
    useEffect(() => {
        if (!gameActive) return;

        const loop = setInterval(() => {
            const s = gameState.current;
            if (s.gameOver) return;
            const currentChap = CHAPTERS[s.currentChapter];

            // 1. Time & Weather
            s.dayTime += 0.05;
            if (s.dayTime >= 24) {
                s.dayTime = 0;
                s.dayCount++;
                const date = new Date(START_DATE);
                date.setDate(date.getDate() + (s.dayCount * 7));
                s.date = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                
                // Historical Events Check
                const event = HISTORIC_EVENTS.find(e => e.month === date.getMonth()+1 && e.year === date.getFullYear());
                if (event) {
                    // Lobbying Shield check
                    let type = event.type;
                    if (s.lobbyingShieldTime > 0 && type === 'danger') type = 'warning'; // Mitigate event severity
                    
                    triggerAlert(event.title, event.description, type === 'danger' ? 'danger' : 'warning');
                    
                    if (event.effect) {
                        // Apply mitigation if lobbied
                        if (s.lobbyingShieldTime > 0 && (event.title.includes("SEC") || event.title.includes("SKILLING"))) {
                             // Skip or reduce effect
                             addLog("Lobbyists mitigated event impact.", 'success');
                        } else {
                            event.effect(s);
                        }
                    }
                }

                // Weather
                const pat = HISTORIC_WEATHER_PATTERNS.find(p => p.month === date.getMonth()+1 && p.year === date.getFullYear());
                s.weather = pat ? pat.type : 'sunny';
            }

            // 2. Advanced Reactor Physics
            const rods = s.rods / 100; // 1 = in, 0 = out
            const pumpEfficiency = (s.pump ? 1 : 0) * (s.pumpHealth / 100);
            s.flowRate = s.flowRate * 0.95 + (pumpEfficiency * 100) * 0.05; // Inertia
            
            // Xenon & Reactivity
            const xenonPoison = s.xenon * 0.005;
            const tempFeedback = (s.temp - 300) * 0.0001;
            s.reactivity = (1 - rods) - xenonPoison - tempFeedback;
            
            // Heat & Xenon Gen
            s.xenon = Math.max(0, Math.min(100, s.xenon + (s.power * 0.001) - (s.xenon * s.reactivity * 0.01)));
            const heatGen = Math.max(0, s.reactivity * 60) + (s.power * 0.05);
            const cooling = (s.temp - 20) * 0.005 + (s.temp - 80) * 0.4 * (s.flowRate / 100) * (s.condenserHealth / 100);
            
            s.temp = Math.max(20, s.temp + heatGen - cooling + (Math.random() - 0.5));
            
            // Pressure & Steam
            const pressureBuild = Math.max(0, (s.temp - 100) * 0.7);
            const valveOpen = s.valve / 100;
            const pressureRelease = valveOpen * s.pressure * 0.2;
            s.pressure = Math.max(0, s.pressure + pressureBuild - pressureRelease);
            
            // Turbine & Grid Physics
            const turbineTorque = pressureRelease * 30 * (s.turbineHealth / 100);
            s.power = s.power * 0.9 + turbineTorque * 0.1; // Rotational inertia
            
            // Grid Hz Logic
            // Hz = 60 * (Supply / Demand). Target is 60.
            const targetHz = 60 * (s.power / (s.gridDemand * currentChap.modifiers.demandScale));
            // Grid inertia - Hz doesn't change instantly
            s.gridHz = s.gridHz * 0.95 + targetHz * 0.05; 
            
            // Grid Stability Consequences
            if (s.gridHz < 59) {
                // Brownout condition
                if (!s.brownoutActive) {
                    s.brownoutActive = true;
                    addLog("BROWNOUT DETECTED - Low Frequency", 'warning');
                    s.politicalCapital -= 1;
                }
                // Brownouts allow price gouging in Chapter 2
                if (s.currentChapter === 1) s.cash += 50; 
            } else {
                s.brownoutActive = false;
            }
            
            if (s.gridHz > 61) {
                // Overspeed -> Damage Turbine
                s.turbineHealth -= 0.1;
                if (Math.random() < 0.05) addLog("TURBINE OVERSPEED WARNING", 'warning');
            }

            // Component Degradation
            if (s.power > 1000) {
                s.pumpHealth -= 0.01;
                s.condenserHealth -= 0.01;
            }
            if (s.temp > 2000) s.condenserHealth -= 0.05;

            // 3. Meltdown Logic
            if (s.temp > MELTDOWN_TEMP_START || s.pressure > MELTDOWN_PRES_START) {
                s.meltdownProgress += 0.4;
                if (s.meltdownProgress > 99) { s.gameOver = true; s.failReason = "CRITICAL MASS"; }
            } else {
                s.meltdownProgress = Math.max(0, s.meltdownProgress - 0.5);
            }

            // 4. Financials & Chapter Progression
            // Revenue depends on power delivered (capped by demand)
            const powerSold = Math.min(s.power, s.gridDemand * currentChap.modifiers.demandScale);
            const rate = s.currentChapter === 1 ? 0.05 : 0.02; // Price gouging in Ch2
            s.cash += powerSold * rate;
            
            // AUDIT RISK MECHANIC
            // Passive accumulation based on number of SPEs
            // If lobbying is active, passive accumulation is paused.
            if (s.lobbyingShieldTime <= 0) {
                const speMultiplier = s.spes.filter(spe => spe.active).length;
                // Base creep (slow) + risk for every active fraud (fast)
                // Base: 0.005 per tick (0.1% per sec)
                // SPE: 0.03 per tick per SPE (0.6% per sec per SPE)
                const riskIncrease = 0.005 + (speMultiplier * 0.03); 
                s.auditRisk = Math.min(100, s.auditRisk + riskIncrease);
            }

            // Game Over via Audit
            if (s.auditRisk >= 100) {
                s.gameOver = true;
                s.failReason = "FEDERAL RAID - FRAUD EXPOSED";
            }
            
            // Stock logic
            const stabilityPenalty = Math.abs(60 - s.gridHz) * 2;
            const revenueBonus = powerSold * 0.001;
            // Higher penalty for high audit risk
            const riskPenalty = s.auditRisk * 0.04; 
            s.score = Math.max(0, s.score + revenueBonus - stabilityPenalty - riskPenalty);

            // Chapter Win Check
            if (currentChap.winCondition(s) && s.currentChapter < CHAPTERS.length - 1) {
                s.currentChapter++;
                setChapterInfo(CHAPTERS[s.currentChapter]);
                triggerAlert("CHAPTER COMPLETE", CHAPTERS[s.currentChapter].title, 'info');
                playSound('build');
            }
            
            // Lobbying Decay
            if (s.lobbyingShieldTime > 0) {
                s.lobbyingShieldTime--;
                // Passive risk reduction while lobbyists are working
                if (s.lobbyingShieldTime % 10 === 0 && s.auditRisk > 0) {
                    s.auditRisk -= 0.5;
                }
            }

            // SPE Checks
            s.spes.forEach(spe => {
                if (spe.active && s.score < spe.triggerPrice) {
                    spe.active = false;
                    s.loan += spe.debtHidden;
                    s.score -= spe.debtHidden / 50;
                    triggerAlert("SPE COLLAPSE", `${spe.name} failed. Debt returned to books.`, "danger");
                    setSpeCollapseEffect(true);
                    setTimeout(() => setSpeCollapseEffect(false), 800);
                }
            });

            // Audio Sync
            updateAmbience(s.power, s.pressure, s.temp);
            playGeiger(s.radiation);

            setUiState({...s}); 
        }, 50);

        const chartLoop = setInterval(() => {
            setStockHistory(prev => [...prev.slice(-40), { time: '', price: gameState.current.score }]);
        }, 1000);

        return () => { clearInterval(loop); clearInterval(chartLoop); };
    }, [gameActive, triggerAlert]);


    if (loading) return <LoadingScreen onComplete={() => setLoading(false)} />;

    if (!gameActive) return (
        <div className="h-screen w-screen flex items-center justify-center bg-black text-blue-500 font-mono">
            <div className="border border-blue-500 p-12 max-w-lg text-center shadow-[0_0_50px_rgba(59,130,246,0.2)]">
                <h1 className="text-6xl font-black italic mb-4 text-white">ENRON</h1>
                <h2 className="text-xl mb-8 tracking-widest text-blue-400">MELTDOWN MANAGER</h2>
                <div className="text-left space-y-4 text-sm text-gray-400 mb-8 border-t border-b border-gray-800 py-4">
                    <p>SYSTEM: BWR-4 Nuclear Reactor [Legacy]</p>
                    <p>OBJECTIVE: Maintain stock valuation > $0.00</p>
                    <p>WARNING: Grid synchronization failures will damage infrastructure.</p>
                </div>
                <button 
                    onClick={handleStart}
                    className="w-full py-4 bg-blue-600 text-white font-bold text-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
                >
                    <Power /> INITIALIZE SYSTEM
                </button>
            </div>
        </div>
    );

    return (
        <div className={`h-screen w-screen relative bg-black overflow-hidden font-sans select-none ${uiState.meltdownProgress > 0 ? 'animate-shake' : ''}`}>
            {/* 3D Layer */}
            <Scene3D gameState={gameState} cutaway={cutaway} />

            {/* Top Info Bar */}
            <div className="absolute top-0 w-full p-4 flex justify-between z-10 pointer-events-none">
                <div className="pointer-events-auto flex flex-col gap-2">
                    <div className={`border-l-4 p-4 rounded-r backdrop-blur min-w-[200px] transition-all duration-200 ${speCollapseEffect ? 'bg-red-900/80 border-red-500 animate-shake shadow-[0_0_30px_red]' : 'bg-black/80 border-blue-500'}`}>
                        <div className={`text-[10px] font-bold tracking-widest ${speCollapseEffect ? 'text-red-200' : 'text-gray-500'}`}>NYSE: ENE</div>
                        <div className={`text-4xl font-black font-mono ${uiState.score >= 0 ? (speCollapseEffect ? 'text-white' : 'text-green-500') : 'text-red-500'}`}>
                            ${uiState.score.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-2">
                            <TrendingUp size={10}/> RISK: {uiState.auditRisk.toFixed(0)}%
                        </div>
                    </div>
                    
                    <div className="bg-black/80 border-l-4 border-purple-500 p-2 rounded-r backdrop-blur">
                        <div className="text-[10px] text-gray-400 uppercase font-bold">{chapterInfo.title}</div>
                        <div className="text-xs text-white max-w-xs">{chapterInfo.description}</div>
                    </div>

                    {uiState.lobbyingShieldTime > 0 && (
                        <div className="bg-green-900/80 border-l-4 border-green-500 p-2 rounded-r backdrop-blur flex items-center gap-2 animate-pulse">
                            <ShieldCheck size={16} className="text-green-400" />
                            <div className="text-[10px] text-green-200 font-bold">LOBBYING ACTIVE</div>
                        </div>
                    )}
                </div>

                <div className="pointer-events-auto flex flex-col items-end gap-2">
                    <div className="bg-black/80 border-r-4 border-white p-4 rounded-l backdrop-blur text-right">
                        <div className="text-3xl font-bold font-mono text-white">{uiState.date}</div>
                        <div className="text-xs text-blue-400 uppercase flex items-center justify-end gap-2">
                            {uiState.weather} <Activity size={12}/>
                        </div>
                    </div>
                    <button onClick={() => speakCorporateAdvice(gameState.current)} className="bg-blue-600 p-3 rounded-full text-white shadow-lg hover:bg-blue-500">
                        <MessageSquareQuote size={20} />
                    </button>
                </div>
            </div>

            {/* Meltdown Warning Overlay */}
            {uiState.meltdownProgress > 0 && (
                <div className="absolute top-32 left-1/2 -translate-x-1/2 bg-red-950/90 border-2 border-red-500 p-6 rounded-xl text-center animate-pulse z-20 shadow-[0_0_50px_red]">
                    <h2 className="text-3xl font-black text-red-500 flex items-center justify-center gap-2">
                        <AlertTriangle size={32} /> CORE CRITICAL
                    </h2>
                    <div className="w-80 h-6 bg-black rounded-full mt-4 overflow-hidden border border-red-500 relative">
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold z-10">{uiState.meltdownProgress.toFixed(1)}% INTEGRITY LOSS</div>
                        <div className="h-full bg-red-600" style={{width: `${uiState.meltdownProgress}%`}}/>
                    </div>
                </div>
            )}

            {/* MAIN CONTROL PANEL (Bottom) */}
            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gray-900/95 border-t border-gray-700 z-30 flex">
                
                {/* LEFT: REACTOR GAUGES */}
                <div className="w-1/4 p-4 border-r border-gray-700 flex flex-col justify-between bg-black/40">
                    <div className="flex items-center gap-2 text-gray-400 text-xs font-bold mb-2">
                        <Radio size={14} /> REACTOR TELEMETRY
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <div className="text-[10px] text-gray-500">CORE TEMP</div>
                            <div className={`text-2xl font-mono ${uiState.temp > 2400 ? 'text-red-500 animate-pulse' : 'text-orange-400'}`}>
                                {uiState.temp.toFixed(0)}<span className="text-sm">°C</span>
                            </div>
                            <div className="h-1 bg-gray-800 rounded overflow-hidden">
                                <div className="h-full bg-orange-500 transition-all" style={{width: `${(uiState.temp/MAX_TEMP)*100}%`}}></div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="text-[10px] text-gray-500">PRESSURE</div>
                            <div className={`text-2xl font-mono ${uiState.pressure > 1600 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
                                {uiState.pressure.toFixed(0)}<span className="text-sm">PSI</span>
                            </div>
                            <div className="h-1 bg-gray-800 rounded overflow-hidden">
                                <div className="h-full bg-cyan-500 transition-all" style={{width: `${(uiState.pressure/MAX_PRES)*100}%`}}></div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="text-[10px] text-gray-500">NEUTRON FLUX</div>
                            <div className="text-xl font-mono text-purple-400">
                                {uiState.reactivity.toFixed(3)}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="text-[10px] text-gray-500">XENON</div>
                            <div className="text-xl font-mono text-gray-400">
                                {uiState.xenon.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                </div>

                {/* CENTER: GRID & CONTROLS */}
                <div className="w-2/4 p-4 flex flex-col relative">
                    {/* Grid Hz Meter */}
                    <div className="absolute top-4 right-4 flex flex-col items-end">
                        <div className="text-[10px] text-gray-500 mb-1">GRID FREQUENCY</div>
                        <div className={`text-3xl font-black font-mono tracking-tighter ${Math.abs(uiState.gridHz - 60) > 0.5 ? 'text-yellow-400' : 'text-green-500'}`}>
                            {uiState.gridHz.toFixed(2)} <span className="text-sm text-gray-600">Hz</span>
                        </div>
                        {uiState.brownoutActive && <div className="text-[10px] bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded animate-pulse">BROWNOUT ACTIVE</div>}
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 border-b border-gray-700 mb-4">
                        {['controls', 'maintenance'].map(t => (
                            <button 
                                key={t}
                                onClick={() => setActiveTab(t as any)}
                                className={`pb-2 text-xs font-bold uppercase transition-colors ${activeTab === t ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'controls' ? (
                        <div className="grid grid-cols-2 gap-8 h-full">
                            {/* Rods */}
                            <div className="bg-gray-800/50 p-4 rounded border border-gray-700">
                                <div className="flex justify-between mb-4">
                                    <span className="text-xs font-bold text-gray-400">CONTROL RODS</span>
                                    <span className="text-xs font-mono text-blue-400">{uiState.rods}% INSERTED</span>
                                </div>
                                <input 
                                    type="range" 
                                    className="w-full h-12 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-blue-500" 
                                    value={uiState.rods}
                                    onChange={(e) => gameState.current.rods = parseInt(e.target.value)}
                                />
                                <div className="flex justify-between mt-2">
                                    <button onClick={() => gameState.current.rods = 0} className="text-[10px] px-2 py-1 bg-gray-700 rounded text-red-400 hover:bg-gray-600">PULL (MAX POWER)</button>
                                    <button onClick={() => { gameState.current.rods = 100; playSound('alarm'); }} className="text-[10px] px-2 py-1 bg-red-900/50 rounded text-red-200 hover:bg-red-800">SCRAM</button>
                                </div>
                            </div>

                            {/* Steam Valve */}
                            <div className="bg-gray-800/50 p-4 rounded border border-gray-700">
                                <div className="flex justify-between mb-4">
                                    <span className="text-xs font-bold text-gray-400">STEAM VALVE</span>
                                    <span className="text-xs font-mono text-cyan-400">{uiState.valve}% OPEN</span>
                                </div>
                                <input 
                                    type="range" 
                                    className="w-full h-12 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-cyan-500" 
                                    value={uiState.valve}
                                    onChange={(e) => gameState.current.valve = parseInt(e.target.value)}
                                />
                                <div className="mt-2 text-[10px] text-gray-500 flex justify-between">
                                    <span>OUTPUT: {uiState.power.toFixed(0)} MW</span>
                                    <span className={uiState.gridDemand > uiState.power ? 'text-red-500' : 'text-green-500'}>DEMAND: {Math.floor(uiState.gridDemand * chapterInfo.modifiers.demandScale)} MW</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-4 h-full">
                            <div className="bg-gray-800/30 p-2 rounded border border-gray-700 flex flex-col justify-between">
                                <div>
                                    <div className="text-[10px] text-gray-400 font-bold mb-1">MAIN PUMP</div>
                                    <div className="text-2xl font-mono text-white">{Math.floor(uiState.pumpHealth)}%</div>
                                </div>
                                <button onClick={() => repairComponent('pump')} className="w-full py-2 bg-blue-900/30 text-blue-300 text-[10px] border border-blue-800 hover:bg-blue-900/50 rounded flex justify-between px-2">
                                    <span>REPAIR</span> <span>${PRICES.FIX_PUMP}</span>
                                </button>
                            </div>
                            <div className="bg-gray-800/30 p-2 rounded border border-gray-700 flex flex-col justify-between">
                                <div>
                                    <div className="text-[10px] text-gray-400 font-bold mb-1">TURBINE</div>
                                    <div className="text-2xl font-mono text-white">{Math.floor(uiState.turbineHealth)}%</div>
                                </div>
                                <button onClick={() => repairComponent('turbine')} className="w-full py-2 bg-blue-900/30 text-blue-300 text-[10px] border border-blue-800 hover:bg-blue-900/50 rounded flex justify-between px-2">
                                    <span>REPAIR</span> <span>${PRICES.FIX_TURB}</span>
                                </button>
                            </div>
                            <div className="bg-gray-800/30 p-2 rounded border border-gray-700 flex flex-col justify-between">
                                <div>
                                    <div className="text-[10px] text-gray-400 font-bold mb-1">CONDENSER</div>
                                    <div className="text-2xl font-mono text-white">{Math.floor(uiState.condenserHealth)}%</div>
                                </div>
                                <button onClick={() => repairComponent('condenser')} className="w-full py-2 bg-blue-900/30 text-blue-300 text-[10px] border border-blue-800 hover:bg-blue-900/50 rounded flex justify-between px-2">
                                    <span>REPAIR</span> <span>${PRICES.FIX_CONDENSER}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: CORPORATE DASHBOARD */}
                <div className="w-1/4 bg-gray-800 border-l border-gray-700 p-4 flex flex-col">
                    <div className="flex gap-2 mb-4">
                        <button onClick={() => setActiveTab('finance')} className={`flex-1 py-1 text-[10px] uppercase border rounded ${activeTab === 'finance' ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-gray-600'}`}>FINANCE</button>
                        <button onClick={() => setActiveTab('partnerships')} className={`flex-1 py-1 text-[10px] uppercase border rounded ${activeTab === 'partnerships' ? 'bg-white text-black border-white' : 'bg-transparent text-gray-400 border-gray-600'}`}>FRAUD</button>
                    </div>

                    {activeTab === 'finance' ? (
                        <div className="flex-1 space-y-2">
                            <div className="flex justify-between text-xs items-center p-2 bg-black/30 rounded">
                                <span className="text-gray-400">CASH</span>
                                <span className={uiState.cash < 2000 ? 'text-red-500 font-mono' : 'text-green-400 font-mono'}>${Math.floor(uiState.cash).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs items-center p-2 bg-black/30 rounded">
                                <span className="text-gray-400">OFFSHORE</span>
                                <span className="text-purple-400 font-mono">${Math.floor(uiState.offshore).toLocaleString()}</span>
                            </div>
                            <div className="h-24 w-full mt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stockHistory}>
                                        <Area type="monotone" dataKey="price" stroke="#4ade80" fill="#4ade8022" strokeWidth={2} isAnimationActive={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <button onClick={() => setCutaway(!cutaway)} className="w-full py-2 border border-gray-600 text-[10px] text-gray-400 hover:bg-gray-700 rounded mt-auto">TOGGLE CAMERA</button>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col">
                            <button onClick={handleLobbying} className="w-full py-2 bg-green-900/60 hover:bg-green-800 text-green-200 text-xs font-bold rounded border border-green-700 mb-2 flex justify-between px-3 items-center shadow-md">
                                <div className="flex items-center gap-2"><Briefcase size={14}/> <span>LOBBY (-$2K)</span></div>
                                <span className="text-[10px] text-green-400/80">-15 RISK</span>
                            </button>
                            
                            <button onClick={handleCreateSPE} className="w-full py-3 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold rounded shadow-lg mb-2 flex justify-between px-4 items-center">
                                <span>CREATE SPE</span> <span className="opacity-70">-$1k</span>
                            </button>
                            <div className="flex-1 overflow-y-auto space-y-1 bg-black/20 p-1 rounded border border-gray-800">
                                {uiState.spes.length === 0 && <div className="text-[10px] text-gray-500 text-center mt-4">No active partnerships.</div>}
                                {uiState.spes.map(spe => (
                                    <div key={spe.id} className="text-[9px] bg-gray-900 p-2 rounded border border-gray-700 flex justify-between items-center">
                                        <span className={spe.active ? 'text-white' : 'text-red-500 line-through'}>{spe.name}</span>
                                        <span className="text-gray-400">${Math.floor(spe.debtHidden)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                                <button onClick={() => { gameState.current.score += 2000; gameState.current.auditRisk += 15; playSound('cash'); }} className="py-2 bg-blue-900/50 text-blue-300 text-[9px] border border-blue-800 rounded hover:bg-blue-900">COOK BOOKS</button>
                                <button onClick={() => { gameState.current.auditRisk = 0; gameState.current.score -= 2000; playSound('shred'); }} className="py-2 bg-red-900/50 text-red-300 text-[9px] border border-red-800 rounded hover:bg-red-900">SHRED ALL</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Event Popup */}
            {activeAlert && (
                <div className={`fixed top-24 right-8 p-6 border-l-4 rounded-lg bg-gray-900/95 shadow-2xl max-w-sm animate-pop-in z-50 ${activeAlert.type === 'danger' ? 'border-red-500' : 'border-yellow-500'}`}>
                    <div className="font-bold text-lg mb-2 text-white flex items-center gap-2">
                        {activeAlert.type === 'danger' && <AlertTriangle size={20} className="text-red-500"/>}
                        {activeAlert.title}
                    </div>
                    <div className="text-sm text-gray-300 leading-relaxed font-mono">{activeAlert.message}</div>
                </div>
            )}
            
            {/* Game Over */}
            {uiState.gameOver && (
                <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center">
                    <h1 className="text-7xl text-red-600 font-black mb-6 tracking-tighter">{uiState.failReason}</h1>
                    <div className="text-3xl text-gray-300 mb-2">Final Wealth Extracted</div>
                    <div className="text-6xl text-green-500 font-mono font-bold mb-12">${Math.floor(uiState.offshore).toLocaleString()}</div>
                    <button onClick={() => window.location.reload()} className="px-12 py-4 bg-white text-black font-bold text-xl rounded hover:bg-gray-200 uppercase tracking-widest">
                        New Game
                    </button>
                </div>
            )}
        </div>
    );
};

export default App;
