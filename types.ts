
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

export interface GameState {
    // Core Physics
    temp: number;
    pressure: number;
    radiation: number;
    rods: number;
    valve: number;
    pump: boolean;
    fuel: number;
    pumpHealth: number;
    turbineHealth: number;
    
    // Advanced Physics
    xenon: number; // Neutron poisoning (0-100)
    flowRate: number; // Actual coolant flow (0-100)
    reactivity: number; // Net neutron multiplication factor
    meltdownProgress: number; // 0-100, if 100 triggers Game Over
    
    // Grid & Output
    power: number;
    gridDemand: number;
    
    // Financials
    score: number; // Stock Price
    cash: number; // Liquid cash
    loan: number;
    creditScore: number;
    offshore: number;
    auditRisk: number;
    politicalCapital: number;
    
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
    artificialShortage: boolean;
    
    // Settings
    difficulty: Difficulty;
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
