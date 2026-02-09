const prisma = require("../utils/prisma");
const { sendMail } = require("../utils/mailer");
const { generateCode } = require("../utils/otp");

// POST /api/auth/verify-email
// body: { email, code }
exports.verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, message: "email and code required" });
    }

    const Email = String(email).trim().toLowerCase();
    const Code = String(code).trim();

    const user = await prisma.customer.findUnique({ where: { Email } });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.emailVerified) {
      return res.json({ success: true, message: "Already verified" });
    }

    if (!user.emailVerifyCode || !user.emailVerifyExpires) {
      return res.status(400).json({ success: false, message: "No verification request found" });
    }

    if (user.emailVerifyExpires < new Date()) {
      return res.status(400).json({ success: false, message: "Code expired. Please resend." });
    }

    if (user.emailVerifyCode !== Code) {
      return res.status(400).json({ success: false, message: "Invalid code" });
    }

    await prisma.customer.update({
      where: { Email },
      data: {
        emailVerified: true,
        emailVerifyCode: null,
        emailVerifyExpires: null,
      },
    });

    return res.json({ success: true, message: "Email verified successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

// POST /api/auth/resend-email-code
// body: { email }
exports.resendEmailCode = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "email required" });

    const Email = String(email).trim().toLowerCase();

    const user = await prisma.customer.findUnique({ where: { Email } });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.emailVerified) {
      return res.json({ success: true, message: "Already verified" });
    }

    // basic resend throttle: if existing code still valid for > 10 mins, block resend
    if (user.emailVerifyExpires && user.emailVerifyExpires > new Date(Date.now() + 10 * 60 * 1000)) {
      return res.status(429).json({ success: false, message: "Please wait before resending code" });
    }

    const code = generateCode(6);
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.customer.update({
      where: { Email },
      data: { emailVerifyCode: code, emailVerifyExpires: expires },
    });

    await sendMail({
      to: Email,
      subject: "Your new verification code",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Email Verification</h2>
          <p>Your new verification code is:</p>
          <h1 style="letter-spacing: 3px;">${code}</h1>
          <p>This code expires in 15 minutes.</p>
        </div>
      `,
    });

    return res.json({ success: true, message: "Verification code resent" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};
