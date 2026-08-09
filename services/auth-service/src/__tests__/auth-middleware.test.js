const jwt = require("jsonwebtoken");
const pool = require("../db");
const authMiddleware = require("../middleware/auth");

jest.mock("../db", () => ({ query: jest.fn() }));

function response() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("auth middleware token revocation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
    delete process.env.ALLOW_DEMO_ADMIN_LOGIN;
  });

  test("accepts a token with the current token version", async () => {
    const token = jwt.sign({ id: 1, role: "buyer", tv: 2 }, "test-secret");
    pool.query.mockResolvedValueOnce([
      [{ status: "active", token_version: 2 }],
    ]);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = response();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ id: 1, role: "buyer", tv: 2 });
  });

  test("rejects a token issued before a password change", async () => {
    const token = jwt.sign({ id: 1, role: "buyer", tv: 1 }, "test-secret");
    pool.query.mockResolvedValueOnce([
      [{ status: "active", token_version: 2 }],
    ]);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = response();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test("blocks an existing demo Admin session while demo login is disabled", async () => {
    const token = jwt.sign({ id: 1, role: "admin", tv: 1 }, "test-secret");
    pool.query.mockResolvedValueOnce([
      [{ status: "active", token_version: 1, is_demo_account: 1 }],
    ]);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = response();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test("allows the demo Admin session only when explicitly enabled", async () => {
    process.env.ALLOW_DEMO_ADMIN_LOGIN = "true";
    const token = jwt.sign({ id: 1, role: "admin", tv: 1 }, "test-secret");
    pool.query.mockResolvedValueOnce([
      [{ status: "active", token_version: 1, is_demo_account: 1 }],
    ]);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = response();
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
