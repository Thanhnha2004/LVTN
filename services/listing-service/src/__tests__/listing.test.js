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

  test("similar listings returns 404 when base property is not approved", async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app()).get("/api/listing/999/similar");

    expect(res.status).toBe(404);
  });
});
