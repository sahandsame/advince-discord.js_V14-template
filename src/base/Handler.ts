import { Collection, Events as DiscordEvents } from "discord.js";
import { readdirSync } from "fs";
import { join } from "path";
import { watch } from "chokidar";
import { createRequire } from "node:module";
import { BotClient } from "@/base/Client";
import { CommandModule, EventModule, HelperModule } from "@/types/base";

// CJS require function that tsx intercepts — gives us require.cache for hot reload
const cjsRequire = createRequire(join(process.cwd(), "src", "helper", "handler.ts"));

export class Handler {
    events: Events;
    commands: Commands;
    helpers: Helper;
    constructor() {
        this.events = new Events();
        this.commands = new Commands();
        this.helpers = new Helper();
    }
    async setUp(client: BotClient): Promise<void> {
        await this.events.setUp(client);
        await this.commands.setUp(client);
        await this.helpers.setUp(client);
    }
}

class Events {
    path: string;
    private listenerRegistry = new Map<string, {
        name: string;
        listener: (...args: any[]) => void;
        moduleCleanup?: () => void | Promise<void>;
        runtimeCleanup?: () => void | Promise<void>;
    }>();

    constructor() {
        this.path = join(process.cwd(), "src", "events");
    }

    private clearModuleCache(filePath: string): void {
        try {
            const resolved = cjsRequire.resolve(filePath);
            if (cjsRequire.cache[resolved]) {
                delete cjsRequire.cache[resolved];
            }
        } catch {
            // Ignore cache clearing failures for files already removed on disk.
        }
    }

    private normalizeCleanup(cleanup: unknown): (() => void | Promise<void>) | undefined {
        if (typeof cleanup === "function") {
            return cleanup as () => void | Promise<void>;
        }

        if (typeof cleanup === "number") {
            return () => clearInterval(cleanup);
        }

        if (cleanup && typeof cleanup === "object") {
            return () => clearInterval(cleanup as NodeJS.Timeout);
        }

        return undefined;
    }

    private async runCleanup(cleanup?: () => void | Promise<void>): Promise<void> {
        if (!cleanup) return;
        await Promise.resolve(cleanup());
    }

    async setUp(client: BotClient): Promise<void> {
        await this.loadAll(client);
        this.watch(client);
    }

    async loadAll(client: BotClient): Promise<void> {
        const files = readdirSync(this.path).filter(file => file.endsWith(".ts") || file.endsWith(".js"));
        for (const file of files) {
            await this.load(client, join(this.path, file));
        }
    }

    async load(client: BotClient, filePath: string): Promise<void> {
        this.clearModuleCache(filePath);
        const mod = cjsRequire(filePath);
        const event: EventModule = mod.default || mod;

        const listener = async (...args: any[]) => {
            const cleanupResult = await Promise.resolve(event.execute(...args, client));
            const entry = this.listenerRegistry.get(filePath);
            if (!entry) return;

            // Replace previous runtime cleanup to avoid accumulating intervals/timers.
            await this.runCleanup(entry.runtimeCleanup);
            entry.runtimeCleanup = this.normalizeCleanup(cleanupResult);
            this.listenerRegistry.set(filePath, entry);
        };

        this.listenerRegistry.set(filePath, {
            name: event.name,
            listener,
            moduleCleanup: event.cleanup
        });

        event.once ? client.once(event.name, listener) : client.on(event.name, listener);

        // ClientReady does not emit again on file edits. Execute immediately when already connected.
        if (event.name === DiscordEvents.ClientReady && client.isReady()) {
            await listener(client);
        }

        console.log(`[events] Loaded: ${filePath}`);
    }

    async unload(client: BotClient, filePath: string): Promise<void> {
        const entry = this.listenerRegistry.get(filePath);
        if (!entry) return;

        client.off(entry.name, entry.listener);
        await this.runCleanup(entry.runtimeCleanup);
        await this.runCleanup(entry.moduleCleanup);
        this.listenerRegistry.delete(filePath);
        this.clearModuleCache(filePath);

        console.log(`[events] Unloaded: ${filePath}`);
    }

    watch(client: BotClient): void {
        const watcher = watch(this.path, { ignoreInitial: true });

        watcher.on("add", async (file) => {
            try {
                await this.load(client, file);
            } catch (error) {
                console.error(`[events] Failed to load ${file}:`, error);
            }
        });

        watcher.on("change", async (file) => {
            try {
                await this.unload(client, file);
                await this.load(client, file);
            } catch (error) {
                console.error(`[events] Failed to reload ${file}:`, error);
            }
        });

        watcher.on("unlink", async (file) => {
            await this.unload(client, file);
        });

        console.log(`[events] Watching ${this.path} for changes`);
    }
}

class Commands {
    path: string;
    readonly collection = new Collection<string, CommandModule>();
    private fileRegistry = new Map<string, {
        name: string;
        moduleCleanup?: () => void | Promise<void>;
    }>();

    constructor() {
        this.path = join(process.cwd(), "src", "commands");
    }

    private clearModuleCache(filePath: string): void {
        try {
            const resolved = cjsRequire.resolve(filePath);
            if (cjsRequire.cache[resolved]) {
                delete cjsRequire.cache[resolved];
            }
        } catch {
            // Ignore cache clearing failures for files already removed on disk.
        }
    }

    private async runCleanup(cleanup?: () => void | Promise<void>): Promise<void> {
        if (!cleanup) return;
        await Promise.resolve(cleanup());
    }

    async setUp(client: BotClient): Promise<void> {
        await this.loadAll(client);
        this.watch(client);
    }

    async loadAll(client: BotClient): Promise<void> {
        const folders = readdirSync(this.path);
        for (const folder of folders) {
            const files = readdirSync(join(this.path, folder)).filter(file => file.endsWith(".ts") || file.endsWith(".js"));
            for (const file of files) {
                await this.load(client, join(this.path, folder, file));
            }
        }
        console.log(`Loaded ${this.collection.size} commands`);
    }

    async load(client: BotClient, filePath: string): Promise<void> {
        if (this.fileRegistry.has(filePath)) {
            await this.unload(client, filePath);
        }

        this.clearModuleCache(filePath);
        const mod = cjsRequire(filePath);
        const command: CommandModule = mod.default || mod;

        this.collection.set(command.data.name, command);
        this.fileRegistry.set(filePath, {
            name: command.data.name,
            moduleCleanup: command.cleanup
        });

        console.log(`[commands] Loaded: ${command.data.name}`);
    }

    async unload(client: BotClient, filePath: string): Promise<void> {
        const entry = this.fileRegistry.get(filePath);
        if (!entry) return;

        this.collection.delete(entry.name);
        await this.runCleanup(entry.moduleCleanup);
        this.fileRegistry.delete(filePath);
        this.clearModuleCache(filePath);

        console.log(`[commands] Unloaded: ${entry.name}`);
    }

    watch(client: BotClient): void {
        const watcher = watch(this.path, { ignoreInitial: true });

        watcher.on("add", async (file) => {
            try {
                await this.load(client, file);
            } catch (error) {
                console.error(`[commands] Failed to load ${file}:`, error);
            }
        });

        watcher.on("change", async (file) => {
            try {
                await this.unload(client, file);
                await this.load(client, file);
            } catch (error) {
                console.error(`[commands] Failed to reload ${file}:`, error);
            }
        });

        watcher.on("unlink", async (file) => {
            await this.unload(client, file);
        });

        console.log(`[commands] Watching ${this.path} for changes`);
    }

    async get(name: string): Promise<CommandModule | undefined> {
        return this.collection.get(name);
    }
}

class Helper {
    path: string;
    // Map to track loaded helpers by file path for cleanup
    private helperRegistry = new Map<string, HelperModule>();

    constructor() {
        this.path = join(process.cwd(), "src", "helpers"); // Adjust path as needed
    }

    private clearModuleCache(filePath: string): void {
        try {
            const resolved = cjsRequire.resolve(filePath);
            if (cjsRequire.cache[resolved]) {
                delete cjsRequire.cache[resolved];
            }
        } catch { /* Ignore */ }
    }

    private async runCleanup(cleanup?: () => void | Promise<void>): Promise<void> {
        if (!cleanup) return;
        await Promise.resolve(cleanup());
    }

    async setUp(client: BotClient): Promise<void> {
        await this.loadAll(client);
        this.watch(client);
    }

    async loadAll(client: BotClient): Promise<void> {
        // Support nested folders similar to Commands
        const files = readdirSync(this.path, { recursive: true }) as string[];
        for (const file of files) {
            if (file.endsWith(".ts") || file.endsWith(".js")) {
                await this.load(client, join(this.path, file));
            }
        }
    }

    async load(client: BotClient, filePath: string): Promise<void> {
        // Prevent duplicates during watch events
        if (this.helperRegistry.has(filePath)) {
            await this.unload(client, filePath);
        }

        this.clearModuleCache(filePath);
        const mod = cjsRequire(filePath);
        const HelperClass = mod.default || mod;

        // Check if the export is a valid constructor/class
        if (typeof HelperClass === 'function') {
            const instance = new HelperClass();
            
            // If helpers have an init/setUp method, call it
            if (typeof instance.setUp === 'function') {
                await instance.setUp(client);
            }

            this.helperRegistry.set(filePath, {
                setUp: instance.setUp.bind(instance),
                cleanup: instance.cleanup ? instance.cleanup.bind(instance) : undefined
            });

            console.log(`[helpers] Loaded: ${filePath}`);
        }
    }

    async unload(client: BotClient, filePath: string): Promise<void> {
        const entry = this.helperRegistry.get(filePath);
        if (!entry) return;

        // Run custom cleanup logic (e.g., closing DB connections, clearing intervals)
        await this.runCleanup(entry.cleanup);
        
        this.helperRegistry.delete(filePath);
        this.clearModuleCache(filePath);

        console.log(`[helpers] Unloaded: ${filePath}`);
    }

    watch(client: BotClient): void {
        const watcher = watch(this.path, { ignoreInitial: true });

        watcher.on("add", (file) => this.load(client, file).catch(console.error));
        watcher.on("change", async (file) => {
            try {
                await this.unload(client, file);
                await this.load(client, file);
            } catch (error) {
                console.error(`[helpers] Failed to reload ${file}:`, error);
            }
        });
        watcher.on("unlink", (file) => this.unload(client, file).catch(console.error));

        console.log(`[helpers] Watching ${this.path} for changes`);
    }
}