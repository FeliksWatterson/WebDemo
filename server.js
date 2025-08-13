require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const fetch = require("node-fetch");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 4000;

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    console.log(`[API] ${req.method} ${req.originalUrl}`);
  }
  next();
});

if (!process.env.GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY in .env");
  process.exit(1);
}

const MONGO_URI = process.env.MONGODB_URI;
const MONGO_DB = process.env.MONGODB_DB || "eduweb";
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

mongoose
  .connect(MONGO_URI, { dbName: MONGO_DB })
  .then(() => console.log("MongoDB connected"))
  .catch((e) => {
    console.error("MongoDB connect error:", e.message);
    process.exit(1);
  });

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, index: true },
  password: String,
  createdAt: { type: Date, default: Date.now },
});

const vocabSchema = new mongoose.Schema({
  uid: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  vocabulary: [
    {
      word: String,
      meaning: String,
    },
  ],
  updatedAt: { type: Date, default: Date.now },
});

const progressSchema = new mongoose.Schema({
  uid: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  stats: {
    total: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    wrong: { type: Number, default: 0 },
    lastAt: { type: Date, default: Date.now },
  },
  updatedAt: { type: Date, default: Date.now },
});

const testSchema = new mongoose.Schema({
  uid: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  name: String,
  timeLimit: Number,
  questions: [
    {
      text: String,
      options: [String],
      answer: String,
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Vocab = mongoose.model("Vocab", vocabSchema);
const Progress = mongoose.model("Progress", progressSchema);
const Test = mongoose.model("Test", testSchema);

const roomSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  name: { type: String, required: true },
  joinCode: { type: String, unique: true, index: true },
  members: [
    {
      uid: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      email: String,
      joinedAt: { type: Date, default: Date.now },
    },
  ],
  assignments: [
    {
      testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test" },
      name: String,
      timeLimit: Number,
      assignedAt: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
const Room = mongoose.model("Room", roomSchema);

async function genJoinCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let tries = 0; tries < 10; tries++) {
    let code = "";
    for (let i = 0; i < 6; i++)
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    const exists = await Room.findOne({ joinCode: code }).lean();
    if (!exists) return code;
  }
  return "ROOM" + Date.now().toString(36).slice(-6).toUpperCase();
}

function signToken(user) {
  return jwt.sign({ uid: user._id, email: user.email }, JWT_SECRET, {
    expiresIn: "30d",
  });
}
function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "Missing email or password" });
  try {
    const exists = await User.findOne({
      email: String(email).toLowerCase(),
    }).lean();
    if (exists)
      return res.status(409).json({ error: "Email already registered" });
    const hash = await bcrypt.hash(password, 10);
    const u = await User.create({
      email: String(email).toLowerCase(),
      password: hash,
    });
    const token = signToken(u);
    res.json({ token, user: { id: u._id, email: u.email } });
  } catch {
    res.status(500).json({ error: "Register failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "Missing email or password" });
  const u = await User.findOne({ email: String(email).toLowerCase() });
  if (!u) return res.status(401).json({ error: "Invalid email or password" });
  const ok = await bcrypt.compare(password, u.password);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });
  const token = signToken(u);
  res.json({ token, user: { id: u._id, email: u.email } });
});

app.get("/api/me", auth, async (req, res) => {
  const u = await User.findById(req.user.uid).lean();
  if (!u) return res.status(401).json({ error: "Unauthorized" });
  res.json({ id: u._id, email: u.email });
});

app.get("/api/vocab", auth, async (req, res) => {
  const doc = await Vocab.findOne({ uid: req.user.uid }).lean();
  res.json({ vocabulary: doc?.vocabulary || [] });
});

app.post("/api/vocab", auth, async (req, res) => {
  let vocabulary = Array.isArray(req.body?.vocabulary)
    ? req.body.vocabulary
    : [];
  vocabulary = vocabulary
    .map((v) => ({
      word: String(v.word || "").trim(),
      meaning: String(v.meaning || "").trim(),
    }))
    .filter((v) => v.word && v.meaning);

  if (!vocabulary.length)
    return res.status(400).json({ error: "Empty vocabulary" });

  const existing = await Vocab.findOne({ uid: req.user.uid });
  if (!existing) {
    const doc = await Vocab.create({
      uid: req.user.uid,
      vocabulary,
      updatedAt: new Date(),
    });
    return res.json({ vocabulary: doc.vocabulary });
  } else {
    existing.vocabulary = vocabulary;
    existing.updatedAt = new Date();
    await existing.save();
    return res.json({ vocabulary: existing.vocabulary });
  }
});

app.patch("/api/vocab/merge", auth, async (req, res) => {
  const incoming = Array.isArray(req.body?.vocabulary)
    ? req.body.vocabulary
    : [];
  const cleanIn = incoming
    .map((v) => ({
      word: String(v.word || "").trim(),
      meaning: String(v.meaning || "").trim(),
    }))
    .filter((v) => v.word && v.meaning);

  const existing = await Vocab.findOne({ uid: req.user.uid });
  const base = existing?.vocabulary || [];
  const map = new Map();
  for (const it of base)
    map.set((it.word + "||" + it.meaning).toLowerCase(), it);
  for (const it of cleanIn)
    map.set((it.word + "||" + it.meaning).toLowerCase(), it);
  const merged = Array.from(map.values());

  if (!existing) {
    const doc = await Vocab.create({
      uid: req.user.uid,
      vocabulary: merged,
      updatedAt: new Date(),
    });
    return res.json({ vocabulary: doc.vocabulary });
  } else {
    existing.vocabulary = merged;
    existing.updatedAt = new Date();
    await existing.save();
    return res.json({ vocabulary: existing.vocabulary });
  }
});

app.get("/api/progress", auth, async (req, res) => {
  const p = await Progress.findOne({ uid: req.user.uid }).lean();
  res.json({
    stats: p?.stats || { total: 0, correct: 0, wrong: 0, lastAt: new Date() },
  });
});

app.patch("/api/progress", auth, async (req, res) => {
  const inc = req.body?.stats || {};
  const p =
    (await Progress.findOne({ uid: req.user.uid })) ||
    new Progress({ uid: req.user.uid });
  p.stats.total = Number(inc.total ?? p.stats.total ?? 0);
  p.stats.correct = Number(inc.correct ?? p.stats.correct ?? 0);
  p.stats.wrong = Number(inc.wrong ?? p.stats.wrong ?? 0);
  p.stats.lastAt = new Date();
  p.updatedAt = new Date();
  await p.save();
  res.json({ ok: true, stats: p.stats });
});

app.post("/api/tests", auth, async (req, res) => {
  const { name, timeLimit, questions } = req.body || {};
  const t = await Test.create({
    uid: req.user.uid,
    name: String(name || "Bộ đề"),
    timeLimit: Number(timeLimit || 0),
    questions: Array.isArray(questions) ? questions : [],
    updatedAt: new Date(),
  });
  res.json({ id: t._id });
});

app.get("/api/tests", auth, async (req, res) => {
  const list = await Test.find({ uid: req.user.uid })
    .select("_id name timeLimit createdAt updatedAt")
    .sort({ updatedAt: -1 })
    .lean();
  res.json({ items: list });
});

app.get("/api/tests/:id", auth, async (req, res) => {
  const t = await Test.findOne({
    _id: req.params.id,
    uid: req.user.uid,
  }).lean();
  if (!t) return res.status(404).json({ error: "Not found" });
  res.json(t);
});

app.delete("/api/tests/:id", auth, async (req, res) => {
  await Test.deleteOne({ _id: req.params.id, uid: req.user.uid });
  res.json({ ok: true });
});

app.post("/api/rooms", auth, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) return res.status(400).json({ error: "Thiếu tên phòng" });

  const owner = await User.findById(req.user.uid)
    .lean()
    .catch(() => null);
  const email = owner?.email || req.user?.email || "";
  if (!email) return res.status(401).json({ error: "Unauthorized" });

  const joinCode = await genJoinCode();

  const room = await Room.create({
    owner: req.user.uid,
    name,
    joinCode,
    members: [{ uid: req.user.uid, email }],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  res.json({ id: room._id, name: room.name, joinCode: room.joinCode });
});

app.post("/api/rooms/join", auth, async (req, res) => {
  const joinCode = String(req.body?.joinCode || "")
    .trim()
    .toUpperCase();
  if (!joinCode) return res.status(400).json({ error: "Thiếu mã phòng" });

  const room = await Room.findOne({ joinCode }).exec();
  if (!room) return res.status(404).json({ error: "Không tìm thấy phòng" });

  const me = await User.findById(req.user.uid).lean();
  const has = room.members.some((m) => String(m.uid) === String(req.user.uid));
  if (!has) {
    room.members.push({ uid: req.user.uid, email: me?.email || "" });
    room.updatedAt = new Date();
    await room.save();
  }

  res.json({ id: room._id, name: room.name, joinCode: room.joinCode });
});

app.get("/api/rooms", auth, async (req, res) => {
  const myId = new mongoose.Types.ObjectId(req.user.uid);
  const rooms = await Room.find({
    $or: [{ owner: myId }, { "members.uid": myId }],
  })
    .select("_id name joinCode owner createdAt updatedAt")
    .sort({ updatedAt: -1 })
    .lean();

  res.json({ items: rooms });
});

app.get("/api/rooms/:id", auth, async (req, res) => {
  const r = await Room.findById(req.params.id).lean();
  if (!r) return res.status(404).json({ error: "Not found" });

  const isMember =
    String(r.owner) === String(req.user.uid) ||
    r.members.some((m) => String(m.uid) === String(req.user.uid));
  if (!isMember) return res.status(403).json({ error: "Forbidden" });

  res.json({
    id: r._id,
    name: r.name,
    joinCode: r.joinCode,
    owner: r.owner,
    members: r.members,
    assignments: r.assignments,
  });
});

app.post("/api/rooms/:id/assign", auth, async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ error: "Not found" });
  if (String(room.owner) !== String(req.user.uid))
    return res.status(403).json({ error: "Only owner can assign" });

  const testId = String(req.body?.testId || "").trim();
  if (!testId) return res.status(400).json({ error: "Thiếu testId" });

  const t = await Test.findOne({ _id: testId, uid: req.user.uid }).lean();
  if (!t) return res.status(404).json({ error: "Không tìm thấy đề" });

  const exists = room.assignments.some(
    (a) => String(a.testId) === String(testId)
  );
  if (!exists) {
    room.assignments.unshift({
      testId: t._id,
      name: t.name,
      timeLimit: t.timeLimit || 0,
      assignedAt: new Date(),
    });
    room.updatedAt = new Date();
    await room.save();
  }

  res.json({ ok: true, assignments: room.assignments });
});

app.get("/api/rooms/:id/tests", auth, async (req, res) => {
  const r = await Room.findById(req.params.id).lean();
  if (!r) return res.status(404).json({ error: "Not found" });
  const isMember =
    String(r.owner) === String(req.user.uid) ||
    r.members.some((m) => String(m.uid) === String(req.user.uid));
  if (!isMember) return res.status(403).json({ error: "Forbidden" });
  const items = (r.assignments || []).map((a) => ({
    id: a.testId,
    name: a.name,
    timeLimit: a.timeLimit || 0,
  }));
  res.json({ items });
});

app.get("/api/rooms/:id/tests/:testId", auth, async (req, res) => {
  const room = await Room.findById(req.params.id).lean();
  if (!room) return res.status(404).json({ error: "Not found" });
  const isMember =
    String(room.owner) === String(req.user.uid) ||
    room.members.some((m) => String(m.uid) === String(req.user.uid));
  if (!isMember) return res.status(403).json({ error: "Forbidden" });

  const allowed = room.assignments.some(
    (a) => String(a.testId) === String(req.params.testId)
  );
  if (!allowed) return res.status(404).json({ error: "Not found" });

  const t = await Test.findById(req.params.testId).lean();
  if (!t) return res.status(404).json({ error: "Not found" });

  res.json({
    id: t._id,
    name: t.name,
    timeLimit: t.timeLimit || 0,
    questions: t.questions || [],
  });
});

app.post("/api/rooms/:id/leave", auth, async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ error: "Not found" });
  if (String(room.owner) === String(req.user.uid))
    return res.status(400).json({
      error: "Chủ phòng không thể rời. Hãy chuyển chủ hoặc xoá phòng.",
    });

  room.members = room.members.filter(
    (m) => String(m.uid) !== String(req.user.uid)
  );
  room.updatedAt = new Date();
  await room.save();

  res.json({ ok: true });
});

app.delete("/api/rooms/:id", auth, async (req, res) => {
  const room = await Room.findById(req.params.id).lean();
  if (!room) return res.status(404).json({ error: "Not found" });
  if (String(room.owner) !== String(req.user.uid))
    return res.status(403).json({ error: "Only owner can delete" });

  await Room.deleteOne({ _id: room._id });
  res.json({ ok: true });
});

const upload = multer({ dest: uploadsDir });

async function generateQuestionsFromChunk(textChunk) {
  const API_KEY = process.env.GEMINI_API_KEY;
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
  const prompt = `Dựa vào nội dung văn bản dưới đây, hãy tạo ra một danh sách các câu hỏi trắc nghiệm. Văn bản: "${textChunk}" Yêu cầu: 1. Chỉ trích xuất các câu hỏi trắc nghiệm có sẵn. 2. Mỗi câu hỏi phải có 4 lựa chọn (A, B, C, D). 3. Xác định đáp án đúng. 4. Trả về kết quả dưới dạng một chuỗi JSON hợp lệ là một MẢNG các đối tượng. Tuyệt đối không thêm văn bản giải thích nào khác. 5. Cấu trúc mỗi đối tượng: {"question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "A"}. 6. Nếu không có câu hỏi, trả về một mảng rỗng [].`;
  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 8192 },
  };
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  if (!response.ok) throw new Error("Lỗi khi gọi đến AI API.");
  const data = await response.json();
  if (!data.candidates || data.candidates.length === 0) return [];
  const aiResponseText = data.candidates[0].content.parts[0].text;
  const cleanedJsonString = aiResponseText.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleanedJsonString);
  } catch {
    return [];
  }
}

app.post("/api/quiz/upload", upload.single("quizFile"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Không có tệp nào." });
  const taskId = uuidv4();
  fs.renameSync(req.file.path, path.join(uploadsDir, `${taskId}.pdf`));
  res.json({ taskId });
});

app.get("/api/quiz/progress/:taskId", async (req, res) => {
  const taskId = req.params.taskId;
  const filePath = path.join(uploadsDir, `${taskId}.pdf`);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const sendProgress = (progress, message) => {
    res.write(`data: ${JSON.stringify({ progress, message })}\n\n`);
  };

  try {
    sendProgress(10, "Đã nhận yêu cầu, bắt đầu phân tích tệp PDF...");
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    const textContent = data.text;
    sendProgress(30, "Đã phân tích xong tệp. Chuẩn bị gửi đến AI...");

    const chunkSize = 15000;
    const textChunks = [];
    for (let i = 0; i < textContent.length; i += chunkSize) {
      textChunks.push(textContent.substring(i, i + chunkSize));
    }

    let allQuestions = [];
    for (let i = 0; i < textChunks.length; i++) {
      const progress = 30 + Math.round((i / textChunks.length) * 60);
      sendProgress(
        progress,
        `Đang xử lý phần ${i + 1}/${textChunks.length}...`
      );
      const questions = await generateQuestionsFromChunk(textChunks[i]);
      allQuestions.push(...questions);
    }

    sendProgress(95, "Đã xử lý xong. Đang tổng hợp kết quả...");
    res.write(`event: done\ndata: ${JSON.stringify(allQuestions)}\n\n`);
  } catch (error) {
    res.write(
      `event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`
    );
  } finally {
    res.end();
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt)
    return res
      .status(400)
      .json({ message: "Vui lòng nhập nội dung tin nhắn." });

  try {
    const API_KEY = process.env.GEMINI_API_KEY;
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
    const requestBody = { contents: [{ parts: [{ text: prompt }] }] };
    const apiResponse = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      throw new Error(
        errorData.error?.message || "Lỗi không xác định từ API của Google"
      );
    }
    const data = await apiResponse.json();
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
      const botReply = data.candidates[0].content.parts[0].text;
      res.json({ reply: botReply });
    } else {
      throw new Error("AI phản hồi không hợp lệ.");
    }
  } catch (error) {
    res.status(500).json({ message: error.message || "Lỗi từ phía máy chủ." });
  }
});

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

const STATIC_DIR = path.join(__dirname, "Frontend");
app.use(express.static(STATIC_DIR));
app.get("/", (_, res) => res.sendFile(path.join(STATIC_DIR, "index.html")));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
