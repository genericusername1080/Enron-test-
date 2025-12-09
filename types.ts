export enum Difficulty {
    ETHICAL = 1,
    AGGRESSIVE = 2,
    SKILLING = 3,
    FASTOW = 4
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
    politicalCapital: number; // New resource
    
    // Simulation
    dayTime: number;
    dayCount: number;
    date: string; // Tracking real calendar date
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
    month: number; // 1-12
    year: number; // 2000 or 2001
    title: string;
    description: string;
    type: 'info' | 'warning' | 'danger';
    effect?: (state: GameState) => void;
}