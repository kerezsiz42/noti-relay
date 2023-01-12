export class Relay {
  private static _instance?: Relay;
  private socketToPublicKey: Map<WebSocket, string>;
  private publicKeyToSockets: Map<string, WebSocket[]>;
  private publicKeyToChannel: Map<string, BroadcastChannel>;

  protected constructor() {
    this.socketToPublicKey = new Map<WebSocket, string>();
    this.publicKeyToSockets = new Map<string, WebSocket[]>();
    this.publicKeyToChannel = new Map<string, BroadcastChannel>();
  }

  public static get instance(): Relay {
    return (Relay._instance ??= new Relay());
  }

  public add(publicKey: string, socket: WebSocket): void {
    this.socketToPublicKey.set(socket, publicKey);
    const sockets = this.getSocketsByPublicKey(publicKey);
    if (sockets.length === 0) {
      const channel = new BroadcastChannel(publicKey);
      channel.onmessage = (ev: MessageEvent) => {
        this.sendToSocketsInternally(publicKey, ev.data);
      };
      this.publicKeyToChannel.set(publicKey, channel);
    }
    this.publicKeyToSockets.set(publicKey, [...sockets, socket]);
  }

  public getPublicKeyBySocket(socket: WebSocket): string {
    return this.socketToPublicKey.get(socket) || "";
  }

  public getSocketsByPublicKey(publicKey: string): WebSocket[] {
    return this.publicKeyToSockets.get(publicKey) || [];
  }

  public remove(socket: WebSocket): void {
    const publicKey = this.getPublicKeyBySocket(socket);
    const sockets = this.getSocketsByPublicKey(publicKey);
    if (sockets.length > 1) {
      this.publicKeyToSockets.set(
        publicKey,
        sockets.filter((s) => s !== socket),
      );
    } else {
      const channel = this.publicKeyToChannel.get(publicKey);
      channel?.close();
      this.publicKeyToChannel.delete(publicKey);
      this.publicKeyToSockets.delete(publicKey);
    }
    this.socketToPublicKey.delete(socket);
  }

  private sendToSocketsInternally(publicKey: string, message: string): void {
    const sockets = this.getSocketsByPublicKey(publicKey);
    for (const socket of sockets) {
      socket.send(message);
    }
  }

  public send(publicKey: string, message: string): void {
    const channel = this.publicKeyToChannel.get(publicKey);
    channel?.postMessage(message);
    this.sendToSocketsInternally(publicKey, message);
  }

  public close(): void {
    for (const socket of this.socketToPublicKey.keys()) {
      socket.close();
      this.remove(socket);
    }
  }
}
