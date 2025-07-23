// /assets/js/zoom-integration.js (Frontend Client)

// 1. Cấu hình thông tin cơ bản
const a = document.createElement("a");
a.href = window.location.href;

const meetingConfig = {
  meetingNumber: new URLSearchParams(a.search).get("mn") || "123456789", // Lấy meeting number từ URL hoặc dùng mặc định
  userName: "Tên Người Dùng", // Thay bằng tên người dùng thực tế
  userEmail: "email@example.com", // Thay bằng email người dùng
  passWord: new URLSearchParams(a.search).get("pwd") || "", // Mật khẩu của phòng học nếu có
  role: 0, // 0 cho người tham gia, 1 cho host
};

const ZOOM_SDK_KEY = "hxkZCuR0RKaKYjJFVNYiUA"; // API Key phía client là an toàn
const BACKEND_SIGNATURE_ENDPOINT = "http://localhost:4000/api/zoom/signature";

// 2. Hàm gọi API để lấy chữ ký từ backend
async function getSignature() {
  try {
    const response = await fetch(BACKEND_SIGNATURE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        meetingNumber: meetingConfig.meetingNumber,
        role: meetingConfig.role,
      }),
    });

    if (!response.ok) {
      throw new Error("Không thể lấy chữ ký từ server.");
    }

    const data = await response.json();
    return data.signature;
  } catch (error) {
    console.error("Lỗi getSignature:", error);
  }
}

// 3. Hàm để bắt đầu buổi học Zoom
async function startMeeting() {
  const meetingSDKElement = document.getElementById("meeting-sdk-container");
  if (!meetingSDKElement) {
    console.error("Không tìm thấy phần tử 'meeting-sdk-container'");
    return;
  }

  const signature = await getSignature();
  if (!signature) {
    console.error("Không có chữ ký, không thể bắt đầu buổi học.");
    return;
  }

  ZoomMtg.setZoomJSLib("https://source.zoom.us/2.18.0/lib", "/av");
  ZoomMtg.preLoadWasm();
  ZoomMtg.prepareWebSDK();

  ZoomMtg.init({
    leaveUrl: a.origin + "/phonghoc.html", // URL để quay lại sau khi rời phòng
    success: (success) => {
      console.log("Khởi tạo Zoom SDK thành công:", success);
      ZoomMtg.join({
        sdkKey: ZOOM_SDK_KEY,
        signature: signature,
        meetingNumber: meetingConfig.meetingNumber,
        userName: meetingConfig.userName,
        userEmail: meetingConfig.userEmail,
        passWord: meetingConfig.passWord,
        success: (joinSuccess) => {
          console.log("Tham gia phòng học thành công", joinSuccess);
        },
        error: (joinError) => {
          console.error("Lỗi khi tham gia phòng học:", joinError);
        },
      });
    },
    error: (initError) => {
      console.error("Lỗi khởi tạo Zoom SDK:", initError);
    },
  });
}

// 4. Chạy hàm khi trang được tải xong
document.addEventListener("DOMContentLoaded", () => {
  startMeeting();
});
