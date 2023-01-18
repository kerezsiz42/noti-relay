export class Relay {
  private static _instance?: Relay;
  private socketToId: Map<WebSocket, string>;
  private idToSockets: Map<string, WebSocket[]>;
  private idToChannel: Map<string, BroadcastChannel>;

  protected constructor() {
    this.socketToId = new Map<WebSocket, string>();
    this.idToSockets = new Map<string, WebSocket[]>();
    this.idToChannel = new Map<string, BroadcastChannel>();
  }

  public static get instance(): Relay {
    return (Relay._instance ??= new Relay());
  }

  public add(id: string, socket: WebSocket): void {
    this.socketToId.set(socket, id);
    const sockets = this.getSocketsById(id);
    if (sockets.length === 0) {
      const channel = new BroadcastChannel(id);
      channel.onmessage = (ev: MessageEvent) => {
        this.sendToSocketsInternally(id, ev.data);
      };
      this.idToChannel.set(id, channel);
    }
    this.idToSockets.set(id, [...sockets, socket]);
  }

  public getIdBySocket(socket: WebSocket): string {
    return this.socketToId.get(socket) || "";
  }

  public getSocketsById(id: string): WebSocket[] {
    return this.idToSockets.get(id) || [];
  }

  public remove(socket: WebSocket): void {
    const id = this.getIdBySocket(socket);
    const sockets = this.getSocketsById(id);
    if (sockets.length > 1) {
      this.idToSockets.set(
        id,
        sockets.filter((s) => s !== socket)
      );
    } else {
      const channel = this.idToChannel.get(id);
      channel?.close();
      this.idToChannel.delete(id);
      this.idToSockets.delete(id);
    }
    this.socketToId.delete(socket);
  }

  private sendToSocketsInternally(id: string, message: string): void {
    const sockets = this.getSocketsById(id);
    for (const socket of sockets) {
      socket.send(message);
    }
  }

  public send(id: string, message: string): void {
    const channel = this.idToChannel.get(id);
    channel?.postMessage(message);
    this.sendToSocketsInternally(id, message);
  }

  public close(): void {
    for (const socket of this.socketToId.keys()) {
      socket.close();
      this.remove(socket);
    }
  }
}
