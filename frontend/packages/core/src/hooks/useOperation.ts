import { useState, useEffect } from 'react';
import { useSocket } from '../api/socket-provider';
import { GenerationState } from '../types/domain';

export interface UseOperationResult {
  progress: number;
  status: GenerationState;
  error: string | null;
  result?: string;
}

export function useOperation(operationId: string | null): UseOperationResult {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<GenerationState>(GenerationState.STATE_PENDING);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | undefined>(undefined);

  const { socket } = useSocket();

  useEffect(() => {
    if (!operationId || !socket) {
      return;
    }

    // Reset state when switching operations
    setProgress(0);
    setStatus(GenerationState.STATE_PENDING);
    setError(null);
    setResult(undefined);

    // socket.subscribe handles sending the SUBSCRIBE action internally
    const unsubscribe = socket.subscribe(operationId, (payload) => {
      setProgress(payload.progress_percent);
      setStatus(payload.state);

      if (payload.state === GenerationState.STATE_FAILED) {
        if ('error' in payload && payload.error) {
          setError(payload.error.message);
        } else {
          setError('Operation failed with unknown error');
        }
      } else if (payload.state === GenerationState.STATE_SUCCEEDED) {
        if ('result_resource_name' in payload) {
          setResult(payload.result_resource_name);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [operationId, socket]);

  return { progress, status, error, result };
}
