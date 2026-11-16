import {handleRequest} from '@/server/admin/route-adapter.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export function GET(request:Request){return handleRequest(request) as Promise<Response>;}
export function POST(request:Request){return handleRequest(request) as Promise<Response>;}
export function HEAD(request:Request){return handleRequest(request) as Promise<Response>;}
