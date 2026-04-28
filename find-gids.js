fetch('https://docs.google.com/spreadsheets/d/1i5cIa8XjrvwF57C8ntrH5fDpgLyppguw3K1sI1VKjXU/edit').then(r=>r.text()).then(html => {
  const matches = [...html.matchAll(/,"([^"]+)",\\d+,\\d+,\\d+,\\d+,\\d+,\\d+,\\d+,\\d+,\\d+,\\d+,(\\d+),/g)];
  matches.forEach(m => console.log('Found:', m[1], m[2]));
});
