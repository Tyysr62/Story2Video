import React, { createContext, useContext, ReactNode } from 'react';
import { IHttpClient } from './interfaces';

interface ApiContextType {
  client: IHttpClient;
}

const ApiContext = createContext<ApiContextType | null>(null);

interface ApiProviderProps {
  client: IHttpClient;
  children: ReactNode;
}

export const ApiProvider: React.FC<ApiProviderProps> = ({ client, children }) => {
  return (
    <ApiContext.Provider value={{ client }}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = (): IHttpClient => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context.client;
};
