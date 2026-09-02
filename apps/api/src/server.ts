import { loadConfig, loadEnvFiles } from './config';
import { buildApp } from './app';

async function main(): Promise<void> {
    loadEnvFiles();
    const config = loadConfig();
    const app = await buildApp(config);
    await app.listen({ host: config.host, port: config.port });
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
});
