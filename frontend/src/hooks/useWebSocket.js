import { useState, useRef, useCallback, useEffect } from 'react';
import { WebSocketService } from '../services/websocket';

/**
 * Custom hook managing WebSocket connection lifecycle and message handling.
 */
export function useWebSocket() {
    const [connectionState, setConnectionState] = useState('disconnected'); // disconnected | connecting | connected
    const [appStatus, setAppStatus] = useState('idle'); // idle | listening | thinking | speaking | error
    const [lastTranscript, setLastTranscript] = useState('');
    const [lastResponse, setLastResponse] = useState('');
    const [error, setError] = useState(null);
    const wsRef = useRef(null);
    const onAudioRef = useRef(null);

    const cleanup = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.disconnect();
            wsRef.current = null;
        }
    }, []);

    const connect = useCallback(async () => {
        cleanup();
        setConnectionState('connecting');
        setError(null);

        const ws = new WebSocketService();
        wsRef.current = ws;

        ws.on('message', (data) => {
            if (data.type === 'status') {
                switch (data.status) {
                    case 'connected':
                        setAppStatus('idle');
                        break;
                    case 'listening':
                        setAppStatus('listening');
                        break;
                    case 'thinking':
                        setAppStatus('thinking');
                        if (data.transcript) setLastTranscript(data.transcript);
                        break;
                    case 'speaking':
                        setAppStatus('speaking');
                        if (data.text) setLastResponse(data.text);
                        break;
                    case 'audio_complete':
                        // Audio playback is finishing — will transition back to idle
                        break;
                }
            } else if (data.type === 'error') {
                setError(data.error);
                setAppStatus('error');
            } else if (data.type === 'pong') {
                // Heartbeat response
            }
        });

        ws.on('audio', (audioData) => {
            if (onAudioRef.current) {
                onAudioRef.current(audioData);
            }
        });

        ws.on('close', () => {
            setConnectionState('disconnected');
            setAppStatus('idle');
        });

        ws.on('reconnecting', ({ attempt }) => {
            setConnectionState('connecting');
        });

        ws.on('error', () => {
            setError('Connection failed');
        });

        try {
            await ws.connect();
            setConnectionState('connected');
            setAppStatus('idle');
        } catch (e) {
            setConnectionState('disconnected');
            setError('Failed to connect to server');
        }
    }, [cleanup]);

    const disconnect = useCallback(() => {
        cleanup();
        setConnectionState('disconnected');
        setAppStatus('idle');
        setError(null);
    }, [cleanup]);

    const sendJSON = useCallback((data) => {
        if (wsRef.current) {
            wsRef.current.sendJSON(data);
        }
    }, []);

    const sendBinary = useCallback((data) => {
        if (wsRef.current) {
            wsRef.current.sendBinary(data);
        }
    }, []);

    const setOnAudio = useCallback((callback) => {
        onAudioRef.current = callback;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    return {
        connectionState,
        appStatus,
        lastTranscript,
        lastResponse,
        error,
        connect,
        disconnect,
        sendJSON,
        sendBinary,
        setOnAudio,
        setAppStatus,
        setError,
    };
}

export default useWebSocket;
