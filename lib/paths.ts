export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const asset = (file: string) => file.startsWith('https://')?file:file.startsWith('/uploads/')?`${basePath}${file}`:`${basePath}/assets/${file}`;
export const route = (path: string) => `${basePath}${path}`;
