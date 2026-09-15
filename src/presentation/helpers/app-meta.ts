import { APP_VERSION } from '../../version.js';
import { AppMeta } from '../schemas/app-meta.schema.js';

export function withAppMeta<T extends object>(payload: T): T & AppMeta {
  return { ...payload, appVersion: APP_VERSION, timestamp: Date.now() };
}