const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/dashboard/stats',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:', data);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
  console.error('Error code:', e.code);
  console.error('Error details:', e);
});

req.setTimeout(5000, () => {
  console.log('Request timeout');
  req.destroy();
});

req.end();