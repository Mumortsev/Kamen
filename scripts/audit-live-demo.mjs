// Authorized acceptance stand only. The current owner flow cleans up in one run.
import{readFile}from'node:fs/promises';
const access=await readFile('/workspace/Kamen-demo-access.txt','utf8');
process.env.OWNER_TEST_PASSWORD=access.split('Пароль: ')[1]?.split('\n')[0];
process.env.OWNER_TEST_USER=access.split('Логин: ')[1]?.split('\n')[0];
process.env.OWNER_TEST_URL='https://kamen-green.vercel.app';process.argv.push('--live');
await import('./audit-owner-flow.mjs');
