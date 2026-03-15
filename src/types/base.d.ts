type EventRuntimeCleanup = (() => void | Promise<void>) | NodeJS.Timeout | number | undefined;

interface EventModule {
    name: string;
    once?: boolean;
    execute(...args: any[]): void | Promise<void> | EventRuntimeCleanup | Promise<EventRuntimeCleanup>;
    cleanup?: () => void | Promise<void>;
}

interface CommandModule {
    data: { name: string };
    execute: (...args: any[]) => void | Promise<void>;
    cleanup?: () => void | Promise<void>;
}