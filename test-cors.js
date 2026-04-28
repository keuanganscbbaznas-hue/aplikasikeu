fetch(process.env.URL).then(r => {
  console.log('CORS:', r.headers.get('access-control-allow-origin'));
})
