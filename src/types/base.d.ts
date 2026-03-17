import { ApplicationCommandDataResolvable, ApplicationCommandOption } from "discord.js";

type EventRuntimeCleanup = (() => void | Promise<void>) | NodeJS.Timeout | number | undefined;

interface EventModule {
    name: string;
    once?: boolean;
    execute(...args: any[]): void | Promise<void> | EventRuntimeCleanup | Promise<EventRuntimeCleanup>;
    cleanup?: () => void | Promise<void>;
}

interface CommandModule {
    data: { name: string, enable: boolean, guildOnly?: boolean, applicationCommandData?: ApplicationCommandDataResolvable };
    execute: (...args: any[]) => void | Promise<void>;
    cleanup?: () => void | Promise<void>;
}

interface HelperModule {
    setUp: (client: BotClient) => void | Promise<void>;
    cleanup?: () => void | Promise<void>;
}