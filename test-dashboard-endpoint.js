const fetch = require('node-fetch');

async function testDashboardEndpoint() {
  try {
    console.log('Testing dashboard endpoint...');
    
    // Test the dashboard stats API endpoint
    const response = await fetch('http://localhost:3000/api/dashboard/stats', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.text();
    console.log('Response body:', data);
    
    if (response.status === 401) {
      console.log('\n✓ Expected 401 Unauthorized (no session)');
      console.log('This confirms the API is working and properly checking authentication.');
    } else if (response.status === 200) {
      console.log('\n✓ API returned 200 OK');
      try {
        const jsonData = JSON.parse(data);
        console.log('Parsed response:', jsonData);
      } catch (e) {
        console.log('Response is not JSON:', data);
      }
    } else {
      console.log('\n✗ Unexpected status code:', response.status);
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('✗ Server is not running on localhost:3000');
    } else {
      console.error('Test error:', error);
    }
  }
}

// Wait a moment for server to be ready
setTimeout(testDashboardEndpoint, 2000);