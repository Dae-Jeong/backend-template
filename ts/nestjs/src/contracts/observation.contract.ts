export type HttpCompletion = 'complete' | 'disconnected';
export type HttpExecution = 'returned' | 'error';
export type HttpResult = Readonly<{
  method: string;
  route: string;
  status: number | null;
  completion: HttpCompletion;
  execution: HttpExecution;
  seconds: number;
}>;
export type TransactionOutcome = 'committed' | 'rolled_back' | 'failed';
