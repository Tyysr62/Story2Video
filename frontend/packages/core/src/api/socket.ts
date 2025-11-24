import { WebSocketMessage, OperationProgressPayload, OperationDonePayload } from '../types/domain';

type MessageCallback = (payload: OperationProgressPayload | OperationDonePayload) => void;

export class SocketManager {
  private socket: WebSocket | null = null;
  private url: string | null = null;
  private token: string | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private subscribers: Map<string, Set<MessageCallback>> = new Map();
  private messageQueue: string[] = [];
  private isConnecting: boolean = false;
  private shouldReconnect: boolean = false;

  constructor() {}

  /**
   * Initialize connection
   * @param baseUrl wss://api.example.com/v1/stream
   * @param token Authentication token
   */
  connect(baseUrl: string, token: string) {
    // If already connected to the same URL, do nothing
    if (this.socket?.readyState === WebSocket.OPEN && this.url === baseUrl) return;

    // If URL changed, disconnect first
    if (this.socket && (this.url !== baseUrl || this.token !== token)) {
      this.disconnect();
    }

    this.url = baseUrl;
    this.token = token;
    this.shouldReconnect = true;
    this.establishConnection();
  }

  disconnect() {
    this.shouldReconnect = false;
    this.stopHeartbeat();
    this.clearReconnectTimeout();

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnecting = false;
  }

  /**
   * Subscribe to a topic (Operation ID or Story ID)
   * Returns an unsubscribe function
   */
  subscribe(topic: string, callback: MessageCallback): () => void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
      // If connected, send subscribe immediately
      this.send({ action: 'SUBSCRIBE', topic });
    }

    this.subscribers.get(topic)!.add(callback);

    return () => {
      const callbacks = this.subscribers.get(topic);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(topic);
          // Optional: Send UNSUBSCRIBE if API supports it
        }
      }
    };
  }

  send(data: any) {
    const message = JSON.stringify(data);
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(message);
    } else {
      this.messageQueue.push(message);
    }
  }

  private establishConnection() {
    if (!this.url || !this.token || this.isConnecting) return;

    this.isConnecting = true;
    // Append token to query string as per requirement
    const wsUrl = `${this.url}?token=${this.token}`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('WebSocket Connected');
        this.isConnecting = false;
        this.startHeartbeat();
        this.flushQueue();
        this.resubscribe();
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.socket.onclose = (event) => {
        console.log('WebSocket Closed', event.code, event.reason);
        this.handleClose();
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        // onclose will usually be called after onerror
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.handleClose();
    }
  }

  private handleClose() {
    this.isConnecting = false;
    this.stopHeartbeat();

    if (this.shouldReconnect) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    this.clearReconnectTimeout();
    // Exponential backoff could be implemented here, but using fixed 3s for now
    this.reconnectTimeout = setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.establishConnection();
    }, 3000);
  }

  private clearReconnectTimeout() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    // Ping every 30s
    this.pingInterval = setInterval(() => {
      this.send({ action: 'PING' });
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private flushQueue() {
    while (this.messageQueue.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
      const msg = this.messageQueue.shift();
      if (msg) {
        this.socket.send(msg);
      }
    }
  }

  private resubscribe() {
    for (const topic of this.subscribers.keys()) {
      this.send({ action: 'SUBSCRIBE', topic });
    }
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);

      // Handle Heartbeat response (Pong)
      if (data.type === 'PONG' || data.action === 'PONG') {
        return;
      }

      // Assume data conforms to WebSocketMessage
      // In a real app, we might want Zod validation here
      const message = data as WebSocketMessage;

      if (message.type === 'OPERATION_PROGRESS' || message.type === 'OPERATION_DONE') {
        const { operation_name } = message.payload;
        const callbacks = this.subscribers.get(operation_name);

        if (callbacks) {
          callbacks.forEach(callback => callback(message.payload));
        }
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }
}
