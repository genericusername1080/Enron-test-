
import { GameState, HistoricEvent, Chapter } from "./types";

export const MAX_TEMP = 3000;
export const MAX_PRES = 2000;
export const MAX_POWER = 1500;
export const MAX_RAD = 1000;

export const MELTDOWN_TEMP_START = 2600;
export const MELTDOWN_PRES_START = 1800;

export const PRICES = {
    SHRED: 3000,
    LOBBY: 5000,
    REFUEL: 1500,
    FIX_PUMP: 800,
    FIX_TURB: 1200,
    FIX_CONDENSER: 1000,
    PUMP_UPGRADE_BASE: 800,
    AUTOSCRAM: 2500,
    CAMPAIGN_DONATION: 2000,
    CREATE_SPE: 1000
};

export const START_DATE = new Date("2000-01-01");

export const CHAPTERS: Chapter[] = [
    {
        id: 0,
        title: "Chapter 1: The Vision",
        year: "Early 2000",
        description: "Establish Enron Energy Services. Keep the lights on and the stock moving up.",
        winCondition: (s) => s.score > 60 && s.cash > 8000,
        modifiers: { demandScale: 1.0, volatility: 0.5, regulatorAggression: 0.2 }
    },
    {
        id: 1,
        title: "Chapter 2: The California Crisis",
        year: "Late 2000",
        description: "Demand is skyrocketing. Create artificial shortages (brownouts) to spike prices.",
        winCondition: (s) => s.score > 100 && s.offshore > 5000,
        modifiers: { demandScale: 1.5, volatility: 1.2, regulatorAggression: 0.4 }
    },
    {
        id: 2,
        title: "Chapter 3: Creative Accounting",
        year: "2001",
        description: "The debt is piling up. Use SPEs to hide losses. Avoid the SEC.",
        winCondition: (s) => s.score > 150 && s.spes.length >= 3,
        modifiers: { demandScale: 0.8, volatility: 2.0, regulatorAggression: 0.9 }
    },
    {
        id: 3,
        title: "Chapter 4: The Collapse",
        year: "Late 2001",
        description: "It's all over. Extract as much personal wealth as possible before the indictment.",
        winCondition: (s) => s.offshore > 50000, // Escape plan
        modifiers: { demandScale: 0.5, volatility: 3.0, regulatorAggression: 1.5 }
    }
];

export interface WeatherPattern {
    month: number;
    year: number;
    type: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'thunderstorm';
    tempMod: number; 
    demandMod: number; 
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
        description: "Prices uncapped. Market volatility extreme.",
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
        description: "California goes dark. Public outrage growing.", 
        type: 'danger',
        effect: (s) => { s.auditRisk += 10; }
    },
    { 
        month: 8, year: 2001, 
        title: "SKILLING RESIGNS", 
        description: "Stock plummets. Panic in the boardroom.", 
        type: 'danger',
        effect: (s) => { s.score *= 0.7; s.auditRisk += 20; }
    },
    { 
        month: 9, year: 2001, 
        title: "SEPTEMBER 11 ATTACKS", 
        description: "National tragedy. Regulators distracted.", 
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
    condenserHealth: 100,
    gridHz: 60,
    brownoutActive: false,
    xenon: 0,
    flowRate: 100,
    reactivity: 0,
    meltdownProgress: 0,
    power: 0,
    gridDemand: 600,
    score: 40, 
    cash: 5000, 
    loan: 0,
    creditScore: 50,
    offshore: 0,
    auditRisk: 0,
    politicalCapital: 10,
    spes: [],
    totalHiddenDebt: 0,
    dayTime: 8.0,
    dayCount: 0,
    date: "Jan 2000",
    weather: 'sunny',
    gameOver: false,
    failReason: null,
    pumpLevel: 1,
    hasAutoScram: false,
    lobbyingLevel: 0,
    lobbyingShieldTime: 0,
    artificialShortage: false,
    difficulty: 1,
    currentChapter: 0,
    lastDividendWeek: 0
};
