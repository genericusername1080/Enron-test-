import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RotateCcw, AlertTriangle, Zap, DollarSign, Activity, ShieldAlert, TrendingUp, TrendingDown, Lock, Globe } from 'lucide-react';
import Scene3D from './components/Scene3D';
import ProgressBar from './components/UI/ProgressBar';
import { GameState, LogEvent, StockPoint, Difficulty } from './types';
import { INITIAL_STATE, PRICES, MAX_TEMP, MAX_PRES, MAX_RAD, MAX_POWER } from './constants';
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

    // Helper to add logs
    const addLog = useCallback((message: string, type: LogEvent['type'] = 'info') => {
        const newLog = { id: Date.now(), message, type, timestamp: new Date().toLocaleTimeString() };
        setLogs(prev => [newLog, ...prev].slice(0, 5));
        if (type === 'danger') playSound('alarm');
    }, []);

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
            const eventChance = 0.001 * s.difficulty;
            if (Math.random() < eventChance) {
               // 30% chance of system failure, 70% weather
               if (Math.random() < 0.3 && s.difficulty > 1) {
                    if (Math.random() > 0.5) {
                        s.pump = false;
                        addLog("PUMP TRIP - MECHANICAL FAILURE", 'danger');
                    } else {
                        s.valve = Math.max(0, s.valve - 25);
                        addLog("VALVE JAM - FLOW RESTRICTED", 'warning');
                    }
               } else {
                   const weathers = ['sunny', 'cloudy', 'rainy', 'snowy', 'thunderstorm'] as const;
                   s.weather = weathers[Math.floor(Math.random() * weathers.length)];
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
                addLog("AUTO-SCRAM TRIGGERED", 'danger');
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
    }, [started, addLog]);

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
            <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover opacity-20 animate-pulse"></div>
                <div className="z-10 bg-black/80 p-12 rounded-2xl border border-blue-500/30 backdrop-blur-xl shadow-2xl max-w-md text-center">
                    <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-4">
                        ENRON
                    </h1>
                    <p className="text-xl font-mono text-blue-200 mb-8 tracking-widest">MELTDOWN MANAGER</p>
                    
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
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(37,99,235,0.5)]"
                    >
                        <Play size={20} /> INITIALIZE MARKET
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen relative overflow-hidden text-white">
            {/* Background Scene */}
            <Scene3D gameState={gameState} cutaway={cutaway} />
            
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
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                <div className="flex flex-col gap-1">
                    <div className="bg-black/40 backdrop-blur border border-white/10 rounded px-4 py-2">
                        <div className="text-xs text-blue-400 font-bold tracking-wider">STOCK PRICE</div>
                        <div className={`text-3xl font-black font-mono ${uiState.score > 0 ? 'text-green-400' : 'text-red-500'}`}>
                            {formatMoney(uiState.score)}
                        </div>
                    </div>
                    <div className="bg-black/40 backdrop-blur border border-white/10 rounded px-4 py-1 text-xs font-mono text-gray-300 flex items-center gap-2">
                        <Globe size={12} /> {ticker}
                    </div>
                </div>

                <div className="flex gap-2 pointer-events-auto">
                    <button 
                        onClick={() => setCutaway(!cutaway)}
                        className={`px-4 py-2 rounded backdrop-blur border text-sm font-bold transition-all ${cutaway ? 'bg-blue-600/80 border-blue-400' : 'bg-black/40 border-white/10'}`}
                    >
                        {cutaway ? 'EXTERIOR VIEW' : 'CUTAWAY VIEW'}
                    </button>
                    <div className="bg-black/40 backdrop-blur border border-white/10 rounded px-4 py-2 text-right">
                        <div className="text-2xl font-bold font-mono">
                            Day {uiState.dayCount} <span className="text-sm text-gray-400">{Math.floor(uiState.dayTime).toString().padStart(2, '0')}:{Math.floor((uiState.dayTime % 1) * 60).toString().padStart(2, '0')}</span>
                        </div>
                        <div className="text-xs uppercase tracking-wider text-yellow-500 font-bold flex items-center justify-end gap-1">
                             {uiState.weather}
                        </div>
                    </div>
                </div>
            </div>

            {/* Event Log */}
            <div className="absolute top-24 left-4 w-64 pointer-events-none z-10 flex flex-col gap-2">
                {logs.map(log => (
                    <div key={log.id} className={`bg-black/60 backdrop-blur p-2 rounded border-l-2 text-xs font-mono animate-in slide-in-from-left fade-in duration-300 ${
                        log.type === 'danger' ? 'border-red-500 text-red-200' : 
                        log.type === 'success' ? 'border-green-500 text-green-200' : 
                        'border-blue-500 text-blue-200'
                    }`}>
                        <span className="opacity-50 mr-2">[{log.timestamp}]</span>
                        {log.message}
                    </div>
                ))}
            </div>

            {/* Main UI Grid */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[95%] max-w-6xl z-20">
                <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-2xl grid grid-cols-12 gap-6">
                    
                    {/* Reactor Panel */}
                    <div className="col-span-3 bg-white/5 rounded-lg p-4 border border-white/5 flex flex-col gap-2">
                        <h3 className="text-xs font-black text-blue-400 tracking-widest uppercase mb-2 flex items-center gap-2">
                            <Activity size={14} /> Reactor Core
                        </h3>
                        
                        <ProgressBar value={uiState.temp} max={MAX_TEMP} label="CORE TEMP" unit="°C" warning={uiState.temp > 2000} />
                        <ProgressBar value={uiState.pressure} max={MAX_PRES} label="PRESSURE" unit=" PSI" color="bg-cyan-500" warning={uiState.pressure > 1200} />
                        <ProgressBar value={uiState.radiation} max={MAX_RAD} label="RADIATION" unit=" mSv" color="bg-purple-500" warning={uiState.radiation > 100} />

                        <div className={`mt-auto text-center p-2 rounded font-bold text-xs uppercase tracking-wider animate-pulse ${uiState.temp > 2500 || uiState.pressure > 1500 ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'opacity-0'}`}>
                            <AlertTriangle size={12} className="inline mr-1" /> CRITICAL WARNING
                        </div>
                    </div>

                    {/* Controls Panel */}
                    <div className="col-span-3 bg-white/5 rounded-lg p-4 border border-white/5 flex flex-col">
                         <h3 className="text-xs font-black text-blue-400 tracking-widest uppercase mb-4 flex items-center gap-2">
                            <Zap size={14} /> Systems Control
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
                                className={`py-2 px-3 rounded font-bold text-xs transition-all ${uiState.pump ? 'bg-green-600 text-white shadow-[0_0_10px_rgba(22,163,74,0.4)]' : 'bg-gray-700 text-gray-400'}`}
                            >
                                PUMP: {uiState.pump ? 'ON' : 'OFF'}
                            </button>
                            <button 
                                onClick={() => {
                                    updateControl('rods', 100);
                                    updateControl('valve', 100);
                                    playSound('alarm');
                                }}
                                className="py-2 px-3 rounded font-bold text-xs bg-red-600 hover:bg-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)] active:scale-95 transition-transform"
                            >
                                SCRAM
                            </button>
                        </div>
                    </div>

                    {/* Grid Output */}
                    <div className="col-span-3 bg-white/5 rounded-lg p-4 border border-white/5 flex flex-col">
                        <h3 className="text-xs font-black text-blue-400 tracking-widest uppercase mb-2 flex items-center gap-2">
                            <TrendingUp size={14} /> Grid Output
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
                    <div className="col-span-3 bg-white/5 rounded-lg p-4 border border-white/5 flex flex-col">
                        <div className="flex gap-1 mb-4 bg-black/30 p-1 rounded-lg">
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
                                            addLog("Grid Manipulation Toggled", 'warning');
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