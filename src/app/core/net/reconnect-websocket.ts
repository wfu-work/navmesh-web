import { Observable, Subject } from 'rxjs';

export interface ReconnectWebSocketOptions<T> {
  url: () => string;
  parse?: (data: string) => T;
  reconnectDelay?: number;
}

export class ReconnectWebSocket<T = unknown> {
  private readonly messages = new Subject<T>();
  private socket?: WebSocket;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private connectedUrl = '';
  private manuallyClosed = false;

  readonly messages$: Observable<T> = this.messages.asObservable();

  constructor(private readonly options: ReconnectWebSocketOptions<T>) {}

  connect(): void {
    const url = this.options.url();
    if (!url) {
      this.disconnect();
      return;
    }
    if (
      this.socket &&
      this.connectedUrl === url &&
      (this.socket.readyState === WebSocket.CONNECTING ||
        this.socket.readyState === WebSocket.OPEN)
    ) {
      return;
    }
    this.disconnect();
    this.manuallyClosed = false;
    this.connectedUrl = url;
    this.socket = new WebSocket(url);
    this.socket.onmessage = (event) => this.handleMessage(event);
    this.socket.onclose = () => this.scheduleReconnect(url);
    this.socket.onerror = () => this.socket?.close();
  }

  disconnect(): void {
    this.manuallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.close();
      this.socket = undefined;
    }
    this.connectedUrl = '';
  }

  private handleMessage(event: MessageEvent<string>): void {
    try {
      const data = this.options.parse ? this.options.parse(event.data) : (event.data as T);
      this.messages.next(data);
    } catch {
      // Ignore malformed frames and keep the stream alive.
    }
  }

  private scheduleReconnect(url: string): void {
    this.socket = undefined;
    if (this.manuallyClosed || url !== this.options.url()) return;
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, this.options.reconnectDelay ?? 3000);
  }
}
