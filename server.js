// server.js
const express = require("express");
const path = require("path");
const app = express();
const PORT = 3000;

// Bộ nhớ tạm thời trên RAM của Server để lưu tên người dùng (Đây chính là tính năng động!)
let userDatabase = [];

// Cấu hình bắt buộc để Node.js đọc được dữ liệu dạng JSON từ Frontend gửi lên
app.use(express.json());

// Cho phép Node.js phục vụ các file tĩnh (HTML, CSS, JS) cùng thư mục
app.use(express.static(__dirname));

// 1. Định tuyến (Route) để hiển thị trang chủ khi vào http://localhost:3000
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 2. API Động: Lắng nghe yêu cầu xử lý dữ liệu từ file script.js gửi lên
app.post("/api/submit-name", (req, res) => {
  const clientName = req.body.name; // Lấy cái tên người dùng nhập từ Frontend

  // Xử lý logic ngầm ở Backend: Lưu vào danh sách
  userDatabase.push(clientName);
  console.log(`[Server] Đã lưu thành công người dùng mới: ${clientName}`);
  console.log(`[Server] Danh sách hiện tại:`, userDatabase);

  // Trả về một phản hồi động tùy biến theo tên họ vừa nhập
  res.json({
    success: true,
    message: `Xin chào ${clientName}! Hệ thống Node.js đã ghi nhận bạn là thành viên thứ ${userDatabase.length} trên hệ thống.`,
  });
});

// Khởi chạy Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`Server web động đang chạy tại: http://localhost:${PORT}`);
  console.log(`Bấm Ctrl + C trong terminal này nếu muốn dừng server.`);
  console.log(`====================================================`);
});
