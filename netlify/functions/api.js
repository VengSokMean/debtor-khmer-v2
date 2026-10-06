import express from "express";
import serverless from "serverless-http";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
const router = express.Router();

app.use(express.json({ limit: "10mb" }));

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MONGODB_URI = process.env.MONGODB_URI;

let client;
let db;

/* =========================
   MONGODB CONNECTION
========================= */

async function getDb() {
  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is missing in Netlify environment variables"
    );
  }

  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }

  if (!db) {
    db = client.db("debttrack");
  }

  return db;
}

/* =========================
   HELPERS
========================= */

function cleanDebt(body = {}) {
  return {
    name: String(body.name || "").trim(),
    phone: String(body.phone || "").trim(),
    amount: Number(body.amount || 0),

    currency:
      body.currency === "KHR"
        ? "KHR"
        : "USD",

    debtDate: String(body.debtDate || ""),
    deadline: String(body.deadline || ""),
    note: String(body.note || "").trim(),

    // Invoice image
    image: String(body.image || ""),

    paid: Boolean(body.paid),
    paidAt: body.paidAt || null,

    createdAt:
      body.createdAt ||
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString()
  };
}

function publicDebt(doc) {
  if (!doc) return null;

  const {
    _id,
    ...rest
  } = doc;

  return {
    ...rest,
    id: _id.toString()
  };
}

/*
  IMPORTANT:
  Used for debt LIST.

  We DO NOT return the Base64 image here.

  This prevents:
  Netlify 413
  Netlify 502
  Huge API responses
*/
function publicDebtList(doc) {
  if (!doc) return null;

  return {
    id: doc._id.toString(),

    name: doc.name || "",
    phone: doc.phone || "",

    amount: Number(doc.amount || 0),
    currency: doc.currency || "USD",

    debtDate: doc.debtDate || "",
    deadline: doc.deadline || "",
    note: doc.note || "",

    paid: Boolean(doc.paid),
    paidAt: doc.paidAt || null,

    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,

    // Tell frontend if invoice exists
    hasImage: Boolean(doc.image)
  };
}

function escapeHtml(value) {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatMoney(d) {
  const amount = Number(d.amount || 0);

  return d.currency === "USD"
    ? "$" +
        amount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })
    : amount.toLocaleString() + "៛";
}

/* =========================
   TELEGRAM
========================= */

async function sendTelegramMessage(message) {
  if (!BOT_TOKEN || !CHAT_ID) {
    return {
      success: false,
      error: "Telegram configuration missing"
    };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
          parse_mode: "HTML"
        })
      }
    );

    const result = await response.json();

    if (result.ok) {
      return {
        success: true
      };
    }

    return {
      success: false,
      error: result.description,
      error_code: result.error_code
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

function messageFor(type, d) {
  const heads = {
    add:
      "💰 <b>NEW DEBT / បំណុលថ្មី</b>",

    update:
      "✏️ <b>DEBT UPDATED / បានកែប្រែបំណុល</b>",

    paid:
      "✅ <b>DEBT PAID / បានសងបំណុល</b>",

    delete:
      "🗑 <b>DEBT DELETED / បានលុបបំណុល</b>"
  };

  const states = {
    add:
      "UNPAID / មិនទាន់សង",

    update:
      "UPDATED / បានកែប្រែ",

    paid:
      "PAID / បានសង",

    delete:
      "DELETED / បានលុប"
  };

  return `${heads[type]}

━━━━━━━━━━━━━━━━━━

👤 <b>Name / ឈ្មោះ:</b>
${escapeHtml(d.name)}

📱 <b>Phone / លេខទូរស័ព្ទ:</b>
${escapeHtml(d.phone)}

💵 <b>Amount / ចំនួនទឹកប្រាក់:</b>
${formatMoney(d)}

💱 <b>Currency / រូបិយប័ណ្ណ:</b>
${escapeHtml(d.currency)}

📅 <b>Debt Date / ថ្ងៃជំពាក់:</b>
${escapeHtml(d.debtDate)}

⏰ <b>Deadline / ថ្ងៃកំណត់សង:</b>
${escapeHtml(d.deadline)}

📝 <b>Note / កំណត់ចំណាំ:</b>
${escapeHtml(d.note)}

<b>Status / ស្ថានភាព:</b>
${states[type]}

━━━━━━━━━━━━━━━━━━

🗂 <b>DebtTrack KH</b>`;
}

/* =========================
   TEST TELEGRAM
========================= */

router.get(
  "/test-telegram",
  async (req, res) => {
    const telegram =
      await sendTelegramMessage(
        "🤖 <b>DebtTrack KH</b>\n\n✅ Netlify Telegram is working!"
      );

    if (telegram.success) {
      return res.json({
        success: true,
        message:
          "Telegram message sent successfully!"
      });
    }

    return res
      .status(500)
      .json(telegram);
  }
);

/* =========================
   TEST DATABASE
========================= */

router.get(
  "/test-db",
  async (req, res) => {
    try {
      const database =
        await getDb();

      await database.command({
        ping: 1
      });

      res.json({
        success: true,
        message:
          "MongoDB connected successfully!"
      });
    } catch (error) {
      console.error(
        "MongoDB test error:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/* =========================
   GET ALL DEBTS
   NO BASE64 IMAGES
========================= */

router.get(
  "/debts",
  async (req, res) => {
    try {
      const database =
        await getDb();

      /*
        IMPORTANT:

        image: 0 means MongoDB does NOT
        return the Base64 image.

        This fixes the 413 / 502 error.
      */

      const docs =
        await database
          .collection("debts")
          .find(
            {},
            {
              projection: {
                image: 0
              }
            }
          )
          .sort({
            createdAt: -1
          })
          .toArray();

      const debts =
        docs.map(publicDebtList);

      res.json({
        success: true,
        debts
      });
    } catch (error) {
      console.error(
        "Load debts error:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/* =========================
   GET ONE DEBT
========================= */

router.get(
  "/debt/:id",
  async (req, res) => {
    try {
      if (
        !ObjectId.isValid(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              "Invalid debt ID"
          });
      }

      const database =
        await getDb();

      const debt =
        await database
          .collection("debts")
          .findOne({
            _id:
              new ObjectId(
                req.params.id
              )
          });

      if (!debt) {
        return res
          .status(404)
          .json({
            success: false,
            error:
              "Debt not found"
          });
      }

      res.json({
        success: true,
        debt:
          publicDebt(debt)
      });
    } catch (error) {
      console.error(
        "Get debt error:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/* =========================
   GET INVOICE IMAGE
========================= */

router.get(
  "/debt/:id/image",
  async (req, res) => {
    try {
      if (
        !ObjectId.isValid(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              "Invalid debt ID"
          });
      }

      const database =
        await getDb();

      /*
        Only get image field.
      */

      const debt =
        await database
          .collection("debts")
          .findOne(
            {
              _id:
                new ObjectId(
                  req.params.id
                )
            },
            {
              projection: {
                image: 1
              }
            }
          );

      if (!debt) {
        return res
          .status(404)
          .json({
            success: false,
            error:
              "Debt not found"
          });
      }

      if (!debt.image) {
        return res
          .status(404)
          .json({
            success: false,
            error:
              "Invoice image not found"
          });
      }

      res.json({
        success: true,
        image: debt.image
      });
    } catch (error) {
      console.error(
        "Invoice error:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/* =========================
   ADD DEBT
========================= */

router.post(
  "/debt",
  async (req, res) => {
    try {
      const debt =
        cleanDebt(req.body);

      if (
        !debt.name ||
        debt.amount <= 0 ||
        !debt.debtDate ||
        !debt.deadline
      ) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              "Missing or invalid debt data"
          });
      }

      const database =
        await getDb();

      const result =
        await database
          .collection("debts")
          .insertOne(debt);

      const saved = {
        ...debt,
        _id:
          result.insertedId
      };

      const telegram =
        await sendTelegramMessage(
          messageFor(
            "add",
            debt
          )
        );

      /*
        Do NOT return Base64 image
        after saving.
      */

      res.status(201).json({
        success: true,

        debt:
          publicDebtList(
            saved
          ),

        telegram:
          telegram.success,

        telegramError:
          telegram.error ||
          null
      });
    } catch (error) {
      console.error(
        "Add debt error:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/* =========================
   UPDATE DEBT
========================= */

router.put(
  "/debt/:id",
  async (req, res) => {
    try {
      if (
        !ObjectId.isValid(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              "Invalid debt ID"
          });
      }

      const database =
        await getDb();

      const _id =
        new ObjectId(
          req.params.id
        );

      const old =
        await database
          .collection("debts")
          .findOne({
            _id
          });

      if (!old) {
        return res
          .status(404)
          .json({
            success: false,
            error:
              "Debt not found"
          });
      }

      /*
        Keep old image if frontend
        does not send a new image.
      */

      const incoming = {
        ...old,
        ...req.body,

        image:
          req.body.image !==
            undefined &&
          req.body.image !== ""
            ? req.body.image
            : old.image,

        createdAt:
          old.createdAt
      };

      const debt =
        cleanDebt(incoming);

      await database
        .collection("debts")
        .updateOne(
          {
            _id
          },
          {
            $set: debt
          }
        );

      const telegram =
        await sendTelegramMessage(
          messageFor(
            "update",
            debt
          )
        );

      res.json({
        success: true,

        debt:
          publicDebtList({
            ...debt,
            _id
          }),

        telegram:
          telegram.success,

        telegramError:
          telegram.error ||
          null
      });
    } catch (error) {
      console.error(
        "Update debt error:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/* =========================
   MARK PAID
========================= */

router.patch(
  "/debt/:id/paid",
  async (req, res) => {
    try {
      if (
        !ObjectId.isValid(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              "Invalid debt ID"
          });
      }

      const database =
        await getDb();

      const _id =
        new ObjectId(
          req.params.id
        );

      const old =
        await database
          .collection("debts")
          .findOne({
            _id
          });

      if (!old) {
        return res
          .status(404)
          .json({
            success: false,
            error:
              "Debt not found"
          });
      }

      const update = {
        paid: true,

        paidAt:
          new Date()
            .toISOString(),

        updatedAt:
          new Date()
            .toISOString()
      };

      await database
        .collection("debts")
        .updateOne(
          {
            _id
          },
          {
            $set: update
          }
        );

      const debt = {
        ...old,
        ...update
      };

      const telegram =
        await sendTelegramMessage(
          messageFor(
            "paid",
            debt
          )
        );

      res.json({
        success: true,

        debt:
          publicDebtList(
            debt
          ),

        telegram:
          telegram.success,

        telegramError:
          telegram.error ||
          null
      });
    } catch (error) {
      console.error(
        "Paid debt error:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/* =========================
   DELETE DEBT
========================= */

router.delete(
  "/debt/:id",
  async (req, res) => {
    try {
      if (
        !ObjectId.isValid(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            error:
              "Invalid debt ID"
          });
      }

      const database =
        await getDb();

      const _id =
        new ObjectId(
          req.params.id
        );

      const debt =
        await database
          .collection("debts")
          .findOne({
            _id
          });

      if (!debt) {
        return res
          .status(404)
          .json({
            success: false,
            error:
              "Debt not found"
          });
      }

      await database
        .collection("debts")
        .deleteOne({
          _id
        });

      const telegram =
        await sendTelegramMessage(
          messageFor(
            "delete",
            debt
          )
        );

      res.json({
        success: true,

        telegram:
          telegram.success,

        telegramError:
          telegram.error ||
          null
      });
    } catch (error) {
      console.error(
        "Delete debt error:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/* =========================
   OLD TELEGRAM ROUTES
========================= */

router.post(
  "/update",
  async (req, res) => {
    const telegram =
      await sendTelegramMessage(
        messageFor(
          "update",
          req.body
        )
      );

    res.json({
      success: true,
      telegram:
        telegram.success
    });
  }
);

router.post(
  "/paid",
  async (req, res) => {
    const telegram =
      await sendTelegramMessage(
        messageFor(
          "paid",
          req.body
        )
      );

    res.json({
      success: true,
      telegram:
        telegram.success
    });
  }
);

router.post(
  "/delete",
  async (req, res) => {
    const telegram =
      await sendTelegramMessage(
        messageFor(
          "delete",
          req.body
        )
      );

    res.json({
      success: true,
      telegram:
        telegram.success
    });
  }
);

/* =========================
   APP
========================= */

app.use(
  "/api",
  router
);

export const handler =
  serverless(app);