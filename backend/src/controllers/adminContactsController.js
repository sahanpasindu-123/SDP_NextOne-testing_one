const prisma = require("../utils/prisma");
const { sendMail } = require("../utils/mailer");

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

    return res.status(200).json({
      success: true,
      data: contact,
    });
  } catch (error) {
    console.error("Get contact by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch contact message",
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
    const updatedContact = await prisma.contact.update({
      where: { ContactID: contactId },
      data: {
        RepliedBy: adminId,
        ReplyMessage: replyMessage,
        RepliedAt: new Date(),
      },
    });

    // ✅ Send email to customer (Customer model has Name)
    const customerName = contact.customer?.Name || "Customer";
    const safeCustomerMessage = String(contact.Message || "").replaceAll("\n", "<br/>");
    const safeReply = String(replyMessage).replaceAll("\n", "<br/>");

    let mailSent = false;
    try {
      await sendMail({
        to: contact.customer.Email,
        subject: "Reply to your inquiry",
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
      mailSent = true;
    } catch (mailErr) {
      // IMPORTANT: reply is already saved; do not return 500 to avoid duplicate resend attempts.
      console.error("Contact reply email failed:", mailErr);
    }

    return res.status(200).json({
      success: true,
      mailSent,
      message: mailSent
        ? "Reply sent successfully"
        : "Reply saved, but email delivery failed. You may copy the reply and contact the customer manually.",
      data: updatedContact,
    });
  } catch (error) {
    console.error("Reply to contact error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send reply",
    });
  }
}

module.exports = {
  getAllContacts,
  getContactById,
  replyToContact,
};
