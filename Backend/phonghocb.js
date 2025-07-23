require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const port = 4000;

app.use(express.json());
app.use(cors());

const MEETING_SDK_KEY = process.env.MEETING_SDK_KEY;
const MEETING_SDK_SECRET = process.env.MEETING_SDK_SECRET;

app.post("/api/zoom/signature", (req, res) => {
  try {
    const { meetingNumber, role } = req.body;

    if (!meetingNumber) {
      return res.status(400).json({ message: "Thiếu meetingNumber" });
    }

    const iat = Math.round(new Date().getTime() / 1000) - 30;
    const exp = iat + 60 * 60 * 2;

    const payload = {
      sdkKey: MEETING_SDK_KEY,
      mn: meetingNumber,
      role: role,
      iat: iat,
      exp: exp,
      appKey: MEETING_SDK_KEY,
      tokenExp: iat + 60 * 60 * 2,
    };

    const signature = jwt.sign(payload, MEETING_SDK_SECRET, {
      algorithm: "HS256",
      header: { alg: "HS256", typ: "JWT" },
    });

    res.json({ signature: signature });
  } catch (error) {
    console.error("Lỗi tạo signature:", error);
    res.status(500).json({ message: "Lỗi phía server khi tạo signature" });
  }
});

app.listen(port, () =>
  console.log(`Backend Zoom đang chạy tại http://localhost:${port}`)
);
