/**
 * Low-level WebSocket wrapper with event handling and reconnection.
 */

const DEFAULT_WS_URL = 'ws://localhost:8000/ws';

export class WebSocketService {
  constructor(url = DEFAULT_WS_URL) {
    this.url = url;
    this.ws = null;
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this._intentionalClose = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this._intentionalClose = false;
      this.reconnectAttempts = 0;

      try {
        this.ws = new WebSocket(this.url);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this._emit('open');
          resolve();
        };

        this.ws.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            this._emit('audio', event.data);
          } else {
            try {
              const data = JSON.parse(event.data);
              this._emit('message', data);
            } catch {
              console.warn('Non-JSON text message received:', event.data);
            }
          }
        };

        this.ws.onclose = (event) => {
          this._emit('close', event);
          if (!this._intentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
            this._scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          this._emit('error', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect() {
    this._intentionalClose = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  sendJSON(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  sendBinary(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    }
  }

  get isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  _emit(event, data) {
    const handlers = this.listeners[event] || [];
    handlers.forEach(cb => cb(data));
  }

  _scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this._emit('reconnecting', { attempt: this.reconnectAttempts, delay });

    setTimeout(() => {
      if (!this._intentionalClose) {
        this.connect().catch(() => {});
      }
    }, delay);
  }
}

export default WebSocketService;
