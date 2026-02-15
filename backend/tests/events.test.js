const request = require('supertest');
const app = require('../src/app');

async function signupAndLoginOrganizer() {
  await request(app).post('/api/auth/signup').send({
    name: 'Org',
    email: 'org@example.com',
    password: 'password123',
    department: 'Computer Science',
    role: 'organizer',
  });

  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'org@example.com',
    password: 'password123',
  });

  return loginRes.body.data.token;
}

describe('Events', () => {
  test('create event and paginate/search', async () => {
    const token = await signupAndLoginOrganizer();

    // Create multiple events
    for (let i = 1; i <= 15; i++) {
      const createRes = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: `Workshop ${i}`,
          description: `Description for workshop ${i} - hands-on learning`,
          eventType: 'public',
          department: 'Computer Science',
          seatLimit: 50,
          date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
          time: '10:00',
          venue: 'Main Hall',
          enableCertificates: false,
        });

      expect(createRes.status).toBe(201);
    }

    const page1 = await request(app)
      .get('/api/events?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);

    expect(page1.status).toBe(200);
    expect(page1.body.success).toBe(true);
    expect(page1.body.data.events.length).toBe(10);
    expect(page1.body.total).toBe(15);
    expect(page1.body.totalPages).toBe(2);

    const page2 = await request(app)
      .get('/api/events?page=2&limit=10')
      .set('Authorization', `Bearer ${token}`);

    expect(page2.status).toBe(200);
    expect(page2.body.data.events.length).toBe(5);

    const searchRes = await request(app)
      .get('/api/events?search=Workshop%201&page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.events.length).toBeGreaterThan(0);
  });
});
