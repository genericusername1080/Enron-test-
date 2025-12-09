import { GameState, HistoricEvent } from "./types";

export const MAX_TEMP = 3000;
export const MAX_PRES = 2000;
export const MAX_POWER = 1500;
export const MAX_RAD = 1000;

export const PRICES = {
    SHRED: 3000,
    LOBBY: 5000,
    REFUEL: 1500,
    FIX_PUMP: 600,
    FIX_TURB: 600,
    PUMP_UPGRADE_BASE: 800,
    AUTOSCRAM: 1200,
    CAMPAIGN_DONATION: 2000
};

// Starting at Jan 2000. Game ends Dec 2001.
export const START_DATE = new Date("2000-01-01");

export interface WeatherPattern {
    month: number;
    year: number;
    type: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'thunderstorm';
    tempMod: number; // Multiplier for ambient temp/cooling difficulty
    demandMod: number; // Multiplier for grid demand
    name: string;
}

export const HISTORIC_WEATHER_PATTERNS: WeatherPattern[] = [
    { month: 5, year: 2000, type: 'sunny', tempMod: 1.3, demandMod: 1.4, name: "CALIFORNIA HEATWAVE" },
    { month: 6, year: 2000, type: 'sunny', tempMod: 1.4, demandMod: 1.5, name: "SF BAY AREA HEAT SPIKE" },
    { month: 11, year: 2000, type: 'snowy', tempMod: 0.6, demandMod: 1.3, name: "EARLY WINTER CHILL" },
    { month: 1, year: 2001, type: 'snowy', tempMod: 0.5, demandMod: 1.4, name: "ROLLING BLACKOUT WINTER" },
    { month: 3, year: 2001, type: 'rainy', tempMod: 1.0, demandMod: 1.1, name: "SPRING STORMS" },
    { month: 8, year: 2001, type: 'thunderstorm', tempMod: 1.2, demandMod: 1.3, name: "LATE SUMMER STORM" },
];

export const HISTORIC_EVENTS: HistoricEvent[] = [
    { 
        month: 5, year: 2000, 
        title: "CALIFORNIA ENERGY CRISIS BEGINS", 
        description: "Prices uncapped. Market volatility extreme. Opportunity for 'creative' arbitrage.",
        type: 'warning',
        effect: (s) => { s.gridDemand += 200; }
    },
    { 
        month: 8, year: 2000, 
        title: "STOCK HITS $90 PEAK", 
        description: "Wall Street loves us. Expectations are impossible to meet.", 
        type: 'info',
        effect: (s) => { s.score = Math.max(s.score, 90); }
    },
    { 
        month: 11, year: 2000, 
        title: "ELECTION CHAOS", 
        description: "Bush vs Gore. Uncertainty roils markets. Lobbying costs increase.", 
        type: 'warning'
    },
    { 
        month: 1, year: 2001, 
        title: "JEFF SKILLING TAKES OVER", 
        description: "Named CEO. Aggressive accounting is now mandatory policy.", 
        type: 'info',
        effect: (s) => { s.difficulty = Math.min(4, s.difficulty + 1); }
    },
    { 
        month: 3, year: 2001, 
        title: "ROLLING BLACKOUTS", 
        description: "California goes dark. Public outrage growing. Hide the money.", 
        type: 'danger',
        effect: (s) => { s.auditRisk += 10; }
    },
    { 
        month: 8, year: 2001, 
        title: "SKILLING RESIGNS", 
        description: "'Personal reasons'. Stock plummets. Panic in the boardroom.", 
        type: 'danger',
        effect: (s) => { s.score *= 0.7; s.auditRisk += 20; }
    },
    { 
        month: 9, year: 2001, 
        title: "SEPTEMBER 11 ATTACKS", 
        description: "National tragedy. Markets closed. Regulators distracted. Audit risk drops temporarily.", 
        type: 'danger',
        effect: (s) => { s.auditRisk = 0; s.gridDemand *= 0.5; s.score *= 0.8; }
    },
    { 
        month: 10, year: 2001, 
        title: "SEC INQUIRY OPENED", 
        description: "They are asking about the partnerships. Shred everything.", 
        type: 'danger',
        effect: (s) => { s.auditRisk = 90; }
    },
    { 
        month: 11, year: 2001, 
        title: "DYNEGY MERGER FAILS", 
        description: "Nobody wants to buy us. Cash reserves critical.", 
        type: 'danger',
        effect: (s) => { s.score = 1; }
    }
];

export const INITIAL_STATE: GameState = {
    temp: 300,
    pressure: 0,
    radiation: 0,
    rods: 100,
    valve: 0,
    pump: true,
    fuel: 100,
    pumpHealth: 100,
    turbineHealth: 100,
    power: 0,
    gridDemand: 500,
    score: 40, // Starting Stock Price Jan 2000
    cash: 5000, 
    loan: 0,
    creditScore: 50,
    offshore: 0,
    auditRisk: 0,
    politicalCapital: 10,
    dayTime: 8.0,
    dayCount: 0,
    date: "Jan 2000",
    weather: 'sunny',
    gameOver: false,
    failReason: null,
    pumpLevel: 1,
    hasAutoScram: false,
    lobbyingLevel: 0,
    artificialShortage: false,
    difficulty: 1
};