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
async function getDb() {
  if (!MONGODB_URI) throw new Error("MONGODB_URI is missing in Netlify environment variables");
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
  }
  if (!db) db = client.db("debttrack");
  return db;
}

function cleanDebt(body = {}) {
  return {
    name: String(body.name || "").trim(),
    phone: String(body.phone || "").trim(),
    amount: Number(body.amount || 0),
    currency: body.currency === "KHR" ? "KHR" : "USD",
    debtDate: String(body.debtDate || ""),
    deadline: String(body.deadline || ""),
    note: String(body.note || "").trim(),
    image: String(body.image || ""),
    paid: Boolean(body.paid),
    paidAt: body.paidAt || null,
    createdAt: body.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function publicDebt(doc) {
  if (!doc) return null;
  return { ...doc, id: doc._id.toString(), _id: undefined };
}

function escapeHtml(value) {
  return String(value ?? "-").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function formatMoney(d) {
  const amount = Number(d.amount || 0);
  return d.currency === "USD"
    ? "$" + amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})
    : amount.toLocaleString() + "៛";
}
async function sendTelegramMessage(message) {
  if (!BOT_TOKEN || !CHAT_ID) return { success:false, error:"Telegram configuration missing" };
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({chat_id:CHAT_ID,text:message,parse_mode:"HTML"})
    });
    const result = await response.json();
    return result.ok ? {success:true} : {success:false,error:result.description,error_code:result.error_code};
  } catch (error) { return {success:false,error:error.message}; }
}
function messageFor(type,d) {
  const heads = {
    add:"💰 <b>NEW DEBT / បំណុលថ្មី</b>",
    update:"✏️ <b>DEBT UPDATED / បានកែប្រែបំណុល</b>",
    paid:"✅ <b>DEBT PAID / បានសងបំណុល</b>",
    delete:"🗑 <b>DEBT DELETED / បានលុបបំណុល</b>"
  };
  const states = {add:"UNPAID / មិនទាន់សង",update:"UPDATED / បានកែប្រែ",paid:"PAID / បានសង",delete:"DELETED / បានលុប"};
  return `${heads[type]}\n\n━━━━━━━━━━━━━━━━━━\n\n👤 <b>Name / ឈ្មោះ:</b>\n${escapeHtml(d.name)}\n\n📱 <b>Phone / លេខទូរស័ព្ទ:</b>\n${escapeHtml(d.phone)}\n\n💵 <b>Amount / ចំនួនទឹកប្រាក់:</b>\n${formatMoney(d)}\n\n💱 <b>Currency / រូបិយប័ណ្ណ:</b>\n${escapeHtml(d.currency)}\n\n📅 <b>Debt Date / ថ្ងៃជំពាក់:</b>\n${escapeHtml(d.debtDate)}\n\n⏰ <b>Deadline / ថ្ងៃកំណត់សង:</b>\n${escapeHtml(d.deadline)}\n\n📝 <b>Note / កំណត់ចំណាំ:</b>\n${escapeHtml(d.note)}\n\n<b>Status / ស្ថានភាព:</b>\n${states[type]}\n\n━━━━━━━━━━━━━━━━━━\n\n🗂 <b>DebtTrack KH</b>`;
}

router.get("/test-telegram", async (req,res) => {
  const telegram = await sendTelegramMessage("🤖 <b>DebtTrack KH</b>\n\n✅ Netlify Telegram is working!");
  res.status(telegram.success ? 200 : 500).json(telegram.success ? {success:true,message:"Telegram message sent successfully!"} : telegram);
});

router.get("/test-db", async (req,res) => {
  try { const database=await getDb(); await database.command({ping:1}); res.json({success:true,message:"MongoDB connected successfully!"}); }
  catch(error){ res.status(500).json({success:false,error:error.message}); }
});

router.get("/debts", async (req,res) => {
  try {
    const database=await getDb();
    const docs=await database.collection("debts").find({}).sort({createdAt:-1}).toArray();
    res.json({success:true,debts:docs.map(publicDebt)});
  } catch(error){ res.status(500).json({success:false,error:error.message}); }
});

router.post("/debt", async (req,res) => {
  try {
    const debt=cleanDebt(req.body);
    if(!debt.name || debt.amount<=0 || !debt.debtDate || !debt.deadline) return res.status(400).json({success:false,error:"Missing or invalid debt data"});
    const database=await getDb();
    const result=await database.collection("debts").insertOne(debt);
    const saved={...debt,_id:result.insertedId};
    const telegram=await sendTelegramMessage(messageFor("add",debt));
    res.status(201).json({success:true,debt:publicDebt(saved),telegram:telegram.success,telegramError:telegram.error||null});
  } catch(error){ res.status(500).json({success:false,error:error.message}); }
});

router.put("/debt/:id", async (req,res) => {
  try {
    if(!ObjectId.isValid(req.params.id)) return res.status(400).json({success:false,error:"Invalid debt ID"});
    const database=await getDb();
    const old=await database.collection("debts").findOne({_id:new ObjectId(req.params.id)});
    if(!old) return res.status(404).json({success:false,error:"Debt not found"});
    const debt=cleanDebt({...old,...req.body,createdAt:old.createdAt});
    await database.collection("debts").updateOne({_id:old._id},{$set:debt});
    const telegram=await sendTelegramMessage(messageFor("update",debt));
    res.json({success:true,debt:publicDebt({...debt,_id:old._id}),telegram:telegram.success,telegramError:telegram.error||null});
  } catch(error){ res.status(500).json({success:false,error:error.message}); }
});

router.patch("/debt/:id/paid", async (req,res) => {
  try {
    if(!ObjectId.isValid(req.params.id)) return res.status(400).json({success:false,error:"Invalid debt ID"});
    const database=await getDb(); const _id=new ObjectId(req.params.id);
    const old=await database.collection("debts").findOne({_id});
    if(!old) return res.status(404).json({success:false,error:"Debt not found"});
    const update={paid:true,paidAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    await database.collection("debts").updateOne({_id},{$set:update});
    const debt={...old,...update};
    const telegram=await sendTelegramMessage(messageFor("paid",debt));
    res.json({success:true,debt:publicDebt(debt),telegram:telegram.success,telegramError:telegram.error||null});
  } catch(error){ res.status(500).json({success:false,error:error.message}); }
});

router.delete("/debt/:id", async (req,res) => {
  try {
    if(!ObjectId.isValid(req.params.id)) return res.status(400).json({success:false,error:"Invalid debt ID"});
    const database=await getDb(); const _id=new ObjectId(req.params.id);
    const debt=await database.collection("debts").findOne({_id});
    if(!debt) return res.status(404).json({success:false,error:"Debt not found"});
    await database.collection("debts").deleteOne({_id});
    const telegram=await sendTelegramMessage(messageFor("delete",debt));
    res.json({success:true,telegram:telegram.success,telegramError:telegram.error||null});
  } catch(error){ res.status(500).json({success:false,error:error.message}); }
});

// Old notification-only endpoints kept for compatibility while deploying.
router.post("/update", async(req,res)=>{ const telegram=await sendTelegramMessage(messageFor("update",req.body)); res.json({success:true,telegram:telegram.success}); });
router.post("/paid", async(req,res)=>{ const telegram=await sendTelegramMessage(messageFor("paid",req.body)); res.json({success:true,telegram:telegram.success}); });
router.post("/delete", async(req,res)=>{ const telegram=await sendTelegramMessage(messageFor("delete",req.body)); res.json({success:true,telegram:telegram.success}); });

app.use("/api",router);
export const handler=serverless(app);
