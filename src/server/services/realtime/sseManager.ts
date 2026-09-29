import type { Response } from 'express';

interface SSEClient {
  id: string;
  res: Response;
  connectedAt: Date;
}

export class SSEManager {
  private static instance: SSEManager;
  private clients: Map<string, SSEClient> = new Map();
  private keepAliveTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.keepAliveTimer = setInterval(() => {
      this.sendKeepAlive();
    }, 15000);
  }

  public static getInstance(): SSEManager {
    if (!SSEManager.instance) {
      SSEManager.instance = new SSEManager();
    }
    return SSEManager.instance;
  }

  public addClient(res: Response): string {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: new Date().toISOString() })}\n\n`);

    this.clients.set(clientId, {
      id: clientId,
      res,
      connectedAt: new Date(),
    });

    res.on('close', () => {
      this.clients.delete(clientId);
    });

    return clientId;
  }

  public broadcast(eventType: string, data: any): void {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [id, client] of this.clients.entries()) {
      try {
        client.res.write(payload);
      } catch (err) {
        this.clients.delete(id);
      }
    }
  }

  private sendKeepAlive(): void {
    for (const [id, client] of this.clients.entries()) {
      try {
        client.res.write(': keep-alive\n\n');
      } catch (err) {
        this.clients.delete(id);
      }
    }
  }

  public getConnectionCount(): number {
    return this.clients.size;
  }
}

export const sseManager = SSEManager.getInstance();
