export class DatabaseBusy extends Error {}
export class DatabasePoolTimeout extends Error {}
export class DatabaseDisabled extends Error {}
export class DatabaseWorkerFailed extends Error {}

export function isDatabaseBusy(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 8 && current instanceof Error; depth++) {
    if (
      'code' in current &&
      typeof current.code === 'string' &&
      /^(SQLITE_BUSY|SQLITE_LOCKED)(_|$)/.test(current.code)
    )
      return true;
    current = current.cause;
  }
  return false;
}
