import { env } from './env';

function getCache() {
  return env.CACHE.getByName('shared');
}

export const cache = {
  addToSet(key: string, value: string) {
    return getCache().addToSet(key, value);
  },
  get<T>(key: string) {
    return getCache().get<T>(key);
  },
  removeFromSet(key: string, value: string) {
    return getCache().removeFromSet(key, value);
  },
  set(key: string, value: unknown) {
    return getCache().set(key, value);
  },
};
