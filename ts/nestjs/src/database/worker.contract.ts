export type QueryRequest = Readonly<{
  id: number;
  sql: string;
  params: unknown[];
  method: 'run' | 'all' | 'get' | 'values' | 'close';
}>;
export type QueryResponse = Readonly<{
  id: number;
  rows: unknown[];
  inTransaction: boolean;
  errorCode?: string;
}>;
