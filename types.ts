
export enum Difficulty {
    ETHICAL = 1,
    AGGRESSIVE = 2,
    SKILLING = 3,
    FASTOW = 4
}

export interface SPE {
    id: string;
    name: string;
    debtHidden: number;
    triggerPrice: number;
    active: boolean;
}

export interface Chapter {
    id: number;
    title: string;
    year: string;
    description: string;
    winCondition: (s: GameState) => boolean;
    modifiers: {
        demandScale: number;
        volatility: number;
        regulatorAggression: number;
    };
}

export interface GameState {
    // Core Physics
    temp: number;
    pressure: number;
    radiation: number;
    rods: number;
    valve: number;
    pump: boolean;
    fuel: number;
    
    // Advanced Physics & Maintenance
    pumpHealth: number;
    turbineHealth: number;
    condenserHealth: number; // New: Affects cooling efficiency
    gridHz: number; // New: Must stay between 59-61Hz
    brownoutActive: boolean;
    
    // Advanced Physics
    xenon: number; 
    flowRate: number; 
    reactivity: number; 
    meltdownProgress: number; 
    
    // Grid & Output
    power: number;
    gridDemand: number;
    
    // Financials
    score: number; // Stock Price
    cash: number; 
    loan: number;
    creditScore: number;
    offshore: number;
    auditRisk: number;
    politicalCapital: number;
    lastDividendWeek: number; 
    
    // Special Purpose Entities
    spes: SPE[];
    totalHiddenDebt: number;
    
    // Simulation
    dayTime: number;
    dayCount: number;
    date: string; 
    weather: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'thunderstorm';
    gameOver: boolean;
    failReason: string | null;
    
    // Upgrades & Status
    pumpLevel: number;
    hasAutoScram: boolean;
    lobbyingLevel: number;
    lobbyingShieldTime: number; // New: Duration of active lobbying protection
    artificialShortage: boolean;
    
    // Meta
    difficulty: Difficulty;
    currentChapter: number;
}

export interface LogEvent {
    id: number;
    message: string;
    type: 'info' | 'warning' | 'danger' | 'success';
    timestamp: string;
}

export interface StockPoint {
    time: string;
    price: number;
}

export interface HistoricEvent {
    month: number;
    year: number;
    title: string;
    description: string;
    type: 'info' | 'warning' | 'danger';
    effect?: (state: GameState) => void;
}
