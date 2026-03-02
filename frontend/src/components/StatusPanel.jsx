import { useState, useEffect, useRef } from 'react';

/**
 * Status panel showing connection state, conversation status, and call timer.
 */
export default function StatusPanel({
    connectionState,
    appStatus,
    lastTranscript,
    lastResponse,
    error,
    onDisconnect,
}) {
    const [callDuration, setCallDuration] = useState(0);
    const timerRef = useRef(null);

    // Call duration timer
    useEffect(() => {
        if (connectionState === 'connected') {
            setCallDuration(0);
            timerRef.current = setInterval(() => {
                setCallDuration((d) => d + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
            setCallDuration(0);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [connectionState]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const statusLabel = {
        idle: 'Ready',
        listening: 'Listening...',
        thinking: 'Anorak is thinking...',
        speaking: 'Anorak is speaking...',
        error: 'Error',
    };

    const statusDotClass = {
        idle: 'status-dot--ready',
        listening: 'status-dot--listening',
        thinking: 'status-dot--thinking',
        speaking: 'status-dot--speaking',
        error: 'status-dot--error',
    };

    return (
        <div className="status-panel">
            <div className="status-panel__header">
                <div className="status-panel__connection">
                    <span className={`status-dot ${connectionState === 'connected' ? statusDotClass[appStatus] || '' : 'status-dot--disconnected'}`} />
                    <span className="status-panel__state">
                        {connectionState === 'connected'
                            ? statusLabel[appStatus] || 'Connected'
                            : connectionState === 'connecting'
                                ? 'Connecting...'
                                : 'Disconnected'}
                    </span>
                </div>

                {connectionState === 'connected' && (
                    <div className="status-panel__right">
                        <span className="status-panel__timer">{formatTime(callDuration)}</span>
                        <button id="disconnect-btn" className="status-panel__disconnect" onClick={onDisconnect}>
                            End Call
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div className="status-panel__error">
                    ⚠️ {error}
                </div>
            )}

            {lastTranscript && (
                <div className="status-panel__transcript">
                    <span className="transcript-label">You:</span> {lastTranscript}
                </div>
            )}

            {lastResponse && (
                <div className="status-panel__response">
                    <span className="response-label">Anorak:</span> {lastResponse}
                </div>
            )}
        </div>
    );
}
