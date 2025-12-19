
let audioCtx: AudioContext | null = null;
let ambienceOsc: OscillatorNode | null = null;
let ambienceGain: GainNode | null = null;

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
    if (ambienceOsc) return; 

    // Create a dark industrial hum (Drone)
    ambienceOsc = audioCtx.createOscillator();
    ambienceGain = audioCtx.createGain();
    
    // Use a low sawtooth for texture
    ambienceOsc.type = 'sawtooth';
    ambienceOsc.frequency.setValueAtTime(40, audioCtx.currentTime); 
    
    // Lowpass filter to muffle it into a background rumble
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, audioCtx.currentTime);
    filter.Q.value = 1;

    // LFO to modulate the filter slightly for "breathing" reactor sound
    const lfo = audioCtx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1; // Slow cycle
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
};

export const playSound = (type: 'alarm' | 'click' | 'buy' | 'repair' | 'cash' | 'shred' | 'error') => {
    if (!audioCtx) initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    // Master limiter for sfx
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
            // Mechanical clank
            osc.type = 'square';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.start();
            osc.stop(now + 0.2);
            break;
            
        case 'cash':
            // Satisfying "kaching"
            const osc2 = audioCtx.createOscillator();
            osc2.type = 'sine';
            const gain2 = audioCtx.createGain();
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1000, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            
            osc2.frequency.setValueAtTime(2000, now); // Higher coin sound delayed slightly or just simultaneous
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
            // Harsh noise texture
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(50, now);
            
            // Modulation
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
    }
};
    