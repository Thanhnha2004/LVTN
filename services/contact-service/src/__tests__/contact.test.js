const express = require("express");
const request = require("supertest");
const pool = require("../db");
const contactRouter = require("../routes/contact");
const { sendContactNotification } = require("../mailer");

jest.mock("../db", () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../mailer", () => ({
  sendContactNotification: jest.fn().mockResolvedValue(),
}));
jest.mock("../middleware/auth", () => (req, res, next) => {
  req.user = global.mockUser || { id: 1, role: "buyer" };
  next();
});

function app() {
  const app = express();
  app.use(express.json());
  app.use("/api/contact", contactRouter);
  return app;
}

describe("contact-service", () => {
  const mockConnection = {
    query: jest.fn(),
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockReset();
    pool.getConnection.mockReset();
    mockConnection.query.mockReset();
    pool.getConnection.mockResolvedValue(mockConnection);
    sendContactNotification.mockResolvedValue();
    mockConnection.beginTransaction.mockResolvedValue();
    mockConnection.commit.mockResolvedValue();
    mockConnection.rollback.mockResolvedValue();
    mockConnection.release.mockReturnValue();
    global.mockUser = { id: 1, role: "buyer" };
  });

  test("admin cannot send contact request", async () => {
    global.mockUser = { id: 99, role: "admin" };

    const res = await request(app())
      .post("/api/contact")
      .send({ property_id: 1, message: "Toi muon xem nha" });

    expect(res.status).toBe(403);
  });

  test("owner cannot contact own property", async () => {
    global.mockUser = { id: 2, role: "owner" };
    pool.query.mockResolvedValueOnce([[{ id: 1, owner_id: 2 }]]);

    const res = await request(app())
      .post("/api/contact")
      .send({ property_id: 1, message: "Toi muon xem nha" });

    expect(res.status).toBe(400);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  test("buyer sends contact request for approved property", async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 1, owner_id: 7 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([
        [
          {
            owner_email: "owner@test.com",
            owner_name: "Owner",
            buyer_name: "Buyer",
            title: "Can ho",
          },
        ],
      ]);

    const res = await request(app())
      .post("/api/contact")
      .send({ property_id: 1, message: "Toi can lien he" });

    expect(res.status).toBe(201);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO contacts"),
      [1, 1, "Toi can lien he"],
    );
  });

  test("owner can send contact request for another owner's property", async () => {
    global.mockUser = { id: 2, role: "owner" };
    pool.query
      .mockResolvedValueOnce([[{ id: 1, owner_id: 7 }]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([
        [
          {
            owner_email: "seller@test.com",
            owner_name: "Seller",
            buyer_name: "Owner Buyer",
            title: "Can ho",
          },
        ],
      ]);

    const res = await request(app())
      .post("/api/contact")
      .send({ property_id: 1, message: "Toi muon mua tin nay" });

    expect(res.status).toBe(201);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO contacts"),
      [1, 2, "Toi muon mua tin nay"],
    );
  });

  test("prevents duplicate contact request for same property", async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 1, owner_id: 7 }]])
      .mockResolvedValueOnce([[{ id: 10 }]]);

    const res = await request(app())
      .post("/api/contact")
      .send({ property_id: 1, message: "Toi can lien he" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBeTruthy();
  });

  test("rejects too short contact message", async () => {
    const res = await request(app())
      .post("/api/contact")
      .send({ property_id: 1, message: "Hi" });

    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("owner can reply only to owned contact", async () => {
    global.mockUser = { id: 7, role: "owner" };
    pool.query
      .mockResolvedValueOnce([[{ id: 5, lead_status: "new" }]])
      .mockResolvedValueOnce([{}]);

    const res = await request(app())
      .patch("/api/contact/5/reply")
      .send({ owner_reply: "Ban co the lien he so dien thoai nay" });

    expect(res.status).toBe(200);
    expect(res.body.lead_status).toBe("contacted");
    expect(pool.query).toHaveBeenCalledWith(
      "UPDATE contacts SET owner_reply = ?, status = 'replied', lead_status = ? WHERE id = ?",
      ["Ban co the lien he so dien thoai nay", "contacted", "5"],
    );
  });

  test("owner reply keeps existing advanced lead status", async () => {
    global.mockUser = { id: 7, role: "owner" };
    pool.query
      .mockResolvedValueOnce([[{ id: 5, lead_status: "scheduled" }]])
      .mockResolvedValueOnce([{}]);

    const res = await request(app())
      .patch("/api/contact/5/reply")
      .send({ owner_reply: "Da xac nhan lich hen xem" });

    expect(res.status).toBe(200);
    expect(res.body.lead_status).toBe("scheduled");
    expect(pool.query).toHaveBeenCalledWith(
      "UPDATE contacts SET owner_reply = ?, status = 'replied', lead_status = ? WHERE id = ?",
      ["Da xac nhan lich hen xem", "scheduled", "5"],
    );
  });

  test("buyer can save approved property", async () => {
    pool.query.mockResolvedValueOnce([[{ id: 1 }]]).mockResolvedValueOnce([{}]);

    const res = await request(app())
      .post("/api/contact/saved")
      .send({ property_id: 1 });

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT IGNORE INTO saved_properties"),
      [1, 1],
    );
  });
  test("owner can list received contacts with pagination", async () => {
    global.mockUser = { id: 7, role: "owner" };
    pool.query
      .mockResolvedValueOnce([
        [{ id: 1, property_title: "Can ho", buyer_name: "Buyer" }],
      ])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    const res = await request(app()).get(
      "/api/contact/owner?page=1&limit=10&lead_status=new",
    );

    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(1);
    expect(pool.query.mock.calls[0][1]).toEqual([7, "new", 10, 0]);
  });

  test("owner updates lead status for owned contact", async () => {
    global.mockUser = { id: 7, role: "owner" };
    mockConnection.query
      .mockResolvedValueOnce([[
        {
          id: 9,
          property_id: 3,
          current_lead_status: "contacted",
          property_status: "approved",
        },
      ]])
      .mockResolvedValueOnce([{}]);

    const res = await request(app())
      .patch("/api/contact/9/lead")
      .send({
        lead_status: "scheduled",
        owner_note: "Lịch hẹn xem: 09:30 20/08/2026. Hẹn tại sảnh",
      });

    expect(res.status).toBe(200);
    expect(mockConnection.query).toHaveBeenCalledWith(
      "UPDATE contacts SET lead_status = ?, owner_note = ? WHERE id = ?",
      ["scheduled", "Lịch hẹn xem: 09:30 20/08/2026. Hẹn tại sảnh", "9"],
    );
  });

  test("scheduled lead requires appointment time", async () => {
    global.mockUser = { id: 7, role: "owner" };

    const res = await request(app())
      .patch("/api/contact/9/lead")
      .send({ lead_status: "scheduled", owner_note: "Hen xem nha" });

    expect(res.status).toBe(400);
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  test("scheduled lead rejects past appointment time", async () => {
    global.mockUser = { id: 7, role: "owner" };

    const res = await request(app())
      .patch("/api/contact/9/lead")
      .send({
        lead_status: "scheduled",
        owner_note: "Lich hen xem: 09:30 01/01/2020. Hen tai sanh",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Lịch hẹn xem");
    expect(pool.getConnection).not.toHaveBeenCalled();
  });

  test("closed lead marks approved property as sold", async () => {
    global.mockUser = { id: 7, role: "owner" };
    mockConnection.query
      .mockResolvedValueOnce([[
        {
          id: 9,
          property_id: 3,
          current_lead_status: "scheduled",
          property_status: "approved",
        },
      ]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);

    const res = await request(app())
      .patch("/api/contact/9/lead")
      .send({ lead_status: "closed", owner_note: "Khach da dat coc" });

    expect(res.status).toBe(200);
    expect(mockConnection.query).toHaveBeenCalledWith(
      "UPDATE properties SET status = 'sold', sold_at = NOW(), featured_until = NULL WHERE id = ?",
      [3],
    );
  });

  test("owner cannot skip lead process from new directly to closed", async () => {
    global.mockUser = { id: 7, role: "owner" };
    mockConnection.query.mockResolvedValueOnce([[
      {
        id: 9,
        property_id: 3,
        current_lead_status: "new",
        property_status: "approved",
      },
    ]]);

    const res = await request(app())
      .patch("/api/contact/9/lead")
      .send({ lead_status: "closed", owner_note: "Khach da dat coc" });

    expect(res.status).toBe(400);
    expect(mockConnection.rollback).toHaveBeenCalled();
  });

  test("owner cannot cancel a new lead before contacting buyer", async () => {
    global.mockUser = { id: 7, role: "owner" };
    mockConnection.query.mockResolvedValueOnce([[
      {
        id: 9,
        property_id: 3,
        current_lead_status: "new",
        property_status: "approved",
      },
    ]]);

    const res = await request(app())
      .patch("/api/contact/9/lead")
      .send({ lead_status: "cancelled", owner_note: "Khach khong phu hop" });

    expect(res.status).toBe(400);
    expect(mockConnection.rollback).toHaveBeenCalled();
  });

  test("buyer can list sent contacts and owner response information", async () => {
    pool.query
      .mockResolvedValueOnce([
        [
          {
            id: 1,
            property_title: "Can ho",
            owner_reply: "Con hang",
            owner_phone: "0909",
          },
        ],
      ])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    const res = await request(app()).get("/api/contact/buyer?page=1&limit=10");

    expect(res.status).toBe(200);
    expect(res.body.data[0].owner_phone).toBe("0909");
  });

  test("buyer can remove saved property", async () => {
    pool.query.mockResolvedValueOnce([{}]);

    const res = await request(app()).delete("/api/contact/saved/3");

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      "DELETE FROM saved_properties WHERE buyer_id = ? AND property_id = ?",
      [1, "3"],
    );
  });

  test("buyer can list saved properties", async () => {
    pool.query.mockResolvedValueOnce([[{ id: 3, title: "Nha pho" }]]);

    const res = await request(app()).get("/api/contact/saved");

    expect(res.status).toBe(200);
    expect(res.body[0].title).toBe("Nha pho");
  });
});
