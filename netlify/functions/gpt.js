// netlify/functions/gpt.js
// (Nếu bạn dùng dotenv cho local dev, hãy require nó ở đây. Khi deploy, Netlify sẽ dùng biến môi trường từ UI)
// require('dotenv').config(); // Bỏ comment nếu cần cho local dev. Với Netlify, biến môi trường được set trên UI.

// KHÔNG dùng: const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Sử dụng dynamic import để tải node-fetch
  // node-fetch từ v3 là ESM, nên cần import kiểu này trong môi trường CommonJS
  const { default: fetch } = await import("node-fetch");

  // Netlify Functions nhận event và context.
  // Thông tin request thường nằm trong event.
  // Chỉ cho phép phương thức POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  const userMessage = requestBody.message;

  if (!userMessage) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Message is required" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  const apiKey = process.env.CHATGPT_API_KEY;
  const apiEndpoint =
    process.env.OPENAI_API_ENDPOINT ||
    "https://api.openai.com/v1/chat/completions";

  if (!apiKey) {
    console.error(
      "CHATGPT_API_KEY is not configured in environment variables."
    );
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Server configuration error: Missing API Key.",
      }),
      headers: { "Content-Type": "application/json" },
    };
  }

  try {
    const requestBodyToOpenAI = {
      model: "gpt-3.5-turbo", // Hoặc model bạn muốn
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: userMessage },
      ],
    };

    const openaiResponse = await fetch(apiEndpoint, {
      // fetch giờ đã được import đúng cách
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBodyToOpenAI),
    });

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      console.error("OpenAI API Error:", data);
      return {
        statusCode: openaiResponse.status,
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      };
    }

    const botReply =
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content;

    if (botReply) {
      return {
        statusCode: 200,
        body: JSON.stringify({ reply: botReply }),
        headers: { "Content-Type": "application/json" },
      };
    } else {
      console.error("Unexpected response structure from OpenAI:", data);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Failed to parse response from AI service.",
        }),
        headers: { "Content-Type": "application/json" },
      };
    }
  } catch (error) {
    console.error("Error calling OpenAI or processing its response:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to communicate with AI service or process its response.",
      }),
      headers: { "Content-Type": "application/json" },
    };
  }
};
