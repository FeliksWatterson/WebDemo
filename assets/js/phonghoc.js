document.addEventListener("DOMContentLoaded", () => {
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
    roomChatSendBtn.addEventListener("click", () => {
      const messageText = roomChatInput.value.trim();
      if (messageText === "") return;

      addMessageToRoomChat(messageText, "user-message");
      roomChatInput.value = "";

      setTimeout(() => {
        addMessageToRoomChat(
          "Chưa có backend má ơi",
          "other-message",
          "Đức Mạnh"
        );
      }, 1200);
    });

    roomChatInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        roomChatSendBtn.click();
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
  const initialMessages = [
    {
      text: "Chào mừng mọi người đến với phòng học!",
      senderClass: "other-message",
      senderName: "EduBot",
    },
  ];
  const dummyParticipants = [
    "Nguyễn Văn A",
    "Trần Thị B",
    "Lê Văn C",
    "Phạm Thị D",
    "Hoàng Minh H",
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

  if (typeof initialMessages !== "undefined" && initialMessages.length > 0) {
    initialMessages.forEach((msg) => {
      addMessageToRoomChat(msg.text, msg.senderClass, msg.senderName);
    });
  }
});
