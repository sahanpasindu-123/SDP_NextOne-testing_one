const prisma = require("../utils/prisma");

/**
 * POST /api/contacts
 * Customer creates a contact message
 */
async function createContact(req, res) {
  try {
    const customerId = req.user?.dbId;
    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again.",
      });
    }

    const subjectRaw = req.body?.subject;
    const messageRaw = req.body?.message;

    const subject = typeof subjectRaw === "string" ? subjectRaw.trim() : null;
    const message = typeof messageRaw === "string" ? messageRaw.trim() : "";

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    if (message.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Message must be at least 10 characters.",
      });
    }

    if (subject && subject.length > 150) {
      return res.status(400).json({
        success: false,
        message: "Subject must be 150 characters or less.",
      });
    }

    const contact = await prisma.contact.create({
      data: {
        CustomerID: customerId,
        Subject: subject || null,
        Message: message,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Contact message sent successfully",
      data: contact,
    });
  } catch (error) {
    console.error("Create contact error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send contact message",
    });
  }
}

/**
 * GET /api/contacts/my
 * Customer views own messages
 */
async function getMyContacts(req, res) {
  try {
    const customerId = req.user?.dbId;
    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again.",
      });
    }

    const contacts = await prisma.contact.findMany({
      where: { CustomerID: customerId },
      orderBy: { CreatedAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      data: contacts,
    });
  } catch (error) {
    console.error("Get my contacts error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch contact messages",
    });
  }
}

module.exports = {
  createContact,
  getMyContacts,
};
