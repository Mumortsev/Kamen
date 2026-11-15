export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const asset = (file: string) => `${basePath}/assets/${file}`;
export const route = (path: string) => `${basePath}${path}`;
