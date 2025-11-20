import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RotateCcw, AlertTriangle, Zap, DollarSign, Activity, ShieldAlert, TrendingUp, TrendingDown, Lock, Globe, XCircle, Siren } from 'lucide-react';
import Scene3D from './components/Scene3D';
import ProgressBar from './components/UI/ProgressBar';
import { GameState, LogEvent, StockPoint, Difficulty } from './types';
import { INITIAL_STATE, PRICES, MAX_TEMP, MAX_PRES, MAX_RAD, MAX_POWER, HISTORIC_WEATHER } from './constants';
import { playSound, initAudio } from './utils/audioUtils';
import { generateCorporateSpin } from './services/geminiService';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const App: React.FC = () => {
    // Logic State (Refs for high freq updates)
    const gameState = useRef<GameState>({ ...INITIAL_STATE });
    
    // UI State (React state for rendering)
    const [uiState, setUiState] = useState<GameState>({ ...INITIAL_STATE });
    const [logs, setLogs] = useState<LogEvent[]>([]);
    const [stockHistory, setStockHistory] = useState<StockPoint[]>([]);
    const [activeTab, setActiveTab] = useState<'market' | 'bank' | 'shop'>('market');
    const [cutaway, setCutaway] = useState(true);
    const [started, setStarted] = useState(false);
    const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.ETHICAL);
    const [ticker, setTicker] = useState("Initializing Enron Data Feed...");
    const [activeAlert, setActiveAlert] = useState<{title: string, message: string, type: 'warning' | 'danger'} | null>(null);

    // Helper to add logs
    const addLog = useCallback((message: string, type: LogEvent['type'] = 'info') => {
        const newLog = { id: Date.now(), message, type, timestamp: new Date().toLocaleTimeString() };
        setLogs(prev => [newLog, ...prev].slice(0, 5));
    }, []);

    // Trigger High Visibility Alert
    const triggerAlert = useCallback((title: string, message: string, type: 'warning' | 'danger' = 'warning') => {
        setActiveAlert({ title, message, type });
        addLog(`${title}: ${message}`, type);
        
        if (type === 'danger') {
            playSound('alarm');
            // Multiple alarms for emphasis/panic
            setTimeout(() => playSound('alarm'), 300);
            setTimeout(() => playSound('alarm'), 600);
        } else {
            playSound('repair'); // Use repair sound as a "Notice" tone
        }

        // Clear after 4 seconds
        setTimeout(() => setActiveAlert(null), 4000);
    }, [addLog]);

    // Game Loop
    useEffect(() => {
        if (!started) return;

        const interval = setInterval(() => {
            const s = gameState.current;
            if (s.gameOver) return;

            // Time & Interest
            s.dayTime += 0.02;
            if (s.dayTime >= 24) {
                s.dayTime = 0;
                s.dayCount++;
                // Interest Logic - Difficulty impacts base rate
                if (s.loan > 0) {
                    const baseRate = 0.12 + (s.difficulty * 0.03);
                    const rate = Math.max(0.05, baseRate - (s.creditScore / 1000));
                    const interest = s.loan * rate;
                    s.score -= interest;
                    addLog(`Interest Paid: -$${Math.floor(interest)}`, 'warning');
                }
                
                // Audit Decay - Slower on higher difficulty
                if (s.auditRisk > 0) {
                    const decay = 3 / s.difficulty; 
                    s.auditRisk = Math.max(0, s.auditRisk - decay);
                }
                if (s.offshore > 0) s.offshore *= 1.05;
            }

            // Event Generator (Weather & Failures)
            const eventChance = 0.003 * s.difficulty;
            if (Math.random() < eventChance) {
               const roll = Math.random();
               
               // 1. System Failure (High Diff only)
               if (roll < 0.3 && s.difficulty > 1) {
                    if (Math.random() > 0.5) {
                        s.pump = false;
                        triggerAlert("PUMP FAILURE", "Cooling system compromised. Temp rising rapidly. RESTART PUMP IMMEDIATELY.", 'danger');
                    } else {
                        s.valve = Math.max(0, s.valve - 25);
                        triggerAlert("VALVE JAMMED", "Steam flow restricted. Pressure building critical. ADJUST VALVES.", 'warning');
                    }
               } 
               // 2. Historic Weather Event (20% chance)
               else if (roll < 0.5) {
                    const report = HISTORIC_WEATHER[Math.floor(Math.random() * HISTORIC_WEATHER.length)];
                    if (s.weather !== report.condition) {
                        s.weather = report.condition;
                        triggerAlert(`ARCHIVE: ${report.date}`, report.report, report.type);
                    }
               }
               // 3. Random Weather
               else {
                   const weathers = ['sunny', 'cloudy', 'rainy', 'snowy', 'thunderstorm'] as const;
                   const newWeather = weathers[Math.floor(Math.random() * weathers.length)];
                   if (newWeather !== s.weather) {
                       if (newWeather === 'thunderstorm' || newWeather === 'rainy') {
                           addLog(`Weather Update: ${newWeather.toUpperCase()}`, 'info');
                       }
                       s.weather = newWeather;
                   }
               }
            }

            // Physics Simulation
            const reactionIntensity = (100 - s.rods) / 100;
            if (reactionIntensity > 0) s.fuel = Math.max(0, s.fuel - (0.01 + reactionIntensity * 0.03));

            // Wear & Tear
            let pumpWear = 0.015;
            if (s.weather === 'rainy') pumpWear *= 1.1;
            if (s.weather === 'thunderstorm') pumpWear *= 1.3;
            if (s.pump) s.pumpHealth = Math.max(0, s.pumpHealth - pumpWear);
            if (s.valve > 0) s.turbineHealth = Math.max(0, s.turbineHealth - (0.01 + (s.valve/100)*0.02));

            // Heat & Pressure
            const fuelEff = Math.max(0.2, s.fuel / 100);
            const heatGen = Math.pow((100 - s.rods), 1.2) * 0.8 * fuelEff;
            
            let pumpEff = s.pumpLevel * (s.pumpHealth / 100);
            if (!s.pump) pumpEff = 0;
            
            let cooling = 5 + (s.temp - 20) * 0.005;
            const activeCooling = (s.temp - 100) * 0.15 * pumpEff;
            let steamCreated = 0;
            
            if (activeCooling > 0) {
                cooling += activeCooling;
                steamCreated = activeCooling * 2;
            }
            s.temp = Math.max(20, s.temp + (heatGen - cooling));

            const valveFlow = (s.valve / 100) * s.pressure * 0.1;
            s.pressure = Math.max(0, s.pressure + steamCreated - valveFlow);

            // Radiation
            if (s.temp > 2000 || s.pressure > 1500) {
                s.radiation += 0.5;
                s.score -= (s.radiation * 0.5); // Fines
            } else {
                s.radiation = Math.max(0, s.radiation - 0.1);
            }

            // Power Gen
            const turbEff = s.turbineHealth / 100;
            let output = valveFlow * 15 * turbEff;
            if (s.artificialShortage) output *= 0.3;
            s.power = Math.min(1500, output);

            // Grid Demand & Economics
            let targetDemand = 300;
            const h = s.dayTime;
            if (h >= 6 && h < 9) targetDemand = 300 + ((h-6)/3)*400;
            else if (h >= 9 && h < 17) targetDemand = 700;
            else if (h >= 17 && h < 22) targetDemand = 850;
            
            s.gridDemand = s.gridDemand * 0.98 + targetDemand * 0.02;

            let spotPrice = 0.10;
            if (h >= 17 && h <= 21) spotPrice = 0.50;
            else if (h >= 9 && h < 17) spotPrice = 0.25;
            
            if (s.artificialShortage) spotPrice *= 6;

            const sold = Math.min(s.power, s.gridDemand);
            const income = sold * spotPrice * 0.1;
            const penalties = (s.power < s.gridDemand * 0.9) ? (s.gridDemand - s.power) * 0.05 : 0;
            const wages = 2.0;
            
            s.score += (income - penalties - wages);
            s.cash += (income - penalties - wages) * 0.5; // Some goes to ops, some to stock value

            // Auto Scram
            if (s.hasAutoScram && s.temp > 2500 && s.rods < 100) {
                s.rods = 100;
                s.valve = 100;
                s.hasAutoScram = false;
                triggerAlert("AUTO-SCRAM TRIGGERED", "Emergency shutdown initiated. Control rods fully inserted.", 'danger');
            }

            // Game Over Checks
            if (s.temp > MAX_TEMP) { s.gameOver = true; s.failReason = "CORE MELTDOWN"; }
            if (s.pressure > MAX_PRES) { s.gameOver = true; s.failReason = "PRESSURE EXPLOSION"; }
            if (s.radiation > MAX_RAD) { s.gameOver = true; s.failReason = "RADIATION EVACUATION"; }
            if (s.score < -5000) { s.gameOver = true; s.failReason = "CHAPTER 11 BANKRUPTCY"; }

            // Update React State (throttled)
            if (Math.floor(Date.now() / 100) % 2 === 0) {
                setUiState({ ...s });
            }
        }, 50);

        // History Chart Loop
        const histInterval = setInterval(() => {
            if (gameState.current.gameOver) return;
            setStockHistory(prev => {
                const newData = [...prev, { time: '', price: gameState.current.score }];
                return newData.slice(-30); // Keep last 30 points
            });
        }, 1000);

        // Gemini Ticker Loop
        const tickerInterval = setInterval(async () => {
            if (gameState.current.gameOver) return;
            if (Math.random() > 0.3) return; // Don't spam API
            
            const txt = await generateCorporateSpin(gameState.current, 'ticker');
            setTicker(txt);
        }, 15000);

        return () => {
            clearInterval(interval);
            clearInterval(histInterval);
            clearInterval(tickerInterval);
        };
    }, [started, addLog, triggerAlert]);

    // --- Actions ---
    const handleStart = () => {
        initAudio();
        setStarted(true);
        gameState.current = { ...INITIAL_STATE, difficulty };
        setUiState({ ...INITIAL_STATE, difficulty });
        setStockHistory([]);
        setLogs([]);
        playSound('click');
    };

    const updateControl = (key: 'rods' | 'valve', val: number) => {
        gameState.current[key] = val;
    };

    const togglePump = () => {
        gameState.current.pump = !gameState.current.pump;
        playSound('click');
    };

    const handleBuy = (item: keyof typeof PRICES) => {
        // Difficulty increases shop costs
        const diffMult = 1 + (gameState.current.difficulty - 1) * 0.25; 
        const cost = PRICES[item] * diffMult;

        if (gameState.current.score >= cost) {
            if (item === 'SHRED') {
                gameState.current.auditRisk = Math.max(0, gameState.current.auditRisk - 30);
                addLog("Evidence Destroyed", 'success');
            }
            if (item === 'LOBBY') gameState.current.lobbyingLevel++;
            if (item === 'REFUEL') gameState.current.fuel = 100;
            if (item === 'FIX_PUMP') gameState.current.pumpHealth = 100;
            if (item === 'FIX_TURB') gameState.current.turbineHealth = 100;
            if (item === 'PUMP_UPGRADE_BASE') gameState.current.pumpLevel++;
            if (item === 'AUTOSCRAM') gameState.current.hasAutoScram = true;

            gameState.current.score -= cost;
            playSound('buy');
        } else {
            addLog(`Insufficient Funds. Need $${Math.floor(cost)}`, 'warning');
            playSound('alarm');
        }
    };

    const cookBooks = async () => {
        // Higher difficulty = more gain, but WAY more risk
        const baseGain = 3000;
        const gain = baseGain + (baseGain * (difficulty - 1) * 0.5);
        
        gameState.current.score += gain;
        gameState.current.auditRisk += 15 + (difficulty * 5);
        
        playSound('cash');
        addLog(`Books Cooked: +$${Math.floor(gain)}`, 'warning');
        
        const spin = await generateCorporateSpin(gameState.current, 'profit');
        setTicker(spin);
    };

    const formatMoney = (val: number) => {
        return val >= 0 ? `$${Math.floor(val).toLocaleString()}` : `-$${Math.floor(Math.abs(val)).toLocaleString()}`;
    };

    const DIFFICULTY_DESC = {
        [Difficulty.ETHICAL]: "Standard Economy. Low Audit Risk.",
        [Difficulty.AGGRESSIVE]: "Volatile Market. Mechanical failures occur.",
        [Difficulty.SKILLING]: "High Returns. High Audit Risk. Freq. Failures.",
        [Difficulty.FASTOW]: "Extreme Corruption. Max Interest. Max Risk."
    };

    if (!started) {
        return (
            <div className="h-screen w-screen flex items-center justify-center text-white relative overflow-hidden" style={{background: 'radial-gradient(circle at 50% 50%, #1e1b4b 0%, #050510 100%)'}}>
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover opacity-10"></div>
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
                </div>
                <div className="z-10 glass-panel-strong p-12 rounded-3xl max-w-md text-center animate-float">
                    <h1 className="text-6xl font-black tracking-tighter gradient-text-blue mb-2">
                        ENRON
                    </h1>
                    <p className="text-xl font-mono text-cyan-300 mb-8 tracking-widest animate-glow-pulse">MELTDOWN MANAGER</p>
                    
                    <div className="space-y-4 mb-8">
                        <p className="text-gray-400 text-sm">Select Corporate Strategy</p>
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(Difficulty).filter(([k,v]) => typeof v === 'number').map(([key, val]) => (
                                <button 
                                    key={key}
                                    onClick={() => setDifficulty(val as Difficulty)}
                                    className={`p-3 rounded border text-xs font-bold transition-all ${difficulty === val ? 'bg-blue-600 border-blue-400 text-white shadow-lg scale-105' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                >
                                    {key}
                                </button>
                            ))}
                        </div>
                        <div className="text-xs text-yellow-400 font-mono h-8 flex items-center justify-center">
                            {DIFFICULTY_DESC[difficulty]}
                        </div>
                    </div>

                    <button
                        onClick={handleStart}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 btn-glow-blue shadow-lg relative overflow-hidden"
                    >
                        <div className="absolute inset-0 animate-shimmer"></div>
                        <Play size={20} className="relative z-10" /> <span className="relative z-10">INITIALIZE MARKET</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-screen w-screen relative overflow-hidden text-white ${activeAlert?.type === 'danger' ? 'animate-flash-red' : ''}`}>
            {/* Background Scene */}
            <Scene3D gameState={gameState} cutaway={cutaway} />
            
            {/* Critical Alert Overlay */}
            {activeAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <div className={`relative max-w-xl w-full mx-4 p-8 rounded-2xl border-4 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center gap-4 animate-pop-in ${
                        activeAlert.type === 'danger' 
                            ? 'bg-red-950/90 border-red-500 text-white shadow-[0_0_100px_rgba(220,38,38,0.6)] animate-pulse' 
                            : 'bg-yellow-950/90 border-yellow-500 text-yellow-100 shadow-[0_0_50px_rgba(234,179,8,0.6)]'
                    }`}>
                        <div className={`p-5 rounded-full shadow-lg ${activeAlert.type === 'danger' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-black'}`}>
                            {activeAlert.type === 'danger' ? <Siren size={64} /> : <AlertTriangle size={64} />}
                        </div>
                        <div>
                            <h2 className="text-5xl font-black uppercase tracking-widest italic mb-2 drop-shadow-lg">{activeAlert.title}</h2>
                            <div className="text-xl font-mono border-t-2 border-white/20 pt-4 mt-2 leading-snug font-bold">
                                {activeAlert.message}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Game Over Overlay */}
            {uiState.gameOver && (
                <div className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center flex-col backdrop-blur-md animate-in fade-in duration-1000">
                    <h1 className="text-7xl font-black text-red-600 mb-4 tracking-tighter">{uiState.failReason}</h1>
                    <div className="text-2xl text-gray-400 mb-8 font-mono">
                        Total Wealth Extracted: <span className="text-green-400 font-bold">{formatMoney(uiState.offshore)}</span>
                    </div>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-8 py-3 border border-white/20 rounded hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                        <RotateCcw size={18} /> RESTART SIMULATION
                    </button>
                </div>
            )}

            {/* Top HUD */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none">
                <div className="flex flex-col gap-2">
                    <div className="glass-panel rounded-xl px-5 py-3 shadow-xl">
                        <div className="text-xs text-cyan-400 font-bold tracking-wider mb-1">STOCK PRICE</div>
                        <div className={`text-4xl font-black font-mono ${uiState.score > 0 ? 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}>
                            {formatMoney(uiState.score)}
                        </div>
                    </div>
                    <div className="glass-panel rounded-lg px-4 py-2 text-xs font-mono text-gray-300 flex items-center gap-2 shadow-lg">
                        <Globe size={12} className="text-cyan-400 animate-pulse" /> <span className="flex-1 truncate max-w-xs">{ticker}</span>
                    </div>
                </div>

                <div className="flex gap-2 pointer-events-auto">
                    <button
                        onClick={() => setCutaway(!cutaway)}
                        className={`px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-lg ${
                            cutaway
                                ? 'glass-panel-strong border-blue-400 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.4)]'
                                : 'glass-panel border-white/10 text-gray-300 hover:border-white/20'
                        }`}
                    >
                        {cutaway ? 'CUTAWAY VIEW' : 'EXTERIOR VIEW'}
                    </button>
                    <div className="glass-panel rounded-xl px-5 py-3 text-right shadow-xl">
                        <div className="text-2xl font-bold font-mono text-white drop-shadow-lg">
                            Day {uiState.dayCount} <span className="text-sm text-gray-400">{Math.floor(uiState.dayTime).toString().padStart(2, '0')}:{Math.floor((uiState.dayTime % 1) * 60).toString().padStart(2, '0')}</span>
                        </div>
                        <div className="text-xs uppercase tracking-wider text-amber-400 font-bold flex items-center justify-end gap-1 drop-shadow-lg">
                             {uiState.weather}
                        </div>
                    </div>
                </div>
            </div>

            {/* Event Log */}
            <div className="absolute top-28 left-4 w-72 pointer-events-none z-10 flex flex-col gap-2">
                {logs.map(log => (
                    <div key={log.id} className={`glass-panel p-3 rounded-lg border-l-4 text-xs font-mono animate-in slide-in-from-left fade-in duration-300 shadow-lg ${
                        log.type === 'danger'
                            ? 'border-red-500 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                            : log.type === 'success'
                            ? 'border-green-500 text-green-200 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                            : 'border-cyan-500 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                    }`}>
                        <span className="opacity-60 mr-2 text-[10px]">[{log.timestamp}]</span>
                        <span className="font-semibold">{log.message}</span>
                    </div>
                ))}
            </div>

            {/* Main UI Grid */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl z-20">
                <div className="glass-panel-strong rounded-2xl p-6 shadow-2xl grid grid-cols-12 gap-6">

                    {/* Reactor Panel */}
                    <div className="col-span-3 glass-panel rounded-xl p-4 flex flex-col gap-2 shadow-lg border-l-2 border-cyan-500/50">
                        <h3 className="text-xs font-black text-cyan-400 tracking-widest uppercase mb-2 flex items-center gap-2 drop-shadow-lg">
                            <Activity size={14} className="animate-pulse" /> Reactor Core
                        </h3>
                        
                        <ProgressBar value={uiState.temp} max={MAX_TEMP} label="CORE TEMP" unit="°C" warning={uiState.temp > 2000} />
                        <ProgressBar value={uiState.pressure} max={MAX_PRES} label="PRESSURE" unit=" PSI" color="bg-cyan-500" warning={uiState.pressure > 1200} />
                        <ProgressBar value={uiState.radiation} max={MAX_RAD} label="RADIATION" unit=" mSv" color="bg-purple-500" warning={uiState.radiation > 100} />

                        <div className={`mt-auto text-center p-2 rounded font-bold text-xs uppercase tracking-wider animate-pulse ${uiState.temp > 2500 || uiState.pressure > 1500 ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'opacity-0'}`}>
                            <AlertTriangle size={12} className="inline mr-1" /> CRITICAL WARNING
                        </div>
                    </div>

                    {/* Controls Panel */}
                    <div className="col-span-3 glass-panel rounded-xl p-4 flex flex-col shadow-lg border-l-2 border-blue-500/50">
                         <h3 className="text-xs font-black text-blue-400 tracking-widest uppercase mb-4 flex items-center gap-2 drop-shadow-lg">
                            <Zap size={14} className="animate-pulse" /> Systems Control
                        </h3>

                        <div className="mb-4">
                            <label className="text-xs text-gray-400 font-bold flex justify-between mb-1">
                                <span>CONTROL RODS</span>
                                <span>{uiState.rods}%</span>
                            </label>
                            <input 
                                type="range" min="0" max="100" 
                                value={uiState.rods} 
                                onChange={(e) => updateControl('rods', parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="text-xs text-gray-400 font-bold flex justify-between mb-1">
                                <span>STEAM VALVE</span>
                                <span>{uiState.valve}%</span>
                            </label>
                            <input 
                                type="range" min="0" max="100" 
                                value={uiState.valve} 
                                onChange={(e) => updateControl('valve', parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-auto">
                            <button
                                onClick={togglePump}
                                className={`py-2 px-3 rounded-lg font-bold text-xs transition-all ${
                                    uiState.pump
                                        ? 'bg-green-600 text-white btn-glow-green shadow-lg'
                                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                }`}
                            >
                                PUMP: {uiState.pump ? 'ON' : 'OFF'}
                            </button>
                            <button
                                onClick={() => {
                                    updateControl('rods', 100);
                                    updateControl('valve', 100);
                                    playSound('alarm');
                                }}
                                className="py-2 px-3 rounded-lg font-bold text-xs bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] hover:shadow-[0_0_25px_rgba(220,38,38,0.7)] active:scale-95 transition-all"
                            >
                                SCRAM
                            </button>
                        </div>
                    </div>

                    {/* Grid Output */}
                    <div className="col-span-3 glass-panel rounded-xl p-4 flex flex-col shadow-lg border-l-2 border-orange-500/50">
                        <h3 className="text-xs font-black text-orange-400 tracking-widest uppercase mb-2 flex items-center gap-2 drop-shadow-lg">
                            <TrendingUp size={14} className="animate-pulse" /> Grid Output
                        </h3>
                        
                        <ProgressBar value={uiState.power} max={MAX_POWER} label="OUTPUT" unit=" MW" color="bg-orange-500" marker={uiState.gridDemand} />
                        
                        <div className="mt-2 text-xs text-gray-400 grid grid-cols-2 gap-2">
                            <div className="bg-black/20 p-2 rounded">
                                <div className="text-[10px] uppercase">Efficiency</div>
                                <div className="font-mono text-white">{(uiState.turbineHealth).toFixed(0)}%</div>
                            </div>
                            <div className="bg-black/20 p-2 rounded">
                                <div className="text-[10px] uppercase">Target</div>
                                <div className="font-mono text-yellow-500">{uiState.gridDemand.toFixed(0)} MW</div>
                            </div>
                        </div>

                        <div className="mt-auto h-20 w-full">
                             <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stockHistory}>
                                    <defs>
                                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="price" stroke="#4ade80" fillOpacity={1} fill="url(#colorPrice)" isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* CFO Panel */}
                    <div className="col-span-3 glass-panel rounded-xl p-4 flex flex-col shadow-lg border-l-2 border-purple-500/50">
                        <div className="flex gap-1 mb-4 bg-black/40 p-1 rounded-lg shadow-inner">
                            {['market', 'bank', 'shop'].map(tab => (
                                <button 
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`flex-1 py-1 text-[10px] font-bold uppercase rounded transition-colors ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 flex flex-col min-h-0">
                            {activeTab === 'market' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400">Audit Risk</span>
                                        <span className={`font-bold ${uiState.auditRisk > 50 ? 'text-red-500' : 'text-green-500'}`}>{uiState.auditRisk.toFixed(0)}%</span>
                                    </div>
                                    <button onClick={cookBooks} className="w-full py-3 mt-2 bg-orange-500/20 border border-orange-500/50 text-orange-300 rounded hover:bg-orange-500/30 text-xs font-bold flex items-center justify-center gap-2">
                                        <ShieldAlert size={14} /> MARK-TO-MARKET
                                    </button>
                                    <button 
                                        onClick={() => {
                                            gameState.current.artificialShortage = !gameState.current.artificialShortage;
                                            triggerAlert("GRID MANIPULATION", `Artificial shortage ${!gameState.current.artificialShortage ? 'active' : 'disabled'}. Prices volatile.`, 'warning');
                                        }}
                                        className={`w-full py-3 bg-purple-500/20 border border-purple-500/50 text-purple-300 rounded hover:bg-purple-500/30 text-xs font-bold flex items-center justify-center gap-2 ${uiState.artificialShortage ? 'bg-purple-600/50 ring-1 ring-purple-400' : ''}`}
                                    >
                                        <TrendingDown size={14} /> ARTIFICIAL SHORTAGE
                                    </button>
                                </div>
                            )}

                            {activeTab === 'bank' && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Debt</span>
                                        <span className="text-red-400">{formatMoney(uiState.loan)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Offshore</span>
                                        <span className="text-purple-400 font-mono">{formatMoney(uiState.offshore)}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        <button 
                                            onClick={() => { gameState.current.score += 5000; gameState.current.loan += 5000; playSound('buy'); }}
                                            className="py-2 bg-green-600/20 border border-green-500/30 text-green-400 rounded text-xs hover:bg-green-600/30"
                                        >
                                            BORROW $5K
                                        </button>
                                        <button 
                                            onClick={() => { 
                                                if(gameState.current.score >= 1000) {
                                                    gameState.current.score -= 1000;
                                                    gameState.current.offshore += 1000;
                                                    playSound('cash');
                                                }
                                            }}
                                            className="py-2 bg-purple-600/20 border border-purple-500/30 text-purple-400 rounded text-xs hover:bg-purple-600/30"
                                        >
                                            SIPHON $1K
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'shop' && (
                                <div className="space-y-1 overflow-y-auto pr-2 h-32">
                                    {[
                                        { key: 'SHRED', label: 'Shred Docs', cost: PRICES.SHRED },
                                        { key: 'LOBBY', label: 'Lobby Gov', cost: PRICES.LOBBY },
                                        { key: 'REFUEL', label: 'Refuel Core', cost: PRICES.REFUEL },
                                        { key: 'FIX_PUMP', label: 'Fix Pump', cost: PRICES.FIX_PUMP },
                                        { key: 'PUMP_UPGRADE_BASE', label: 'Upg. Pump', cost: PRICES.PUMP_UPGRADE_BASE * uiState.pumpLevel },
                                        { key: 'AUTOSCRAM', label: 'Auto-SCRAM', cost: PRICES.AUTOSCRAM, disabled: uiState.hasAutoScram }
                                    ].map((item: any) => {
                                        const diffMult = 1 + (uiState.difficulty - 1) * 0.25;
                                        const finalCost = item.cost * diffMult;
                                        return (
                                            <button
                                                key={item.key}
                                                onClick={() => handleBuy(item.key)}
                                                disabled={item.disabled}
                                                className={`w-full flex justify-between items-center p-2 rounded text-xs border transition-all ${
                                                    uiState.score >= finalCost && !item.disabled
                                                    ? 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-200' 
                                                    : 'bg-black/20 border-transparent text-gray-600 cursor-not-allowed'
                                                }`}
                                            >
                                                <span>{item.label}</span>
                                                <span className="font-mono font-bold text-yellow-500">${Math.floor(finalCost)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default App;