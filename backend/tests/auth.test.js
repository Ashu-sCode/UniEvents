const request = require('supertest');

jest.mock('../src/services/emailService', () => ({
  sendPasswordResetEmail: jest.fn(),
}));

const { sendPasswordResetEmail } = require('../src/services/emailService');

// NOTE: require app after env is set by tests/setup.js
const app = require('../src/app');

describe('Auth', () => {
  test('register and login', async () => {
    const signupRes = await request(app).post('/api/auth/signup').send({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'password123',
      rollNumber: '2024CSE001',
      department: 'Computer Science',
      role: 'student',
    });

    expect(signupRes.status).toBe(201);
    expect(signupRes.body.success).toBe(true);
    expect(signupRes.body.data.user.email).toBe('alice@example.com');

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'alice@example.com',
      password: 'password123',
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.token).toBeTruthy();
  });

  test('forgot password sends link (generic response) and reset works', async () => {
    await request(app).post('/api/auth/signup').send({
      name: 'Bob',
      email: 'bob@example.com',
      password: 'password123',
      rollNumber: '2024CSE002',
      department: 'Computer Science',
      role: 'student',
    });

    const forgotRes = await request(app).post('/api/auth/forgot-password').send({
      email: 'bob@example.com',
    });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.success).toBe(true);
    expect(forgotRes.body.message).toMatch(/reset link/i);

    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const call = sendPasswordResetEmail.mock.calls[0][0];
    expect(call.to).toBe('bob@example.com');
    expect(call.resetUrl).toContain('/reset-password?token=');

    const token = call.resetUrl.split('token=')[1];
    expect(token).toBeTruthy();

    const resetRes = await request(app)
      .post(`/api/auth/reset-password/${token}`)
      .send({ password: 'newpass123' });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'bob@example.com',
      password: 'newpass123',
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
  });
});
