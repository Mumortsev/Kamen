import {handleRequest} from '@/server/admin/route-adapter.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export function GET(request:Request){return handleRequest(request) as Promise<Response>;}
