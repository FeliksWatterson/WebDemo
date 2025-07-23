document.addEventListener("DOMContentLoaded", () => {
  // ---- PHẦN 1: TÍCH HỢP VÀ THAM GIA PHÒNG HỌP ZOOM ----
  const joinZoomMeeting = async () => {
    const meetingSDKContainer = document.getElementById(
      "meeting-sdk-container"
    );
    if (!meetingSDKContainer) {
      console.error("Lỗi: Không tìm thấy thẻ div 'meeting-sdk-container'.");
      return;
    }

    // Dữ liệu giả lập - SAU NÀY BẠN SẼ LẤY TỪ DATABASE
    const meetingConfig = {
      // !!! THAY THÔNG TIN PHÒNG HỌP CỦA BẠN VÀO ĐÂY !!!
      meetingNumber: "1234567890", // << THAY BẰNG MEETING ID CỦA BẠN
      passWord: "PASS", // << THAY BẰNG MẬT KHẨU PHÒNG
      userName: "Học Viên " + Math.floor(Math.random() * 1000),
      userEmail: "", // Email không bắt buộc
      role: 0, // Vai trò 0 là người tham gia
    };

    // SDK Key được lấy từ tài khoản Zoom của bạn
    const SDK_KEY = "hxkZCuR0RKaKYjJFVNYiUA";

    try {
      console.log("Đang lấy signature từ backend...");
      // 1. Gọi API backend để lấy signature
      const response = await fetch("http://localhost:4000/api/zoom/signature", {
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
          errorData.message || "Lỗi khi lấy signature từ server."
        );
      }

      const { signature } = await response.json();
      console.log("Đã nhận signature, đang khởi tạo Zoom...");

      // 2. Khởi tạo Zoom Meeting SDK
      ZoomMtg.setZoomJSLib("https://source.zoom.us/2.18.0/lib", "/av");
      ZoomMtg.preLoadWasm();
      ZoomMtg.prepareWebSDK();

      ZoomMtg.init({
        leaveUrl: window.location.origin + "/phonghoc.html", // Trang sẽ chuyển đến khi rời phòng
        isSupportAV: true,
        success: (initSuccess) => {
          console.log("Khởi tạo Zoom SDK thành công:", initSuccess);
          ZoomMtg.join({
            sdkKey: SDK_KEY,
            signature: signature,
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
      meetingSDKContainer.innerHTML = `<p style="text-align:center; color:red;">Không thể tải phòng học. Hãy chắc chắn rằng backend đang chạy và Meeting ID/Password chính xác.</p>`;
    }
  };

  // Tự động tham gia phòng họp khi trang được tải
  joinZoomMeeting();

  // ---- PHẦN 2: QUẢN LÝ CHAT, TÊN PHÒNG VÀ NGƯỜI THAM GIA ----
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

      addMessageToRoomChat(messageText, "user-message", "Bạn"); // Gửi tin nhắn của bạn
      roomChatInput.value = "";

      // Giả lập bot trả lời
      setTimeout(() => {
        addMessageToRoomChat(
          "Tính năng chat sẽ được kết nối với backend sau nhé!",
          "other-message",
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

  // Cập nhật tên phòng học từ URL
  const roomTitleElement = document.getElementById("room-dynamic-title");
  const params = new URLSearchParams(window.location.search);
  const roomNameParam = params.get("name");
  if (roomTitleElement && roomNameParam) {
    roomTitleElement.textContent = decodeURIComponent(roomNameParam);
  } else if (roomTitleElement) {
    roomTitleElement.textContent = "Phòng học chung";
  }

  // Hiển thị danh sách người tham gia (dữ liệu giả)
  const participantListElement = document.getElementById(
    "room-participant-list"
  );
  const participantCountElement = document.getElementById("participant-count");
  const dummyParticipants = [
    "Nguyễn Văn A",
    "Trần Thị B",
    "Lê Văn C",
    "Phạm Thị D",
    "Hoàng Minh H",
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

  // Tin nhắn chào mừng ban đầu
  addMessageToRoomChat(
    "Chào mừng mọi người đến với phòng học!",
    "other-message",
    "EduBot"
  );
});
