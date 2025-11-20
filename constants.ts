export const MAX_TEMP = 3000;
export const MAX_PRES = 2000;
export const MAX_POWER = 1500;
export const MAX_RAD = 1000;

export const PRICES = {
    SHRED: 3000,
    LOBBY: 2000,
    REFUEL: 1500,
    FIX_PUMP: 600,
    FIX_TURB: 600,
    PUMP_UPGRADE_BASE: 800,
    AUTOSCRAM: 1200
};

export const INITIAL_STATE = {
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
    score: 100, // Starting Stock Price
    cash: 5000, // Starting Operating Cash
    loan: 0,
    creditScore: 50,
    offshore: 0,
    auditRisk: 0,
    dayTime: 8.0,
    dayCount: 1,
    weather: 'sunny',
    gameOver: false,
    failReason: null,
    pumpLevel: 1,
    hasAutoScram: false,
    lobbyingLevel: 0,
    artificialShortage: false,
    difficulty: 1
} as const;