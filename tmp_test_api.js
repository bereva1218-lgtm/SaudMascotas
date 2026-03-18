(async () => {
  const loginRes = await fetch('http://localhost:4000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@example.com', password: 'password' }),
  });
  const login = await loginRes.json();
  console.log('token', login.token?.slice(0, 10) + '...');

  const petRes = await fetch('http://localhost:4000/pets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + login.token },
    body: JSON.stringify({ name: 'APItest', breed: 'test', age: 2, weight: 4, avatar: '/dog-avatar-1.webp', status: 'stable' }),
  });
  console.log('pets', petRes.status, await petRes.text());

  const logRes = await fetch('http://localhost:4000/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + login.token },
    body: JSON.stringify({ petId: 1, date: new Date().toISOString().split('T')[0], appetite: 3, energy: 3, mood: 3, waterIntake: 3, sleep: 3, mobility: 3, notes: 'test', images: ['/placeholder.svg'] }),
  });
  console.log('logs', logRes.status, await logRes.text());
})();
