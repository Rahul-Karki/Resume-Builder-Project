import { EventEmitter } from "events";

// Centralized in-process emitter for job events. Other modules import this
// and emit/listen without creating circular dependencies.
export const jobEvents = new EventEmitter();

// Increase listener limit to avoid max listener warnings in heavy setups
jobEvents.setMaxListeners(1000);

export default jobEvents;
