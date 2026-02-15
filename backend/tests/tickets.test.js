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

async function signupAndLoginStudent(email, rollNumber) {
  await request(app).post('/api/auth/signup').send({
    name: 'Student',
    email,
    password: 'password123',
    rollNumber,
    department: 'Computer Science',
    role: 'student',
  });

  const loginRes = await request(app).post('/api/auth/login').send({
    email,
    password: 'password123',
  });

  return loginRes.body.data.token;
}

describe('Tickets', () => {
  test('seat limit enforcement', async () => {
    const organizerToken = await signupAndLoginOrganizer();

    const createRes = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: 'Limited Event',
        description: 'Limited seats',
        eventType: 'public',
        department: 'Computer Science',
        seatLimit: 1,
        date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        time: '10:00',
        venue: 'Hall',
        enableCertificates: false,
      });

    const eventId = createRes.body.data.event._id;

    // Publish event (required for registration)
    await request(app)
      .put(`/api/events/${eventId}`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ status: 'published' });

    const student1Token = await signupAndLoginStudent('s1@example.com', '2024CSE001');
    const student2Token = await signupAndLoginStudent('s2@example.com', '2024CSE002');

    const reg1 = await request(app)
      .post(`/api/tickets/register/${eventId}`)
      .set('Authorization', `Bearer ${student1Token}`);

    expect(reg1.status).toBe(201);

    const reg2 = await request(app)
      .post(`/api/tickets/register/${eventId}`)
      .set('Authorization', `Bearer ${student2Token}`);

    expect(reg2.status).toBe(400);
    expect(reg2.body.message).toMatch(/No seats available/i);
  });
});
