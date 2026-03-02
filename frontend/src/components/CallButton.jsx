import { useCallback } from 'react';

/**
 * Push-to-talk / start call button with visual state feedback.
 */
export default function CallButton({
    connectionState,
    appStatus,
    onConnect,
    onDisconnect,
    onStartRecording,
    onStopRecording,
}) {
    const isConnected = connectionState === 'connected';
    const isConnecting = connectionState === 'connecting';
    const canRecord = isConnected && (appStatus === 'idle' || appStatus === 'error');
    const isProcessing = appStatus === 'thinking' || appStatus === 'speaking';

    const handleMouseDown = useCallback((e) => {
        e.preventDefault();
        if (canRecord) onStartRecording();
    }, [canRecord, onStartRecording]);

    const handleMouseUp = useCallback((e) => {
        e.preventDefault();
        if (appStatus === 'listening') onStopRecording();
    }, [appStatus, onStopRecording]);

    // Handle touch events for mobile
    const handleTouchStart = useCallback((e) => {
        e.preventDefault();
        if (canRecord) onStartRecording();
    }, [canRecord, onStartRecording]);

    const handleTouchEnd = useCallback((e) => {
        e.preventDefault();
        if (appStatus === 'listening') onStopRecording();
    }, [appStatus, onStopRecording]);

    // Disconnect / not-connected state
    if (!isConnected && !isConnecting) {
        return (
            <button
                id="start-call-btn"
                className="call-button call-button--start"
                onClick={onConnect}
            >
                <span className="call-button__icon">📞</span>
                <span className="call-button__label">Start Call</span>
            </button>
        );
    }

    if (isConnecting) {
        return (
            <button className="call-button call-button--connecting" disabled>
                <span className="call-button__spinner" />
                <span className="call-button__label">Connecting...</span>
            </button>
        );
    }

    // Connected — show push-to-talk
    const buttonClass = [
        'call-button',
        'call-button--ptt',
        appStatus === 'listening' && 'call-button--active',
        isProcessing && 'call-button--processing',
    ].filter(Boolean).join(' ');

    const label = appStatus === 'listening'
        ? 'Release to Send'
        : isProcessing
            ? (appStatus === 'thinking' ? 'Thinking...' : 'Speaking...')
            : 'Hold to Talk';

    return (
        <button
            id="ptt-btn"
            className={buttonClass}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            disabled={isProcessing}
        >
            <span className="call-button__icon">
                {appStatus === 'listening' ? '🎙️' : isProcessing ? '⏳' : '🎤'}
            </span>
            <span className="call-button__label">{label}</span>
        </button>
    );
}
