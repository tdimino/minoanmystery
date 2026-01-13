/**
 * useActions - Hook for soul actions (speak, log, dispatch, scheduleEvent)
 *
 * Provides the dispatch layer for soul interactions with the UI.
 */

import type { SoulActions, DispatchAction, ScheduledEvent } from '../core/types';
import { isAsyncIterable } from '../core/utils';

// Global action handlers (set during initialization)
type ActionHandlers = {
  onSpeak?: (content: string | AsyncIterable<string>) => void;
  onLog?: (message: string, data?: unknown) => void;
  onDispatch?: (action: DispatchAction) => void;
  onScheduleEvent?: (event: ScheduledEvent) => void;
};

const globalHandlers: ActionHandlers = {};

/**
 * Register action handlers (called during soul initialization)
 */
export function registerActionHandlers(handlers: ActionHandlers): void {
  Object.assign(globalHandlers, handlers);
}

/**
 * useActions - Get soul action functions
 *
 * @param sessionId - Current session identifier
 * @returns Object with speak, log, dispatch, scheduleEvent functions
 *
 * @example
 * const { speak, log, dispatch } = useActions(sessionId);
 * speak("Hello, welcome back!"); // or speak(streamingResponse)
 * dispatch({ type: 'toast', payload: { message: 'Hello!' } });
 */
export function useActions(sessionId: string): SoulActions {
  return {
    /**
     * Speak to the user (supports streaming)
     */
    speak: (content: string | AsyncIterable<string>) => {
      if (globalHandlers.onSpeak) {
        globalHandlers.onSpeak(content);
      } else {
        // Default: log to console
        if (isAsyncIterable(content)) {
          (async () => {
            let full = '';
            for await (const chunk of content) {
              full += chunk;
            }
            console.log(`[${sessionId}] Soul speaks:`, full);
          })();
        } else {
          console.log(`[${sessionId}] Soul speaks:`, content);
        }
      }
    },

    /**
     * Log internal events (for debugging)
     */
    log: (message: string, data?: unknown) => {
      if (globalHandlers.onLog) {
        globalHandlers.onLog(message, data);
      } else {
        console.log(`[${sessionId}] Soul log:`, message, data ?? '');
      }
    },

    /**
     * Dispatch UI actions (toasts, highlights, animations)
     */
    dispatch: (action: DispatchAction) => {
      if (globalHandlers.onDispatch) {
        globalHandlers.onDispatch(action);
      } else {
        console.log(`[${sessionId}] Soul dispatch:`, action);
      }
    },

    /**
     * Schedule a future event
     */
    scheduleEvent: (event: ScheduledEvent) => {
      if (globalHandlers.onScheduleEvent) {
        globalHandlers.onScheduleEvent(event);
      } else {
        // Default: use setTimeout
        setTimeout(() => {
          console.log(`[${sessionId}] Scheduled event fired:`, event.type, event.payload);
        }, event.delayMs);
      }
    },
  };
}

export default useActions;
