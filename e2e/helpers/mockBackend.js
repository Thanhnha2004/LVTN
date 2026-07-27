const sampleListing = {
  id: 1,
  title: 'Can ho mau Playwright Quan 1',
  type: 'apartment',
  transaction_type: 'sale',
  price: 3500000000,
  area: 72,
  bedrooms: 2,
  bathrooms: 2,
  address: 'Nguyen Hue',
  ward: 'Ben Nghe',
  district: 'Quan 1',
  city: 'TP.HCM',
  latitude: 10.7769,
  longitude: 106.7009,
  direction: 'east',
  legal_status: 'sohong',
  status: 'approved',
  featured_until: '2099-01-01T00:00:00.000Z',
  created_at: '2026-06-25T10:00:00.000Z',
  owner_name: 'Nguyen Van Owner',
  owner_email: 'owner@bds.com',
  owner_phone: '0909123456',
  thumbnail: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80',
  images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80'],
};

const ownerStats = {
  overview: {
    total_properties: 1,
    active_count: 1,
    pending_count: 0,
    rejected_count: 0,
    sold_count: 0,
    hidden_count: 0,
    total_views: 12,
    total_contacts: 2,
    pending_contacts: 1,
    conversion_rate: 16.67,
  },
  top_properties: [sampleListing],
  views_by_day: [],
  top_contacted_properties: [{ ...sampleListing, contact_count: 2 }],
  lead_stats: [{ lead_status: 'new', count: 1 }],
};

const adminStats = {
  users: 3,
  properties: 1,
  pending: 1,
  contacts: 2,
  featured: 1,
};

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function mockBackend(page) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (!path.startsWith('/api/')) {
      await route.continue();
      return;
    }

    if (path === '/api/auth/login' && method === 'POST') {
      const postData = request.postDataJSON?.() || {};
      const role = postData.email?.includes('admin')
        ? 'admin'
        : postData.email?.includes('owner')
          ? 'owner'
          : 'buyer';
      return json(route, {
        token: 'mock-' + role + '-token',
        user: { id: role === 'admin' ? 99 : role === 'owner' ? 2 : 1, full_name: role + ' user', role, email_verified: true },
      });
    }

    if (path === '/api/listing' && method === 'GET') {
      return json(route, {
        data: [sampleListing],
        pagination: { total: 1, page: 1, limit: 12, total_pages: 1 },
      });
    }

    if (path === '/api/listing/1' && method === 'GET') {
      return json(route, sampleListing);
    }

    if (path === '/api/listing/1/similar' && method === 'GET') {
      return json(route, { data: [{ ...sampleListing, id: 2, title: 'Can ho tuong tu Playwright' }] });
    }

    if (path === '/api/property/owner/list' && method === 'GET') {
      return json(route, { data: [sampleListing], pagination: { total: 1, page: 1, limit: 10, total_pages: 1 } });
    }

    if (path === '/api/property/owner/stats' && method === 'GET') {
      return json(route, ownerStats);
    }

    if (path === '/api/property/featured-packages' && method === 'GET') {
      return json(route, [{ id: 1, name: 'Goi noi bat 7 ngay', price: 99000, duration_days: 7, priority: 1 }]);
    }

    if (path === '/api/property/owner/featured-orders' && method === 'GET') {
      return json(route, []);
    }

    if (path === '/api/property' && method === 'POST') {
      return json(route, { message: 'Created', id: 100 }, 201);
    }

    if (path === '/api/property/1' && method === 'GET') {
      return json(route, sampleListing);
    }

    if (path === '/api/property/1/history' && method === 'GET') {
      return json(route, [{ id: 1, old_status: 'pending', new_status: 'approved', actor_name: 'Admin', created_at: '2026-06-26T10:00:00.000Z' }]);
    }

    if (path === '/api/admin/stats' && method === 'GET') {
      return json(route, adminStats);
    }

    if (path === '/api/admin/properties' && method === 'GET') {
      return json(route, { data: [{ ...sampleListing, status: 'pending' }], pagination: { total: 1, page: 1, limit: 8, total_pages: 1 } });
    }

    if (path === '/api/property/vnpay-return' && method === 'GET') {
      return json(route, { success: true, message: 'Thanh toan VNPay thanh cong. Tin da duoc kich hoat noi bat.' });
    }

    return json(route, { message: 'Mock API fallback', data: [] });
  });
}

async function loginAs(page, role) {
  await page.addInitScript((user) => {
    window.localStorage.setItem('token', 'mock-' + user.role + '-token');
    window.localStorage.setItem('user', JSON.stringify(user));
  }, {
    id: role === 'admin' ? 99 : role === 'owner' ? 2 : 1,
    full_name: role + ' user',
    role,
    email_verified: true,
  });
}

module.exports = { mockBackend, loginAs, sampleListing };
