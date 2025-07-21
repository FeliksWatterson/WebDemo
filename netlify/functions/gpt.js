exports.handler = async (event, context) => {
  const { default: fetch } = await import("node-fetch");

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
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: userMessage },
      ],
    };

    const openaiResponse = await fetch(apiEndpoint, {
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
