import http from 'http';

http.get('http://localhost:5000/api/work-orders/ee3945a6-1691-4dd7-aec1-9332d337fa36', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      console.log(JSON.stringify(JSON.parse(data), null, 2));
    } catch (e) {
      console.log('Error parsing response:', data);
    }
  });
}).on('error', (err) => {
  console.error('Fetch error:', err.message);
});
