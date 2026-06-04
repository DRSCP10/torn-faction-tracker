import { rebuildIndex } from '../lib/index-store.js';

const index = rebuildIndex();
console.log(
  `Index rebuilt: ${index.dayCount} days, ${index.alltime.length} members`
);
