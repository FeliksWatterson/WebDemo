require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
const port = 4000;

process.env.ZOOM_SDK_KEY = "hxkZCuR0RKaKYjJFVNYiUA";
process.env.ZOOM_SDK_SECRET = "yk4kJ89xGsPO29Kz5k0oQfk6CNtnXORS";

app.use(express.json());
app.use(cors());

const KJUR = {};
KJUR.jws = {};
KJUR.jws.JWS = {};
KJUR.jws.JWS.sign = function (alg, spHeader, spPayload, key) {
  const sHeader = Buffer.from(spHeader).toString("base64url");
  const sPayload = Buffer.from(spPayload).toString("base64url");
  const sSign = crypto
    .createHmac("sha256", key)
    .update(`${sHeader}.${sPayload}`)
    .digest("base64url");
  return `${sHeader}.${sPayload}.${sSign}`;
};

app.post("/api/zoom/signature", (req, res) => {
  try {
    const iat = Math.round(new Date().getTime() / 1000) - 30;
    const exp = iat + 60 * 60 * 2;

    const oHeader = { alg: "HS256", typ: "JWT" };
    const oPayload = {
      sdkKey: process.env.ZOOM_SDK_KEY,
      mn: req.body.meetingNumber,
      role: req.body.role,
      iat: iat,
      exp: exp,
      appKey: process.env.ZOOM_SDK_KEY,
      tokenExp: exp,
    };

    const sHeader = JSON.stringify(oHeader);
    const sPayload = JSON.stringify(oPayload);
    const sdkJWT = KJUR.jws.JWS.sign(
      "HS256",
      sHeader,
      sPayload,
      process.env.ZOOM_SDK_SECRET
    );

    res.json({ signature: sdkJWT });
  } catch (error) {
    console.error("Lỗi tạo signature:", error);
    res.status(500).json({ message: "Lỗi phía server khi tạo Zoom signature" });
  }
});

app.listen(port, () =>
  console.log(`Backend Zoom đang chạy tại http://localhost:${port}`)
);
