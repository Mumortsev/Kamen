import nextEnv from '@next/env';import{getStore}from'../server/admin/store.mjs';
nextEnv.loadEnvConfig(process.cwd());const store=await getStore();if(store.initialize)await store.initialize();const catalog=await store.published();console.log(`Каталог подготовлен: ${catalog.products.length} товаров, ${catalog.categories.length} категорий. Существующие данные не перезаписаны.`);await store.close();
