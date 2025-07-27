document.addEventListener("DOMContentLoaded", () => {
  const joinZoomMeeting = async () => {
    const meetingSDKContainer = document.getElementById(
      "meeting-sdk-container"
    );
    if (!meetingSDKContainer) {
      console.error("Không có thẻ div, check lại đi");
      return;
    }

    const meetingConfig = {
      meetingNumber: "3723561392",
      passWord: "h4td8R",
      userName: "Học Viên " + Math.floor(Math.random() * 1000),
      userEmail: "",
      role: 0,
    };

    const SDK_KEY = "hxkZCuR0RKaKYjJFVNYiUA";

    try {
      console.log("Đang lấy SDK Token từ backend...");
      const response = await fetch("http://localhost:4000/api/zoom/sdk-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingNumber: meetingConfig.meetingNumber,
          role: meetingConfig.role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Lỗi khi lấy SDK Token từ server."
        );
      }

      const { sdkToken } = await response.json();
      console.log("Đã nhận SDK Token, đang khởi tạo Zoom...");
      ZoomMtg.setZoomJSLib("https://source.zoom.us/2.18.0/lib", "/av");
      ZoomMtg.preLoadWasm();
      ZoomMtg.prepareWebSDK();

      ZoomMtg.init({
        leaveUrl: window.location.origin + "/phonghocchitiet.html",
        isSupportAV: true,
        success: (initSuccess) => {
          console.log("Khởi tạo Zoom SDK thành công:", initSuccess);
          ZoomMtg.join({
            sdkKey: SDK_KEY,
            signature: sdkToken,
            meetingNumber: meetingConfig.meetingNumber,
            userName: meetingConfig.userName,
            passWord: meetingConfig.passWord,
            success: (joinSuccess) => {
              console.log("Tham gia phòng họp thành công:", joinSuccess);
            },
            error: (joinError) => {
              console.error("Lỗi khi tham gia phòng họp:", joinError);
            },
          });
        },
        error: (initError) => {
          console.error("Lỗi khi khởi tạo Zoom SDK:", initError);
        },
      });
    } catch (error) {
      console.error("Lỗi tổng thể trong quá trình tham gia Zoom:", error);
      meetingSDKContainer.innerHTML = `<p style="text-align:center; color:red;">Không thể tải phòng học. Lỗi: ${error.message}. Hãy kiểm tra lại Backend và Meeting ID.</p>`;
    }
  };

  joinZoomMeeting();

  const roomChatMessages = document.getElementById("room-chat-messages");
  const roomChatInput = document.getElementById("room-chat-input");
  const roomChatSendBtn = document.getElementById("room-chat-send-btn");

  function addMessageToRoomChat(message, senderClass, senderName = null) {
    if (!roomChatMessages) return;

    const messageContainer = document.createElement("div");
    messageContainer.classList.add("message", senderClass);

    const p = document.createElement("p");
    if (senderName && senderClass === "other-message") {
      const nameSpan = document.createElement("strong");
      nameSpan.textContent = senderName + ": ";
      p.appendChild(nameSpan);
    }
    p.appendChild(document.createTextNode(message));

    messageContainer.appendChild(p);
    roomChatMessages.appendChild(messageContainer);
    roomChatMessages.scrollTop = roomChatMessages.scrollHeight;
  }

  if (roomChatSendBtn && roomChatInput) {
    const sendMessage = () => {
      const messageText = roomChatInput.value.trim();
      if (messageText === "") return;

      addMessageToRoomChat(messageText, "user-message", "Bạn");
      roomChatInput.value = "";

      setTimeout(() => {
        addMessageToRoomChat(
          "Đợi backend rồi chat sau",
          "tin nhắn khác",
          "EduBot"
        );
      }, 1000);
    };

    roomChatSendBtn.addEventListener("click", sendMessage);
    roomChatInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
      }
    });
  }

  const roomTitleElement = document.getElementById("room-dynamic-title");
  const params = new URLSearchParams(window.location.search);
  const roomNameParam = params.get("name");
  if (roomTitleElement && roomNameParam) {
    roomTitleElement.textContent = decodeURIComponent(roomNameParam);
  } else if (roomTitleElement) {
    roomTitleElement.textContent = "Phòng học chung";
  }

  const participantListElement = document.getElementById(
    "room-participant-list"
  );
  const participantCountElement = document.getElementById("participant-count");
  const dummyParticipants = [
    "Nguyễn Văn A",
    "Hoàng Thị B",
    "Lê Văn C",
    "Lê Hoàng Đức Mạnh",
    "Bạn",
  ];

  if (participantListElement && participantCountElement) {
    participantListElement.innerHTML = "";
    dummyParticipants.forEach((name) => {
      const li = document.createElement("li");
      li.textContent = name;
      participantListElement.appendChild(li);
    });
    participantCountElement.textContent = dummyParticipants.length;
  }
});
