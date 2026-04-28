const html = require('fs').readFileSync('sheet.html', 'utf8');

const regex = /Kas Tunai/gi;
let match;
while ((match = regex.exec(html)) !== null) {
  console.log('Match at', match.index);
  console.log(html.substring(match.index - 50, match.index + 50));
}
