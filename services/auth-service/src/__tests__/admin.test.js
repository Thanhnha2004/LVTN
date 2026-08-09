const express = require("express");
const request = require("supertest");
const pool = require("../db");
const adminRouter = require("../routes/admin");

jest.mock("../db", () => ({ query: jest.fn() }));
jest.mock("../middleware/auth", () => (req, res, next) => {
  req.user = global.mockAdminUser || { id: 1, role: "admin" };
  next();
});

function app() {
  const instance = express();
  instance.use(express.json());
  instance.use("/api/admin", adminRouter);
  return instance;
}

describe("admin routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete global.mockAdminUser;
  });

  test("rejects non-admin users", async () => {
    global.mockAdminUser = { id: 2, role: "owner" };

    const res = await request(app()).get("/api/admin/users");

    expect(res.status).toBe(403);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("rejects invalid server-side user filters", async () => {
    const res = await request(app()).get("/api/admin/users?role=superadmin");

    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("prevents an Admin from banning their own account", async () => {
    const res = await request(app())
      .patch("/api/admin/users/1/status")
      .send({ status: "banned" });

    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test("revokes existing sessions when Admin changes an account status", async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const res = await request(app())
      .patch("/api/admin/users/2/status")
      .send({ status: "banned" });

    expect(res.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("token_version = token_version + 1"),
      ["banned", "2"],
    );
  });

  test("filters on the server, caps pagination and returns global summary", async () => {
    pool.query
      .mockResolvedValueOnce([
        [{ id: 3, full_name: "Owner A", role: "owner", status: "banned" }],
      ])
      .mockResolvedValueOnce([[{ total: 1 }]])
      .mockResolvedValueOnce([
        [{ total: 16, owners: 7, buyers: 8, banned: 2 }],
      ]);

    const res = await request(app()).get(
      "/api/admin/users?page=2&limit=999&role=owner&status=banned",
    );

    expect(res.status).toBe(200);
    expect(pool.query.mock.calls[0][0]).toContain("role = ?");
    expect(pool.query.mock.calls[0][0]).toContain("status = ?");
    expect(pool.query.mock.calls[0][1]).toEqual(["owner", "banned", 50, 50]);
    expect(res.body.pagination).toMatchObject({ page: 2, limit: 50, total: 1 });
    expect(res.body.summary).toEqual({
      total: 16,
      owners: 7,
      buyers: 8,
      banned: 2,
    });
  });
});
