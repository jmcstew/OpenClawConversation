import { useRef, useCallback, useState, useEffect } from 'react';

/**
 * Custom hook for audio capture (microphone) and playback (TTS response).
 */
export function useAudio({ sendBinary, sendJSON, setOnAudio, setAppStatus }) {
    const [audioLevel, setAudioLevel] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const analyserRef = useRef(null);
    const animFrameRef = useRef(null);
    const audioContextRef = useRef(null);

    /** Get or create the AudioContext (lazily). */
    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    }, []);

    /** Start capturing audio from the microphone. */
    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000,
                },
            });
            streamRef.current = stream;

            // Set up audio analyser for level visualization
            const ctx = getAudioContext();
            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            // Start level monitoring
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateLevel = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
                setAudioLevel(avg / 255);
                animFrameRef.current = requestAnimationFrame(updateLevel);
            };
            updateLevel();

            // Create MediaRecorder with webm/opus codec
            const recorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus',
            });

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    event.data.arrayBuffer().then((buffer) => {
                        sendBinary(buffer);
                    });
                }
            };

            // Request data every 250ms for near-real-time streaming
            recorder.start(250);
            mediaRecorderRef.current = recorder;
            setIsRecording(true);

            // Tell backend we started recording
            sendJSON({ type: 'start_recording' });
        } catch (err) {
            console.error('Failed to start recording:', err);
            throw err;
        }
    }, [sendBinary, sendJSON, getAudioContext]);

    /** Stop recording and signal backend to process. */
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;

        // Stop analyser animation
        if (animFrameRef.current) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        analyserRef.current = null;
        setAudioLevel(0);

        // Stop all mic tracks
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }

        setIsRecording(false);

        // Tell backend recording is done
        sendJSON({ type: 'stop_recording' });
    }, [sendJSON]);

    /** Play received TTS audio (MP3 ArrayBuffer). */
    const playAudio = useCallback((audioData) => {
        const ctx = getAudioContext();

        ctx.decodeAudioData(audioData.slice(0)).then((audioBuffer) => {
            const source = ctx.createBufferSource();

            // Create analyser for playback level
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyser.connect(ctx.destination);

            analyserRef.current = analyser;
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateLevel = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
                setAudioLevel(avg / 255);
                animFrameRef.current = requestAnimationFrame(updateLevel);
            };
            updateLevel();

            source.buffer = audioBuffer;
            source.onended = () => {
                if (animFrameRef.current) {
                    cancelAnimationFrame(animFrameRef.current);
                    animFrameRef.current = null;
                }
                analyserRef.current = null;
                setAudioLevel(0);
                setAppStatus('idle');
            };
            source.start(0);
        }).catch((err) => {
            console.error('Failed to decode audio:', err);
            setAppStatus('idle');
        });
    }, [getAudioContext, setAppStatus]);

    // Register the audio callback when the hook mounts
    useEffect(() => {
        setOnAudio((audioData) => {
            playAudio(audioData);
        });
    }, [setOnAudio, playAudio]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };
    }, []);

    return {
        audioLevel,
        isRecording,
        startRecording,
        stopRecording,
    };
}

export default useAudio;
