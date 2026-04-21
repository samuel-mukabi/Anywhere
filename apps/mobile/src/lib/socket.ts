import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

class SocketManager {
  public socket: Socket | null = null;
  private isConnecting = false;

  connect() {
    if (this.socket?.connected || this.isConnecting) return;
    
    const token = useAuthStore.getState().token;
    if (!token) return;

    this.isConnecting = true;
    
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: false,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected');
      this.isConnecting = false;
    });

    this.socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      this.isConnecting = false;
    });

    this.socket.connect();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const socketManager = new SocketManager();
