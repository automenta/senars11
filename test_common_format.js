import { formatNumber } from './src/util/common.js';

console.log('1.2345, 2 ->', formatNumber(1.2345, 2));
console.log('null ->', formatNumber(null));
console.log('abc ->', formatNumber('abc'));
