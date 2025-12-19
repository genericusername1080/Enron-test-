
let audioCtx: AudioContext | null = null;
let ambienceOsc: OscillatorNode | null = null;
let ambienceGain: GainNode | null = null;

// Dynamic Reactor Hum
let humOsc: OscillatorNode | null = null;
let humGain: GainNode | null = null;
let nextGeigerClickTime = 0;

export const initAudio = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
};

export const startAmbience = () => {
    if (!audioCtx) initAudio();
    if (!audioCtx) return;

    // 1. Dark Industrial Drone (Background)
    if (!ambienceOsc) {
        ambienceOsc = audioCtx.createOscillator();
        ambienceGain = audioCtx.createGain();
        
        ambienceOsc.type = 'sawtooth';
        ambienceOsc.frequency.setValueAtTime(40, audioCtx.currentTime); 
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(120, audioCtx.currentTime);
        filter.Q.value = 1;

        const lfo = audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1;
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 50;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();

        ambienceGain.gain.setValueAtTime(0.03, audioCtx.currentTime);

        ambienceOsc.connect(filter);
        filter.connect(ambienceGain);
        ambienceGain.connect(audioCtx.destination);
        ambienceOsc.start();
    }

    // 2. Variable Reactor Hum (Foreground)
    if (!humOsc) {
        humOsc = audioCtx.createOscillator();
        humGain = audioCtx.createGain();
        
        humOsc.type = 'sine'; // Pure sine for "electric" feel
        humOsc.frequency.setValueAtTime(60, audioCtx.currentTime); 
        humGain.gain.setValueAtTime(0, audioCtx.currentTime); // Start silent
        
        humOsc.connect(humGain);
        humGain.connect(audioCtx.destination);
        humOsc.start();
    }
};

export const updateAmbience = (power: number, pressure: number, temp: number) => {
    if (!audioCtx || !humOsc || !humGain) return;
    const now = audioCtx.currentTime;

    // Pitch rises with power (60Hz idle -> ~200Hz max)
    const targetFreq = 60 + (power / 1500) * 140;
    humOsc.frequency.setTargetAtTime(targetFreq, now, 0.2);

    // Volume rises with pressure/stress (0 -> 0.15)
    // If temp is high, add a bit more volume for "roaring"
    const stressFactor = (pressure / 2000) + (Math.max(0, temp - 2000) / 1000);
    const targetGain = Math.min(0.2, stressFactor * 0.15 + 0.01);
    humGain.gain.setTargetAtTime(targetGain, now, 0.2);
};

export const playGeiger = (radiation: number) => {
    if (!audioCtx || radiation < 5) return;
    
    // Radiation 0-1000. 
    // Chance increases with rads. At 1000 rads, ~50% chance per check (called ~20fps = 10 clicks/sec)
    const clickChance = (radiation / 1000) * 0.5; 
    
    if (Math.random() < clickChance && audioCtx.currentTime > nextGeigerClickTime) {
        const t = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        // Short, high-pitch click
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200 + Math.random() * 200, t);
        
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.005);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(t);
        osc.stop(t + 0.01);
        
        // Limit max click rate slightly
        nextGeigerClickTime = t + 0.04; 
    }
};

export const playSound = (type: 'alarm' | 'click' | 'buy' | 'repair' | 'cash' | 'shred' | 'error' | 'build') => {
    if (!audioCtx) initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;

    switch (type) {
        case 'alarm':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
            // Siren wobble
            osc.frequency.setValueAtTime(600, now + 0.4);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.8);
            
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.7);
            gain.gain.linearRampToValueAtTime(0, now + 0.8);
            
            osc.start();
            osc.stop(now + 0.8);
            break;
            
        case 'click':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start();
            osc.stop(now + 0.05);
            break;
            
        case 'buy':
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(880, now + 0.1);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.linearRampToValueAtTime(0.05, now + 0.1);
            gain.gain.linearRampToValueAtTime(0, now + 0.2);
            osc.start();
            osc.stop(now + 0.2);
            break;
            
        case 'repair':
            osc.type = 'square';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start();
            osc.stop(now + 0.2);
            break;
            
        case 'cash':
            const osc2 = audioCtx.createOscillator();
            osc2.type = 'sine';
            const gain2 = audioCtx.createGain();
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1000, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            
            osc2.frequency.setValueAtTime(2000, now);
            osc2.frequency.setValueAtTime(2000, now + 0.05);
            gain2.gain.setValueAtTime(0, now);
            gain2.gain.setValueAtTime(0.05, now + 0.05);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

            osc.start();
            osc.stop(now + 0.5);
            osc2.start();
            osc2.stop(now + 0.5);
            break;
            
        case 'shred':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(50, now);
            const mod = audioCtx.createOscillator();
            mod.type = 'square';
            mod.frequency.value = 50;
            const modGain = audioCtx.createGain();
            modGain.gain.value = 500;
            mod.connect(modGain);
            modGain.connect(osc.frequency);
            mod.start();
            mod.stop(now + 0.6);

            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.6);
            osc.start();
            osc.stop(now + 0.6);
            break;
            
        case 'error':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.3);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.3);
            osc.start();
            osc.stop(now + 0.3);
            break;

        case 'build':
            // Low thud/boom for construction
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(80, now);
            osc.frequency.exponentialRampToValueAtTime(10, now + 0.5);
            
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
            
            osc.start();
            osc.stop(now + 0.5);
            break;
    }
};
