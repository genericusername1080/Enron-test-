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
    score: number; // Stock Price basically
    cash: number; // Liquid cash for upgrades
    loan: number;
    creditScore: number;
    offshore: number;
    auditRisk: number;
    
    // Simulation
    dayTime: number;
    dayCount: number;
    weather: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'thunderstorm';
    gameOver: boolean;
    failReason: string | null;
    
    // Upgrades & Status
    pumpLevel: number;
    hasAutoScram: boolean;
    lobbyingLevel: number;
    artificialShortage: boolean;
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
