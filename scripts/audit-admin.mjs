// Compatibility entry point; the current flow has no separate publication step.
import {readFile}from'node:fs/promises';
if(!process.env.OWNER_TEST_PASSWORD){const config=JSON.parse(await readFile('/tmp/kamen-admin-test-config.json','utf8'));process.env.OWNER_TEST_PASSWORD=config.password;process.env.OWNER_TEST_USER='test-owner';}
process.env.OWNER_TEST_URL=process.env.ADMIN_TEST_URL||'http://127.0.0.1:8777';
await import('./audit-owner-flow.mjs');
