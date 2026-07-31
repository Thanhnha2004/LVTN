const express = require('express');
const request = require('supertest');
const pool = require('../db');
const propertyRouter = require('../routes/property');

jest.mock('../db', () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
}));
jest.mock('../cloudinary', () => ({
  cloudinary: { uploader: { destroy: jest.fn().mockResolvedValue() } },
  upload: {
    single: () => (req, res, next) => next(),
    array: () => (req, res, next) => next(),
  },
}));
jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = global.mockUser || { id: 1, role: 'owner' };
  next();
});

function app() {
  const app = express();
  app.use(express.json());
  app.use('/api/property', propertyRouter);
  return app;
}

describe('property-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.mockUser = { id: 1, role: 'owner' };
    process.env.VNPAY_TMN_CODE = 'TESTCODE';
    process.env.VNPAY_HASH_SECRET = 'TESTSECRET';
    process.env.VNPAY_PAYMENT_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    process.env.VNPAY_RETURN_URL = 'http://localhost:5173/payment/vnpay-return';
  });

  test('owner creates property in pending status and writes status history', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 20 }])
      .mockResolvedValueOnce([{}]);

    const res = await request(app()).post('/api/property').send({
      title: 'Can ho cao cap Quan 1',
      description: 'Can ho cao cap day du noi that, vi tri trung tam Quan 1',
      type: 'apartment',
      transaction_type: 'sale',
      price: 3000000000,
      area: 70,
      address: 'Nguyen Hue',
      district: 'Quan 1',
      city: 'TP.HCM',
      bedrooms: 2,
      bathrooms: 2,
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(20);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO properties'), expect.any(Array));
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO property_status_history'), [20, null, 'pending', 1, expect.any(String)]);
  });

  test('owner cannot create a duplicate active property', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 20, status: 'pending' }]]);

    const res = await request(app()).post('/api/property').send({
      title: 'Can ho cao cap Quan 1',
      description: 'Can ho cao cap day du noi that, vi tri trung tam Quan 1',
      type: 'apartment',
      transaction_type: 'sale',
      price: 3000000000,
      area: 70,
      address: 'Nguyen Hue',
      district: 'Quan 1',
      city: 'TP.HCM',
      bedrooms: 2,
      bathrooms: 2,
    });

    expect(res.status).toBe(409);
    expect(res.body.existing_id).toBe(20);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test('duplicate check ignores location encoding differences', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 21, status: 'pending' }]]);

    const res = await request(app()).post('/api/property').send({
      title: 'Can ho cao cap Quan 1',
      description: 'Can ho cao cap day du noi that, vi tri trung tam Quan 1',
      type: 'apartment',
      transaction_type: 'sale',
      price: 3200000000,
      area: 72,
      address: 'Nguyen Hue',
      ward: 'Ben Nghe',
      district: 'Quan Mot',
      city: 'Ho Chi Minh',
      bedrooms: 2,
      bathrooms: 2,
    });

    expect(res.status).toBe(409);
    expect(res.body.existing_id).toBe(21);
    expect(pool.query.mock.calls[0][1]).toEqual([
      1,
      'Can ho cao cap Quan 1',
      'Nguyen Hue',
      'apartment',
      'sale',
    ]);
  });

  test('admin must provide rejection reason when rejecting property', async () => {
    global.mockUser = { id: 99, role: 'admin' };

    const res = await request(app()).patch('/api/property/20/status').send({ status: 'rejected' });

    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('admin approves property and writes status history', async () => {
    global.mockUser = { id: 99, role: 'admin' };
    pool.query
      .mockResolvedValueOnce([[{ id: 20, owner_id: 1, title: 'Can ho', status: 'pending' }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    const res = await request(app()).patch('/api/property/20/status').send({ status: 'approved' });

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE properties'), ['approved', null, 'approved', 'approved', 'approved', '20']);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO property_status_history'), ['20', 'pending', 'approved', 99, expect.any(String)]);
  });

  test('owner can hide approved own property', async () => {
    pool.query
      .mockResolvedValueOnce([[{ owner_id: 1, status: 'approved' }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    const res = await request(app()).patch('/api/property/20/hide').send();

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith("UPDATE properties SET status = 'hidden', hidden_at = NOW() WHERE id = ?", ['20']);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO property_status_history'), ['20', 'approved', 'hidden', 1, expect.any(String)]);
  });

  test('owner can view active featured packages', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1, name: 'G?i n?i b?t 7 ng?y', price: 99000 }]]);

    const res = await request(app()).get('/api/property/featured-packages');

    expect(res.status).toBe(200);
    expect(res.body[0].name).toContain('G?i n?i b?t');
  });
test('owner can list own properties by status', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 20, title: 'Can ho', status: 'pending' }]])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    const res = await request(app()).get('/api/property/owner/list?status=pending&page=1&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(1);
    expect(pool.query.mock.calls[0][1]).toEqual([1, 'pending', 10, 0]);
  });

  test('owner can view property status history', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 20, owner_id: 1 }]])
      .mockResolvedValueOnce([[{ id: 1, old_status: 'pending', new_status: 'approved' }]]);

    const res = await request(app()).get('/api/property/20/history');

    expect(res.status).toBe(200);
    expect(res.body[0].new_status).toBe('approved');
  });

  test('owner can mark approved property as sold', async () => {
    pool.query
      .mockResolvedValueOnce([[{ owner_id: 1, status: 'approved' }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    const res = await request(app()).patch('/api/property/20/sold').send();

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith("UPDATE properties SET status = 'sold', sold_at = NOW() WHERE id = ?", ['20']);
  });

  test('owner can resubmit hidden property for approval', async () => {
    pool.query
      .mockResolvedValueOnce([[{ owner_id: 1, status: 'hidden' }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    const res = await request(app()).patch('/api/property/20/unhide').send();

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith("UPDATE properties SET status = 'pending', reject_reason = NULL, hidden_at = NULL WHERE id = ? AND status = 'hidden'", ['20']);
  });

  test('owner can create featured order for approved own property', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 20, owner_id: 1, title: 'Can ho', status: 'approved' }]])
      .mockResolvedValueOnce([[{ id: 2, name: 'Goi 7 ngay', price: 99000, duration_days: 7 }]])
      .mockResolvedValueOnce([{ insertId: 100 }]);

    const res = await request(app()).post('/api/property/20/featured-orders').send({ package_id: 2, payment_method: 'vnpay' });

    expect(res.status).toBe(201);
    expect(res.body.order.id).toBe(100);
    expect(res.body.payment_url).toContain('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO featured_orders'), [20, 1, 2, 99000, 'vnpay', expect.any(String)]);
  });

});
