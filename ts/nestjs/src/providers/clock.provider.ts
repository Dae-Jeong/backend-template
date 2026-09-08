import { CLOCK } from '../contracts/clock.contract.js';
export const clockProvider = { provide: CLOCK, useValue: () => new Date() };
