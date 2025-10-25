import { Client, Events, ClientEvents } from 'discord.js';

// EventHandler is an interface and type for event handlers to provide meta information and then handling logic
// It must be generic but constrained to a specific event
export interface EventHandler<T extends keyof ClientEvents> {
    event: T;
    handle: (...args: ClientEvents[T]) => Promise<void>;
}

// EventManager is a singleton that helps manage event handlers for the bot
export class EventManager {
    private static instance: EventManager;

    private constructor() {}

    public static getInstance(): EventManager {
        if (!EventManager.instance) {
            EventManager.instance = new EventManager();
        }
        return EventManager.instance;
    }

    // private map of event handlers
    private handlers: Map<string, EventHandler<any>[]> = new Map();

    // register a new event handler
    public registerHandler<T extends keyof ClientEvents>(handler: EventHandler<T>): void {
        const eventHandlers = this.handlers.get(handler.event) || [];
        eventHandlers.push(handler);
        this.handlers.set(handler.event, eventHandlers);
    }

    // attach all registered handlers to the client
    public attachHandlers(client: Client): void {
        this.handlers.forEach((handlers, event) => {
            handlers.forEach((handler) => {
                client.on(event as keyof ClientEvents, (...args: any[]) => {
                    handler.handle(...(args as ClientEvents[keyof ClientEvents]));
                });
            });
        });
    }
} 
