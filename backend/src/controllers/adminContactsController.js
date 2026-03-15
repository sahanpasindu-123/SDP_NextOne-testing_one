const prisma = require("../utils/prisma");
const { sendMail } = require("../utils/mailer");

function isValidEmail(email) {
  if (!email) return false;
  const cleaned = String(email).trim().toLowerCase();
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(cleaned);
}

/**
 * GET /api/admin/contacts
 * Admin views all contact messages
 */
async function getAllContacts(req, res) {
  try {
    const adminId = req.user?.dbId;
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again.",
      });
    }

    const contacts = await prisma.contact.findMany({
      include: {
        customer: {
          // ✅ Customer model fields (from your schema): Name, Email
          select: {
            Email: true,
            Name: true,
          },
        },
      },
      orderBy: { CreatedAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      data: contacts,
    });
  } catch (error) {
    console.error("Get all contacts error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch contact messages",
    });
  }
}

/**
 * GET /api/admin/contacts/:id
 * Admin views one contact message
 */
async function getContactById(req, res) {
  try {
    const adminId = req.user?.dbId;
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again.",
      });
    }

    const contactId = Number(req.params.id);
    if (!Number.isFinite(contactId) || contactId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid contact id",
      });
    }

    const contact = await prisma.contact.findUnique({
      where: { ContactID: contactId },
      include: {
        customer: {
          select: {
            Email: true,
            Name: true,
          },
        },
      },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found",
      });
    }

    // Simple conversation-like history: all contact messages for this customer.
    // Keeps existing structure (each message is a Contact row) and only enriches the detail response.
    const historyDesc = await prisma.contact.findMany({
      where: { CustomerID: contact.CustomerID },
      orderBy: { CreatedAt: "desc" },
      take: 50,
      select: {
        ContactID: true,
        Subject: true,
        Message: true,
        CreatedAt: true,
        RepliedBy: true,
        ReplyMessage: true,
        RepliedAt: true,
      },
    });
    const history = historyDesc.reverse();

    return res.status(200).json({
      success: true,
      data: { ...contact, history },
    });
  } catch (error) {
    console.error("Get contact by id error:", error);

    const debugError =
      process.env.NODE_ENV !== "production" ? error?.message : undefined;
    return res.status(500).json({
      success: false,
      message: "Failed to fetch contact message",
      ...(debugError ? { error: debugError } : {}),
    });
  }
}

/**
 * POST /api/admin/contacts/:id/reply
 * Admin replies to a contact message + sends email
 */
async function replyToContact(req, res) {
  try {
    const adminId = req.user?.dbId;
    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again.",
      });
    }

    const contactId = Number(req.params.id);
    if (!Number.isFinite(contactId) || contactId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid contact id",
      });
    }

    const replyRaw = req.body?.replyMessage;
    const replyMessage = typeof replyRaw === "string" ? replyRaw.trim() : "";

    if (!replyMessage) {
      return res.status(400).json({
        success: false,
        message: "Reply message is required",
      });
    }

    const contact = await prisma.contact.findUnique({
      where: { ContactID: contactId },
      include: { customer: true },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found",
      });
    }

    if (!contact.customer?.Email) {
      return res.status(400).json({
        success: false,
        message: "Customer email not found for this contact.",
      });
    }

    // ✅ Update contact with reply (persist even if email sending fails)
    const customerEmail = String(contact.customer.Email || "").trim().toLowerCase();
    if (!isValidEmail(customerEmail)) {
      return res.status(400).json({
        success: false,
        message: "Customer email is invalid for this account.",
      });
    }

    // Save reply first (email sending happens after saving).
    // RepliedAt is the time the admin replied (saved), not necessarily when email delivered.
    let updatedContact = await prisma.contact.update({
      where: { ContactID: contactId },
      data: {
        // Link reply to the replying admin (FK)
        // NOTE: Use the scalar FK to avoid failures when Prisma relation fields are out-of-sync.
        RepliedBy: adminId,
        ReplyMessage: replyMessage,
        RepliedAt: new Date(),
      },
    });

    // ✅ Send email to customer (Customer model has Name)
    const customerName = contact.customer?.Name || "Customer";
    const safeCustomerMessage = String(contact.Message || "").replaceAll("\n", "<br/>");
    const safeReply = String(replyMessage).replaceAll("\n", "<br/>");

    try {
      await sendMail({
        to: customerEmail,
        subject: contact.Subject
          ? `Reply: ${String(contact.Subject).slice(0, 150)}`
          : "Reply to your inquiry",
        html: `
          <p>Dear ${customerName},</p>
          <p>${safeReply}</p>
          <hr />
          <p><strong>Your Message:</strong></p>
          <p>${safeCustomerMessage}</p>
          <br />
          <p>Best regards,<br/>NextOne Support Team</p>
        `,
      });
    } catch (mailErr) {
      console.error("Contact reply email failed:", mailErr);

      // 200 OK because the reply is saved; UI should show delivery failure clearly.
      const debugMailError = String(
        mailErr?.message || mailErr || "Email delivery failed"
      );
      return res.status(200).json({
        success: true,
        mailSent: false,
        message: `Reply saved, but email delivery failed: ${debugMailError}`,
        error: debugMailError,
        data: updatedContact,
      });
    }

    return res.status(200).json({
      success: true,
      mailSent: true,
      message: "Reply sent successfully",
      data: updatedContact,
    });
  } catch (error) {
    console.error("Reply to contact error:", error);
    const debugError = String(error?.message || error || "Unknown error");
    return res.status(500).json({
      success: false,
      message: `Failed to send reply: ${debugError}`,
      error: debugError,
    });
  }
}

module.exports = {
  getAllContacts,
  getContactById,
  replyToContact,
};
