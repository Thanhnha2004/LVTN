const express = require("express");
const request = require("supertest");
const pool = require("../db");
const listingRouter = require("../routes/listing");

jest.mock("../db", () => ({ query: jest.fn() }));

function app() {
  const app = express();
  app.use(express.json());
  app.use("/api/listing", listingRouter);
  return app;
}

describe("listing-service", () => {
  beforeEach(() => jest.clearAllMocks());

  test("rejects invalid property type filter", async () => {
    const res = await request(app()).get("/api/listing?type=hotel");

    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("returns filtered listings with pagination", async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 1, title: "Can ho Quan 1" }]])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    const res = await request(app()).get(
      "/api/listing?type=apartment&transaction_type=sale&city=HCM&min_price=1000000&page=1&limit=5",
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.total).toBe(1);
    expect(pool.query.mock.calls[0][0]).toContain("p.status = 'approved'");
    expect(pool.query.mock.calls[0][1]).toEqual(
      expect.arrayContaining(["apartment", "sale", "%HCM%", 1000000, 5, 0]),
    );
  });

  test("searches floor keyword as a phrase instead of loose tokens", async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 2, title: "Nha pho 2 tang" }]])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    const res = await request(app()).get(
      "/api/listing?keyword=nha%202%20tang&page=1&limit=8",
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(pool.query.mock.calls[0][0]).toContain("p.title LIKE ?");
    expect(pool.query.mock.calls[0][1]).toContain("%2 tang%");
    expect(pool.query.mock.calls[0][1]).toContain("%nha%");
    expect(pool.query.mock.calls[0][1]).not.toContain("%2%");
    expect(pool.query.mock.calls[0][1]).not.toContain("%tang%");
  });

  test("returns listing detail and increments view_count", async () => {
    pool.query
      .mockResolvedValueOnce([
        [{ id: 1, title: "Nha pho", images: "a.jpg,b.jpg" }],
      ])
      .mockResolvedValueOnce([{}]);

    const res = await request(app()).get("/api/listing/1");

    expect(res.status).toBe(200);
    expect(res.body.images).toEqual(["a.jpg", "b.jpg"]);
    expect(pool.query).toHaveBeenCalledWith(
      "UPDATE properties SET view_count = view_count + 1 WHERE id = ?",
      ["1"],
    );
  });

  test("returns 404 when approved listing does not exist", async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app()).get("/api/listing/999");

    expect(res.status).toBe(404);
  });

  test("returns public owner profile with approved properties", async () => {
    pool.query
      .mockResolvedValueOnce([
        [
          {
            id: 2,
            full_name: "Owner Demo",
            email_verified: 1,
            approved_properties: 3,
            hidden_properties: 1,
          },
        ],
      ])
      .mockResolvedValueOnce([[{ id: 10, title: "Tin da duyet" }]]);

    const res = await request(app()).get("/api/listing/owners/2");

    expect(res.status).toBe(200);
    expect(res.body.owner.full_name).toBe("Owner Demo");
    expect(res.body.owner.hidden_properties).toBe(1);
    expect(res.body.properties).toHaveLength(1);
    expect(pool.query.mock.calls[0][0]).toContain("u.role = 'owner'");
    expect(pool.query.mock.calls[0][0]).toContain("hidden_properties");
    expect(pool.query.mock.calls[1][0]).toContain("p.status = 'approved'");
  });

  test("rejects invalid bbox filter", async () => {
    const res = await request(app()).get("/api/listing?bbox=10,106,11");

    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("returns similar listings by type transaction city and price range", async () => {
    pool.query
      .mockResolvedValueOnce([
        [
          {
            type: "apartment",
            transaction_type: "sale",
            city: "TP.HCM",
            price: 3000000000,
          },
        ],
      ])
      .mockResolvedValueOnce([[{ id: 2, title: "Can ho tuong tu" }]]);

    const res = await request(app()).get("/api/listing/1/similar");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(pool.query.mock.calls[1][1]).toEqual([
      "1",
      "apartment",
      "sale",
      "%TP.HCM%",
      1500000000,
      4500000000,
    ]);
  });

  test("returns price estimate from comparable listings", async () => {
    pool.query
      .mockResolvedValueOnce([
        [
          {
            id: 1,
            type: "apartment",
            transaction_type: "sale",
            city: "TP.HCM",
            district: "Quan 1",
            price: 3000000000,
            area: 60,
          },
        ],
      ])
      .mockResolvedValueOnce([
        [
          { id: 2, price: 2800000000, area: 58, unit_price: 48275862 },
          { id: 3, price: 3100000000, area: 62, unit_price: 50000000 },
          { id: 4, price: 3300000000, area: 64, unit_price: 51562500 },
        ],
      ]);

    const res = await request(app()).get("/api/listing/1/price-estimate");

    expect(res.status).toBe(200);
    expect(res.body.sample_size).toBe(3);
    expect(res.body.estimated_range.low).toBeTruthy();
  });

  test("price estimate broadens comparable scope when strict match is sparse", async () => {
    pool.query
      .mockResolvedValueOnce([
        [
          {
            id: 1,
            type: "house",
            transaction_type: "sale",
            city: "TP.HCM",
            district: "Quan 1",
            price: 7000000000,
            area: 80,
          },
        ],
      ])
      .mockResolvedValueOnce([[{ id: 2, price: 6900000000, area: 82, unit_price: 84146341 }]])
      .mockResolvedValueOnce([[{ id: 2, price: 6900000000, area: 82, unit_price: 84146341 }]])
      .mockResolvedValueOnce([
        [
          { id: 2, price: 6900000000, area: 82, unit_price: 84146341 },
          { id: 3, price: 7200000000, area: 88, unit_price: 81818182 },
          { id: 4, price: 6500000000, area: 75, unit_price: 86666667 },
        ],
      ]);

    const res = await request(app()).get("/api/listing/1/price-estimate");

    expect(res.status).toBe(200);
    expect(res.body.sample_size).toBe(3);
    expect(res.body.basis).toBe("Cùng thành phố, cùng loại và diện tích mở rộng");
    expect(pool.query).toHaveBeenCalledTimes(4);
  });

  test("similar listings returns 404 when base property is not approved", async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app()).get("/api/listing/999/similar");

    expect(res.status).toBe(404);
  });
});
