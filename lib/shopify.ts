import '@shopify/shopify-api/adapters/node';
import { shopifyApi } from '@shopify/shopify-api';

export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES!.split(','),
  hostName: new URL(process.env.APP_URL!).hostname,
  apiVersion: '2024-01',
  isEmbeddedApp: false,
});
