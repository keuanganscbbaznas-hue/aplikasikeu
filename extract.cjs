const fs = require('fs');
const html = fs.readFileSync('sheet.html', 'utf8');

// The sheet names are usually right next to their IDs in the javascript payload at the end.
const matches = [...html.matchAll(/"([^"]+)",(?:\\d+,\\d+,)?(?:true|false|null),(?:true|false|null),(?:true|false|null),(?:true|false|null),/g)];
console.log(matches.map(m => m[1]));

// Or look for gridIds
const matches2 = [...html.matchAll(/\\[(\\d+),null,/g)];
console.log(matches2.map(m => m[1]));
