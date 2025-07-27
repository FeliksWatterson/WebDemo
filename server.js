require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const fetch = require("node-fetch");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
const PORT = 4000;

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log("Đã tạo thư mục 'uploads'.");
}

app.use(cors());
app.use(express.static("Frontend"));
app.use(express.json());
const upload = multer({ dest: uploadsDir });

if (!process.env.GEMINI_API_KEY) {
  console.error("LỖI: Vui lòng tạo file .env và cung cấp GEMINI_API_KEY.");
  process.exit(1);
}

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
  if (!response.ok) {
    throw new Error("Lỗi khi gọi đến AI API.");
  }
  const data = await response.json();
  if (!data.candidates || data.candidates.length === 0) {
    return [];
  }
  const aiResponseText = data.candidates[0].content.parts[0].text;
  const cleanedJsonString = aiResponseText.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleanedJsonString);
  } catch {
    return [];
  }
}

app.post("/api/quiz/upload", upload.single("quizFile"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Không có tệp nào." });
  }
  const taskId = uuidv4();
  fs.renameSync(req.file.path, path.join(uploadsDir, `${taskId}.pdf`));
  res.json({ taskId: taskId });
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
    console.error("Lỗi trong quá trình xử lý:", error);
    res.write(
      `event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`
    );
  } finally {
    res.end();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});
app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res
      .status(400)
      .json({ message: "Vui lòng nhập nội dung tin nhắn." });
  }

  try {
    const API_KEY = process.env.GEMINI_API_KEY;
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
    };

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
    console.error("Lỗi khi gọi API chat:", error.message);
    res.status(500).json({ message: error.message || "Lỗi từ phía máy chủ." });
  }
});
app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
});
