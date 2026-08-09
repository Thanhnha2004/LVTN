const mockSendMail = jest.fn().mockResolvedValue();

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

const { escapeHtml, sendContactNotification } = require("../mailer");

describe("contact mailer", () => {
  beforeEach(() => {
    mockSendMail.mockClear();
    process.env.MAIL_USER = "mailer@test.com";
  });

  test("escapes HTML metacharacters", () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'value'`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;value&#39;",
    );
  });

  test("escapes every user-controlled value in notification HTML", async () => {
    await sendContactNotification({
      ownerEmail: "owner@test.com",
      ownerName: '<img src=x onerror="owner">',
      buyerName: "<b>Buyer</b>",
      propertyTitle: "Can ho\r\nBcc: attacker@test.com <script>x</script>",
      message: '<a href="https://evil.test">click</a>',
    });

    const mail = mockSendMail.mock.calls[0][0];
    expect(mail.subject).not.toMatch(/[\r\n]/);
    expect(mail.html).not.toContain("<script>x</script>");
    expect(mail.html).not.toContain("<b>Buyer</b>");
    expect(mail.html).not.toContain('<a href="https://evil.test">');
    expect(mail.html).toContain("&lt;script&gt;x&lt;/script&gt;");
    expect(mail.html).toContain("&lt;b&gt;Buyer&lt;/b&gt;");
    expect(mail.html).toContain(
      "&lt;a href=&quot;https://evil.test&quot;&gt;click&lt;/a&gt;",
    );
  });
});
