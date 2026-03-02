import { useCallback } from 'react';
import useWebSocket from './hooks/useWebSocket';
import useAudio from './hooks/useAudio';
import CallButton from './components/CallButton';
import StatusPanel from './components/StatusPanel';
import AudioVisualizer from './components/AudioVisualizer';
import './App.css';

function App() {
  const {
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
  } = useWebSocket();

  const { audioLevel, startRecording, stopRecording } = useAudio({
    sendBinary,
    sendJSON,
    setOnAudio,
    setAppStatus,
  });

  const handleStartRecording = useCallback(async () => {
    try {
      await startRecording();
    } catch (err) {
      setError('Microphone access denied');
    }
  }, [startRecording, setError]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const isConnected = connectionState === 'connected';

  return (
    <div className="app">
      <div className="app__background" />

      <div className="app__container">
        {/* Header */}
        <header className="app__header">
          <div className="app__logo">
            <span className="app__logo-icon">🔮</span>
            <h1 className="app__title">Anorak</h1>
          </div>
          <p className="app__subtitle">Voice Chat</p>
        </header>

        {/* Main content */}
        <main className="app__main">
          {/* Status panel */}
          <StatusPanel
            connectionState={connectionState}
            appStatus={appStatus}
            lastTranscript={lastTranscript}
            lastResponse={lastResponse}
            error={error}
            onDisconnect={disconnect}
          />

          {/* Audio visualizer */}
          {isConnected && (
            <AudioVisualizer audioLevel={audioLevel} status={appStatus} />
          )}

          {/* Call / PTT button */}
          <div className="app__controls">
            <CallButton
              connectionState={connectionState}
              appStatus={appStatus}
              onConnect={connect}
              onDisconnect={disconnect}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
            />
          </div>
        </main>

        {/* Footer */}
        <footer className="app__footer">
          <span>Powered by OpenClaw + ElevenLabs</span>
        </footer>
      </div>
    </div>
  );
}

export default App;
