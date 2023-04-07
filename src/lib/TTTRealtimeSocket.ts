
import msgpack from 'msgpack5';

class TTTRealtimeSocket {
  websocket: WebSocket;
  url: string;
  msgPack;

  onCreate: (id: number) => void;
  onUpdate: (id: number, position: number, newPlayer: number) => void;
  onEnd: (id: number, winner: number, winningLine: Array<number>) => void;
  onConnections: (connections: number) => void;
  onDisconnected: () => void;
  onConnected: () => void;
  
  private reconnectBackoff = 500;
  private reconnectBackoffMax = 10000;
  private reconnectDelay = 0;
  private reconnectTimerId: number;
  private disconnectRequested = false;

  constructor(url: string, onCreate, onUpdate, onEnd, onConnections) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    this.msgPack = msgpack();
    this.url = url;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.onCreate = onCreate;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.onUpdate = onUpdate;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.onEnd = onEnd;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.onConnections = onConnections;
  }

  private setEventHandlers() {
    this.websocket.onmessage = this.handleMessage;
    this.websocket.onopen = () => {
      this.reconnectDelay = 0;
      clearInterval(this.reconnectTimerId);
      this.onConnected();
    };
    this.websocket.onclose = (ev) => {
      this.onDisconnected();

      if (!this.disconnectRequested) {
        console.log(`[REALTIME] Connection closed without being requested [code: ${ ev.code } reason: ${ ev.reason }] reconnecting...`);
        this.disconnectRequested = false;
        this.connect();
      }
    }
    this.websocket.onerror = (err) => {
      console.error(err);
    }
  }

  private handleMessage = async (ev: MessageEvent) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const arrayBuffer = await ev.data.arrayBuffer();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const decodedData: Map<number, number | object> = this.msgPack.decode(new Uint8Array(arrayBuffer));

    if (typeof decodedData === 'number') {
      this.onCreate(decodedData);
    } else {
      // End events will have data[2] as an object, representing the winningLine. 
      if (typeof decodedData[2] === 'object') {
        this.onEnd(decodedData[0] as number, decodedData[1] as number, decodedData[2] as Array<number>);
      } else {
        if (decodedData[0] === -1) {
          this.onConnections(decodedData[1] as number);
          return;
        }

        this.onUpdate(decodedData[0] as number, decodedData[1] as number, decodedData[2] as number);
      }
    }
  };

  connect() {
    console.log(`[REALTIME] Connecting...`);
    this.reconnectDelay = this.reconnectDelay < this.reconnectBackoffMax ? this.reconnectDelay + this.reconnectBackoff : this.reconnectBackoffMax;

    // Don't open a connection if it's already open. Ready state 3 is closed (not re-openable)
    if (this.websocket && this.websocket?.readyState !== 3) {
      console.log(`[SOCKET] Attempted to reconnect to an already open socket ${this.websocket.readyState}`);
      return;
    }

    const url = new URL(this.url);
    this.websocket = new WebSocket(url.href);

    this.setEventHandlers();
  }

  disconnect() {
    this.disconnectRequested = true;
    this.websocket.close();
  }
}

export default TTTRealtimeSocket;