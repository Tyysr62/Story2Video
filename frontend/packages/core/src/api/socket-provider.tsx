import React, { createContext, useContext, ReactNode } from 'react';
import { SocketManager } from './socket';

interface SocketContextType {
  socket: SocketManager;
}

const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
  socket: SocketManager;
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ socket, children }) => {
  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
