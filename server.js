require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const fetch = require("node-fetch");
const timeout = require("connect-timeout");
const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());
app.use(express.static("Frontend"));

const upload = multer({ dest: "uploads/" });

if (!process.env.GEMINI_API_KEY) {
  console.error("Lỗi: Không tìm thấy GEMINI_API_KEY trong tệp .env");
  process.exit(1);
}

async function generateQuestionsFromText(textContent) {
  const API_KEY = process.env.GEMINI_API_KEY;
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
  const prompt = `Dựa vào nội dung văn bản dưới đây, hãy tạo ra một danh sách các câu hỏi trắc nghiệm. Văn bản: "${textContent.substring(
    0,
    30000
  )}" Yêu cầu: 1. Chỉ trích xuất các câu hỏi trắc nghiệm có sẵn. 2. Mỗi câu hỏi phải có 4 lựa chọn (A, B, C, D). 3. Xác định đáp án đúng. 4. Trả về kết quả dưới dạng một chuỗi JSON hợp lệ là một MẢNG các đối tượng. Tuyệt đối không thêm văn bản giải thích nào khác. 5. Cấu trúc mỗi đối tượng: {"question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "A"}. 6. Nếu không có câu hỏi, trả về một mảng rỗng [].`;
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
    throw new Error("Lỗi khi giao tiếp với AI API.");
  }
  const data = await response.json();
  try {
    if (!data.candidates || data.candidates.length === 0) {
      if (data.promptFeedback?.blockReason) {
        throw new Error(
          `AI đã chặn yêu cầu vì lý do: ${data.promptFeedback.blockReason}`
        );
      }
      throw new Error("AI không trả về kết quả.");
    }
    const aiResponseText = data.candidates[0].content.parts[0].text;
    const cleanedJsonString = aiResponseText.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanedJsonString);
  } catch (e) {
    console.error("Lỗi phân tích JSON từ AI:", e.message);
    throw new Error("AI đã trả về dữ liệu không đúng định dạng JSON.");
  }
}

app.post(
  "/api/quiz/generate-from-file",
  timeout("5m"),
  upload.single("quizFile"),
  async (req, res) => {
    if (req.timedout) {
      console.error("Yêu cầu đã hết thời gian chờ!");
      return;
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Không có tệp nào được tải lên." });
    }

    try {
      let textContent = "";
      if (req.file.mimetype === "application/pdf") {
        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await pdfParse(dataBuffer);
        textContent = data.text;
      } else if (req.file.mimetype === "text/plain") {
        textContent = fs.readFileSync(req.file.path, "utf8");
      } else {
        throw new Error("Định dạng tệp không được hỗ trợ.");
      }

      console.log("Đang gửi văn bản đến AI (có thể mất vài phút)...");
      const questions = await generateQuestionsFromText(textContent);
      console.log("Đã nhận câu hỏi từ AI.");

      res.json(questions);
    } catch (error) {
      console.error("Lỗi trên server:", error.message);
      res
        .status(500)
        .json({ message: error.message || "Lỗi từ phía máy chủ." });
    } finally {
      fs.unlinkSync(req.file.path);
    }
  }
);

app.listen(PORT, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${PORT}`);
});
