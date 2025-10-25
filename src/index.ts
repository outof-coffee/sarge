import { config as loadEnv } from 'dotenv';
import { Bot } from './bot.js';

async function main() {
  loadEnv();
  const bot = new Bot();
  await bot.initialize();
}

main().catch(console.error);
