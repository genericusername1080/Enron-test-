import React from 'react';

interface ProgressBarProps {
    value: number;
    max?: number;
    color?: string;
    label?: string;
    unit?: string;
    marker?: number;
    warning?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, max = 100, color = 'bg-blue-500', label, unit = '', marker, warning }) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    
    // Dynamic color based on value if not forced
    let barColor = color;
    if (!color.startsWith('bg-')) {
        // If passed specific color class
        barColor = color;
    } else {
        // Logic for default bars
        if (value < max * 0.3) barColor = 'bg-red-500';
        else if (value < max * 0.6) barColor = 'bg-yellow-500';
        else barColor = 'bg-green-500';
    }

    return (
        <div className="mb-3">
            {label && (
                <div className="flex justify-between text-xs font-mono mb-1 text-gray-400">
                    <span>{label}</span>
                    <span className={`font-bold ${warning ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                        {Math.floor(value)}{unit}
                    </span>
                </div>
            )}
            <div className="h-2 bg-black/60 rounded relative overflow-hidden border border-white/10">
                <div 
                    className={`h-full transition-all duration-300 ease-out ${barColor}`} 
                    style={{ width: `${percentage}%` }}
                ></div>
                {marker !== undefined && (
                    <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-white z-10 shadow-[0_0_4px_white]"
                        style={{ left: `${(marker / max) * 100}%` }}
                    ></div>
                )}
            </div>
        </div>
    );
};

export default ProgressBar;
