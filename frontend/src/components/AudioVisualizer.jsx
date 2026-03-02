import { useRef, useEffect } from 'react';

/**
 * Canvas-based audio level visualizer with animated bars.
 */
export default function AudioVisualizer({ audioLevel = 0, status = 'idle' }) {
    const canvasRef = useRef(null);
    const animRef = useRef(null);
    const barsRef = useRef(Array.from({ length: 32 }, () => 0));

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.offsetWidth * dpr;
        canvas.height = canvas.offsetHeight * dpr;
        ctx.scale(dpr, dpr);

        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;
        const bars = barsRef.current;
        const barCount = bars.length;
        const barWidth = width / barCount - 2;

        const getColor = () => {
            switch (status) {
                case 'listening': return '#4ade80';
                case 'thinking': return '#facc15';
                case 'speaking': return '#818cf8';
                default: return '#64748b';
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, width, height);
            const color = getColor();
            const centerY = height / 2;

            for (let i = 0; i < barCount; i++) {
                // Smooth interpolation towards target level
                const targetHeight = (status === 'idle')
                    ? 2
                    : Math.max(2, audioLevel * height * 0.8 * (0.5 + 0.5 * Math.sin(Date.now() / 200 + i * 0.5)));

                bars[i] += (targetHeight - bars[i]) * 0.15;

                const barHeight = bars[i];
                const x = i * (barWidth + 2) + 1;

                // Gradient bar from center
                const gradient = ctx.createLinearGradient(x, centerY - barHeight / 2, x, centerY + barHeight / 2);
                gradient.addColorStop(0, color + '40');
                gradient.addColorStop(0.5, color);
                gradient.addColorStop(1, color + '40');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.roundRect(x, centerY - barHeight / 2, barWidth, barHeight, barWidth / 2);
                ctx.fill();
            }

            animRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [audioLevel, status]);

    return (
        <div className="audio-visualizer">
            <canvas ref={canvasRef} style={{ width: '100%', height: '80px' }} />
        </div>
    );
}
