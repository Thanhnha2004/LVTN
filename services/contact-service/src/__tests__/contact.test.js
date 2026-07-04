const express = require('express');
const request = require('supertest');
const pool = require('../db');
const contactRouter = require('../routes/contact');

jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../mailer', () => ({ sendContactNotification: jest.fn().mockResolvedValue() }));
jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = global.mockUser || { id: 1, role: 'buyer' };
  next();
});

function app() {
  const app = express();
  app.use(express.json());
  app.use('/api/contact', contactRouter);
  return app;
}

describe('contact-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.mockUser = { id: 1, role: 'buyer' };
  });

  test('only buyer can send contact request', async () => {
    global.mockUser = { id: 2, role: 'owner' };

    const res = await request(app()).post('/api/contact').send({ property_id: 1, message: 'Toi muon xem nha' });

    expect(res.status).toBe(403);
  });

  test('buyer sends contact request for approved property', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ owner_email: 'owner@test.com', owner_name: 'Owner', buyer_name: 'Buyer', title: 'Can ho' }]]);

    const res = await request(app()).post('/api/contact').send({ property_id: 1, message: 'Toi can lien he' });

    expect(res.status).toBe(201);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO contacts'), [1, 1, 'Toi can lien he']);
  });

  test('prevents duplicate contact request for same property', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([[{ id: 10 }]]);

    const res = await request(app()).post('/api/contact').send({ property_id: 1, message: 'Toi can lien he' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBeTruthy();
  });

  test('owner can reply only to owned contact', async () => {
    global.mockUser = { id: 7, role: 'owner' };
    pool.query
      .mockResolvedValueOnce([[{ id: 5 }]])
      .mockResolvedValueOnce([{}]);

    const res = await request(app()).patch('/api/contact/5/reply').send({ owner_reply: 'Ban co the lien he so dien thoai nay' });

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith("UPDATE contacts SET owner_reply = ?, status = 'replied' WHERE id = ?", ['Ban co the lien he so dien thoai nay', '5']);
  });

  test('buyer can save approved property', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 1 }]])
      .mockResolvedValueOnce([{}]);

    const res = await request(app()).post('/api/contact/saved').send({ property_id: 1 });

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT IGNORE INTO saved_properties'), [1, 1]);
  });
test('owner can list received contacts with pagination', async () => {
    global.mockUser = { id: 7, role: 'owner' };
    pool.query
      .mockResolvedValueOnce([[{ id: 1, property_title: 'Can ho', buyer_name: 'Buyer' }]])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    const res = await request(app()).get('/api/contact/owner?page=1&limit=10&lead_status=new');

    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(1);
    expect(pool.query.mock.calls[0][1]).toEqual([7, 'new', 10, 0]);
  });

  test('owner updates lead status for owned contact', async () => {
    global.mockUser = { id: 7, role: 'owner' };
    pool.query
      .mockResolvedValueOnce([[{ id: 9 }]])
      .mockResolvedValueOnce([{}]);

    const res = await request(app()).patch('/api/contact/9/lead').send({ lead_status: 'scheduled', owner_note: 'Hen xem nha' });

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith('UPDATE contacts SET lead_status = ?, owner_note = ? WHERE id = ?', ['scheduled', 'Hen xem nha', '9']);
  });

  test('buyer can list sent contacts and owner response information', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 1, property_title: 'Can ho', owner_reply: 'Con hang', owner_phone: '0909' }]])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    const res = await request(app()).get('/api/contact/buyer?page=1&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.data[0].owner_phone).toBe('0909');
  });

  test('buyer can remove saved property', async () => {
    pool.query.mockResolvedValueOnce([{}]);

    const res = await request(app()).delete('/api/contact/saved/3');

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith('DELETE FROM saved_properties WHERE buyer_id = ? AND property_id = ?', [1, '3']);
  });

  test('buyer can list saved properties', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 3, title: 'Nha pho' }]]);

    const res = await request(app()).get('/api/contact/saved');

    expect(res.status).toBe(200);
    expect(res.body[0].title).toBe('Nha pho');
  });

});

