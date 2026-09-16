// ============================================================
// IMAGE EDITOR - BẢN SỬA LẠI
// Giữ nguyên các ID HTML hiện tại:
// canvas1, canvas2, imageInput, removeWhiteBG,
// edit, unSharpMask, start, downLoadLink,
// submit-btn, username, response-message
// ============================================================

const canvas = document.getElementById("canvas1");
const ctx = canvas.getContext("2d", {
  willReadFrequently: true,
});

const newCanVas = document.getElementById("canvas2");
const ctxNew = newCanVas.getContext("2d", {
  willReadFrequently: true,
});

const imageInput = document.getElementById("imageInput");

const removeWhiteBG_button = document.getElementById("removeWhiteBG");

const editButton = document.getElementById("edit");

const unSharpMask_button = document.getElementById("unSharpMask");

const startButton = document.getElementById("start");

const downLoadLink = document.getElementById("downLoadLink");

const button = document.getElementById("submit-btn");

const input = document.getElementById("username");

const messageBox = document.getElementById("response-message");

// ============================================================
// STATE
// ============================================================

let imageResult = null;
let choose = null;

let imgWidth = 0;
let imgHeight = 0;
let displayScale = 1;

// ============================================================
// SUBMIT NAME
// Giữ lại chức năng cũ
// ============================================================

if (button) {
  button.addEventListener("click", async () => {
    const nameInput = input.value.trim();

    if (!nameInput) {
      alert("Vui lòng nhập tên trước khi gửi!");
      return;
    }

    try {
      const response = await fetch("/api/submit-name", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: nameInput,
        }),
      });

      const result = await response.json();

      if (messageBox) {
        messageBox.innerText = result.message;
      }
    } catch (error) {
      console.error("Lỗi khi kết nối với server:", error);

      if (messageBox) {
        messageBox.innerText = "Không thể kết nối đến Server.";
      }
    }
  });
}

// ============================================================
// LOAD IMAGE
// ============================================================

imageInput.addEventListener("change", function (e) {
  const file = e.target.files?.[0];

  if (!file) {
    return;
  }

  // Reset
  imageResult = null;
  choose = null;

  downLoadLink.style.display = "none";
  newCanVas.style.display = "none";

  const reader = new FileReader();

  reader.onload = function (event) {
    const img = new Image();

    img.onload = function () {
      imageResult = img;

      imgWidth = img.naturalWidth;
      imgHeight = img.naturalHeight;

      // --------------------------------------------------------
      // CANVAS HIỂN THỊ
      // Chỉ dùng để preview.
      // Không dùng canvas1 để xử lý ảnh.
      // --------------------------------------------------------

      const maxDisplaySize = Math.min(window.innerWidth * 0.6, 700);

      displayScale = Math.min(
        maxDisplaySize / imgWidth,
        maxDisplaySize / imgHeight,
        1,
      );

      canvas.width = Math.max(1, Math.round(imgWidth * displayScale));

      canvas.height = Math.max(1, Math.round(imgHeight * displayScale));

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.style.display = "block";

      // --------------------------------------------------------
      // CANVAS XỬ LÝ
      // LUÔN giữ nguyên kích thước ảnh gốc.
      // --------------------------------------------------------

      newCanVas.width = imgWidth;
      newCanVas.height = imgHeight;

      ctxNew.clearRect(0, 0, imgWidth, imgHeight);

      ctxNew.imageSmoothingEnabled = false;

      ctxNew.drawImage(img, 0, 0, imgWidth, imgHeight);
    };

    img.onerror = function () {
      alert("Không thể đọc ảnh này.");
    };

    img.src = event.target.result;
  };

  reader.readAsDataURL(file);
});

// ============================================================
// MODE BUTTONS
// ============================================================

function setActiveButton(activeButton) {
  const buttons = [removeWhiteBG_button, editButton, unSharpMask_button];

  buttons.forEach((btn) => {
    if (!btn) return;

    btn.style.backgroundColor = "#3498db";
  });

  if (activeButton) {
    activeButton.style.backgroundColor = "#093654";
  }
}

removeWhiteBG_button.addEventListener("click", function () {
  choose = "removeWhite";
  setActiveButton(removeWhiteBG_button);
});

editButton.addEventListener("click", function () {
  choose = "edit";
  setActiveButton(editButton);
});

unSharpMask_button.addEventListener("click", function () {
  choose = "unSharpMask";
  setActiveButton(unSharpMask_button);
});

// ============================================================
// HELPER
// ============================================================

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function colorDistanceFromWhite(r, g, b) {
  // Euclidean distance tới trắng.
  return Math.sqrt(
    (255 - r) * (255 - r) + (255 - g) * (255 - g) + (255 - b) * (255 - b),
  );
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// ============================================================
// 1. XÓA NỀN TRẮNG
//
// QUAN TRỌNG:
// Không còn xóa tất cả pixel trắng trên toàn ảnh.
//
// Chỉ những pixel trắng/gần trắng "nối với mép ảnh"
// mới được coi là background.
//
// Vì vậy:
//
// [ TRẮNG NỀN ] -> xóa
// [ vật thể màu trắng ] -> giữ
//
// Đây là vấn đề lớn nhất của code cũ.
// ============================================================

function removeWhiteBackground() {
  const width = newCanVas.width;
  const height = newCanVas.height;

  const imageData = ctxNew.getImageData(0, 0, width, height);

  const data = imageData.data;

  // ----------------------------------------------------------
  // MASK background
  //
  // 0 = chưa xét
  // 1 = background trắng
  // ----------------------------------------------------------

  const background = new Uint8Array(width * height);

  const queueX = new Int32Array(width * height);

  const queueY = new Int32Array(width * height);

  let head = 0;
  let tail = 0;

  // ----------------------------------------------------------
  // THAM SỐ
  // ----------------------------------------------------------

  // Trắng tinh:
  // distance = 0
  //
  // 50~80:
  // gần trắng
  //
  // Không nên đặt quá cao,
  // nếu không sẽ ăn màu trắng của vật thể.

  const WHITE_DISTANCE = 55;

  // Nếu pixel quá tối thì chắc chắn không phải nền trắng.
  const MIN_BRIGHTNESS = 190;

  function isWhiteBackgroundPixel(x, y) {
    const index = (y * width + x) * 4;

    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const a = data[index + 3];

    if (a === 0) {
      return false;
    }

    const brightness = luminance(r, g, b);

    if (brightness < MIN_BRIGHTNESS) {
      return false;
    }

    const distance = colorDistanceFromWhite(r, g, b);

    return distance <= WHITE_DISTANCE;
  }

  function addPixel(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return;
    }

    const pos = y * width + x;

    if (background[pos]) {
      return;
    }

    if (!isWhiteBackgroundPixel(x, y)) {
      return;
    }

    background[pos] = 1;

    queueX[tail] = x;
    queueY[tail] = y;

    tail++;
  }

  // ----------------------------------------------------------
  // BẮT ĐẦU FLOOD FILL TỪ 4 CẠNH
  // ----------------------------------------------------------

  for (let x = 0; x < width; x++) {
    addPixel(x, 0);
    addPixel(x, height - 1);
  }

  for (let y = 0; y < height; y++) {
    addPixel(0, y);
    addPixel(width - 1, y);
  }

  // ----------------------------------------------------------
  // FLOOD FILL
  //
  // Chỉ lan qua vùng trắng.
  // Nếu gặp vật thể thì dừng.
  // ----------------------------------------------------------

  while (head < tail) {
    const x = queueX[head];
    const y = queueY[head];

    head++;

    addPixel(x - 1, y);
    addPixel(x + 1, y);
    addPixel(x, y - 1);
    addPixel(x, y + 1);
  }

  // ----------------------------------------------------------
  // XÓA BACKGROUND
  // ----------------------------------------------------------

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = y * width + x;

      if (!background[pos]) {
        continue;
      }

      const index = pos * 4;

      data[index + 3] = 0;
    }
  }

  // ----------------------------------------------------------
  // KHỬ VIỀN TRẮNG
  //
  // Chỉ xử lý những pixel sát vùng background.
  //
  // Không blur toàn bộ ảnh.
  // Không làm mờ vật thể.
  // ----------------------------------------------------------

  decontaminateWhiteEdge(imageData, background);

  // ----------------------------------------------------------
  // ALPHA EDGE SMOOTH
  //
  // Chỉ làm mềm nhẹ những pixel nằm sát background.
  // ----------------------------------------------------------

  smoothAlphaEdge(imageData, background);

  ctxNew.putImageData(imageData, 0, 0);

  newCanVas.style.display = "block";

  return imageData;
}

// ============================================================
// KHỬ ÁM TRẮNG Ở VIỀN
//
// Ví dụ:
//
// nền trắng
//     ↓
// [trắng] [trắng] [xám nhạt] [đỏ]
//                     ↑
//                 halo cũ
//
// Ta thay màu của pixel biên bằng màu của vùng vật thể,
// nhưng CHỈ ở vùng rất gần background.
// ============================================================

function decontaminateWhiteEdge(imageData, background) {
  const data = imageData.data;

  const width = imageData.width;
  const height = imageData.height;

  const original = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const pos = y * width + x;

      // Chỉ xét pixel còn nhìn thấy.
      const index = pos * 4;

      const alpha = original[index + 3];

      if (alpha === 0) {
        continue;
      }

      // Kiểm tra có background ngay cạnh không.
      let touchesBackground = false;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) {
            continue;
          }

          const nx = x + dx;
          const ny = y + dy;

          if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
            continue;
          }

          const nPos = ny * width + nx;

          if (background[nPos]) {
            touchesBackground = true;
          }
        }
      }

      if (!touchesBackground) {
        continue;
      }

      const r = original[index];
      const g = original[index + 1];
      const b = original[index + 2];

      // Chỉ khử nếu pixel thực sự có dấu hiệu ám trắng.
      //
      // Ví dụ:
      // 255,255,255 -> chắc chắn trắng
      // 240,240,240 -> trắng
      // 220,180,50  -> vàng, không nên sửa

      const minChannel = Math.min(r, g, b);

      const maxChannel = Math.max(r, g, b);

      const spread = maxChannel - minChannel;

      // Nếu 3 kênh gần nhau và rất sáng,
      // pixel có khả năng bị ám trắng.
      if (minChannel > 175 && spread < 45) {
        // Tìm màu của pixel vật thể lân cận.
        let sumR = 0;
        let sumG = 0;
        let sumB = 0;
        let count = 0;

        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (dx === 0 && dy === 0) {
              continue;
            }

            const nx = x + dx;
            const ny = y + dy;

            if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
              continue;
            }

            const nPos = ny * width + nx;

            // Không lấy background.
            if (background[nPos]) {
              continue;
            }

            const nIndex = nPos * 4;

            const na = original[nIndex + 3];

            if (na === 0) {
              continue;
            }

            const nr = original[nIndex];

            const ng = original[nIndex + 1];

            const nb = original[nIndex + 2];

            // Chỉ lấy màu tương đối có màu,
            // tránh lấy tiếp pixel trắng.
            if (Math.max(nr, ng, nb) - Math.min(nr, ng, nb) < 20) {
              continue;
            }

            sumR += nr;
            sumG += ng;
            sumB += nb;

            count++;
          }
        }

        if (count > 0) {
          const avgR = sumR / count;

          const avgG = sumG / count;

          const avgB = sumB / count;

          // Chỉ sửa một phần,
          // không overwrite hoàn toàn.
          data[index] = Math.round(r * 0.25 + avgR * 0.75);

          data[index + 1] = Math.round(g * 0.25 + avgG * 0.75);

          data[index + 2] = Math.round(b * 0.25 + avgB * 0.75);
        }
      }
    }
  }
}

// ============================================================
// LÀM MƯỢT ALPHA Ở BIÊN
//
// Không blur màu.
// Chỉ điều chỉnh alpha nhẹ.
//
// Đây là cách tốt hơn việc lấy trung bình alpha
// của cả 9 pixel như code cũ.
// ============================================================

function smoothAlphaEdge(imageData, background) {
  const data = imageData.data;

  const width = imageData.width;
  const height = imageData.height;

  const original = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const pos = y * width + x;

      const index = pos * 4;

      const alpha = original[index + 3];

      if (alpha === 0) {
        continue;
      }

      let bgCount = 0;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) {
            continue;
          }

          const nx = x + dx;
          const ny = y + dy;

          const nPos = ny * width + nx;

          if (background[nPos]) {
            bgCount++;
          }
        }
      }

      if (bgCount === 0) {
        continue;
      }

      // Chỉ giảm alpha nhẹ.
      //
      // Không đưa thẳng về 0.
      // Không tạo viền răng cưa mạnh.

      if (bgCount >= 6) {
        data[index + 3] = Math.min(alpha, 80);
      } else if (bgCount >= 3) {
        data[index + 3] = Math.min(alpha, 150);
      } else {
        data[index + 3] = Math.min(alpha, 210);
      }
    }
  }
}

// ============================================================
// 2. EDIT ẢNH THƯỜNG
//
// Thay kernel:
//
// 0 -1  0
// -1 5 -1
// 0 -1  0
//
// vì sharpen kiểu này khá gắt.
//
// Dùng unsharp nhẹ hơn.
// ============================================================

function editImage() {
  const width = newCanVas.width;
  const height = newCanVas.height;

  const source = ctxNew.getImageData(0, 0, width, height);

  const result = applyUnsharpMask(source, 0.55, 1.0, 8);

  ctxNew.putImageData(result, 0, 0);

  newCanVas.style.display = "block";

  return result;
}

// ============================================================
// 3. GAUSSIAN BLUR
//
// Dùng Gaussian 5x5.
// Không làm thay đổi alpha.
// ============================================================

function createGaussianKernel(size = 5, sigma = 1.0) {
  const kernel = [];

  const half = Math.floor(size / 2);

  let sum = 0;

  for (let y = -half; y <= half; y++) {
    const row = [];

    for (let x = -half; x <= half; x++) {
      const value = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));

      row.push(value);
      sum += value;
    }

    kernel.push(row);
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      kernel[y][x] /= sum;
    }
  }

  return kernel;
}

function gaussianBlurImageData(imageData, sigma = 1.0) {
  const width = imageData.width;

  const height = imageData.height;

  const source = imageData.data;

  const temp = new Uint8ClampedArray(source.length);

  const result = new Uint8ClampedArray(source.length);

  const kernel1D = createGaussianKernel1D(5, sigma);

  const half = 2;

  // ----------------------------------------------------------
  // PASS 1 - ngang
  // ----------------------------------------------------------

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;

      let weightSum = 0;

      for (let k = -half; k <= half; k++) {
        const sx = clamp(x + k, 0, width - 1);

        const weight = kernel1D[k + half];

        const index = (y * width + sx) * 4;

        r += source[index] * weight;
        g += source[index + 1] * weight;
        b += source[index + 2] * weight;

        weightSum += weight;
      }

      const index = (y * width + x) * 4;

      temp[index] = Math.round(r / weightSum);

      temp[index + 1] = Math.round(g / weightSum);

      temp[index + 2] = Math.round(b / weightSum);

      temp[index + 3] = source[index + 3];
    }
  }

  // ----------------------------------------------------------
  // PASS 2 - dọc
  // ----------------------------------------------------------

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0;
      let g = 0;
      let b = 0;

      let weightSum = 0;

      for (let k = -half; k <= half; k++) {
        const sy = clamp(y + k, 0, height - 1);

        const weight = kernel1D[k + half];

        const index = (sy * width + x) * 4;

        r += temp[index] * weight;
        g += temp[index + 1] * weight;
        b += temp[index + 2] * weight;

        weightSum += weight;
      }

      const index = (y * width + x) * 4;

      result[index] = Math.round(r / weightSum);

      result[index + 1] = Math.round(g / weightSum);

      result[index + 2] = Math.round(b / weightSum);

      result[index + 3] = source[index + 3];
    }
  }

  return new ImageData(result, width, height);
}

function createGaussianKernel1D(size, sigma) {
  const kernel = [];

  const half = Math.floor(size / 2);

  let sum = 0;

  for (let i = -half; i <= half; i++) {
    const value = Math.exp(-(i * i) / (2 * sigma * sigma));

    kernel.push(value);
    sum += value;
  }

  return kernel.map((value) => value / sum);
}

// ============================================================
// 4. UNSHARP MASK PRO
//
// Đây là phần mình viết lại hoàn toàn.
//
// Công thức:
//
// result = original +
//          amount * (original - blur)
//
// Nhưng thêm:
//
// - threshold
// - bảo vệ vùng phẳng
// - bảo vệ alpha
// - không sharpen quá mạnh
//
// Tránh tình trạng ảnh "nát", noise và halo.
// ============================================================

function applyUnsharpMask(imageData, amount = 1.0, sigma = 1.0, threshold = 8) {
  const width = imageData.width;

  const height = imageData.height;

  const source = imageData.data;

  const blur = gaussianBlurImageData(imageData, sigma);

  const blurData = blur.data;

  const result = new Uint8ClampedArray(source.length);

  for (let i = 0; i < source.length; i += 4) {
    const alpha = source[i + 3];

    // Alpha giữ nguyên.
    result[i + 3] = alpha;

    // Pixel trong suốt.
    if (alpha === 0) {
      result[i] = 0;
      result[i + 1] = 0;
      result[i + 2] = 0;

      continue;
    }

    for (let c = 0; c < 3; c++) {
      const original = source[i + c];

      const blurred = blurData[i + c];

      const difference = original - blurred;

      // Nếu khác biệt quá nhỏ,
      // coi đó là texture/noise và không sharpen.
      if (Math.abs(difference) < threshold) {
        result[i + c] = original;

        continue;
      }

      const sharpened = original + amount * difference;

      result[i + c] = clamp(Math.round(sharpened), 0, 255);
    }
  }

  return new ImageData(result, width, height);
}

// ============================================================
// PRO SHARPEN
//
// Mức mặc định:
// amount = 1.15
// sigma = 1.15
// threshold = 10
//
// Đây là mức vừa phải hơn amount = 3 của code cũ.
// ============================================================

function unsharpMaskPro() {
  const imageData = ctxNew.getImageData(
    0,
    0,
    newCanVas.width,
    newCanVas.height,
  );

  const result = applyUnsharpMask(imageData, 1.15, 1.15, 10);

  ctxNew.putImageData(result, 0, 0);

  newCanVas.style.display = "block";

  return result;
}

// ============================================================
// DOWNLOAD
// ============================================================

function enableDownloadLink(filename = "edited-image.png") {
  // PNG để giữ alpha.
  const dataURL = newCanVas.toDataURL("image/png");

  downLoadLink.href = dataURL;

  downLoadLink.download = filename;

  downLoadLink.style.display = "inline";
}

// ============================================================
// START
// ============================================================

startButton.addEventListener("click", function () {
  if (!imageResult) {
    alert("Vui lòng chọn ảnh trước.");
    return;
  }

  if (!choose) {
    alert("Vui lòng chọn chức năng.");
    return;
  }

  // --------------------------------------------------------
  // QUAN TRỌNG:
  // Mỗi lần xử lý đều lấy LẠI ảnh gốc.
  //
  // Không sharpen trên kết quả cũ.
  // Không remove background trên kết quả cũ.
  // --------------------------------------------------------

  ctxNew.clearRect(0, 0, newCanVas.width, newCanVas.height);

  ctxNew.imageSmoothingEnabled = false;

  ctxNew.drawImage(imageResult, 0, 0, newCanVas.width, newCanVas.height);

  let filename = "edited-image.png";

  // --------------------------------------------------------
  // REMOVE WHITE BG
  // --------------------------------------------------------

  if (choose === "removeWhite") {
    removeWhiteBackground();

    filename = "removed-background.png";
  }

  // --------------------------------------------------------
  // EDIT
  // --------------------------------------------------------
  else if (choose === "edit") {
    editImage();

    filename = "edited-image.png";
  }

  // --------------------------------------------------------
  // PRO SHARPEN
  // --------------------------------------------------------
  else if (choose === "unSharpMask") {
    unsharpMaskPro();

    filename = "sharpened-pro.png";
  }

  enableDownloadLink(filename);
});

// ============================================================
// RESET PREVIEW KHI RESIZE
// ============================================================

window.addEventListener("resize", function () {
  if (!imageResult) {
    return;
  }

  const maxDisplaySize = Math.min(window.innerWidth * 0.6, 700);

  displayScale = Math.min(
    maxDisplaySize / imgWidth,
    maxDisplaySize / imgHeight,
    1,
  );

  canvas.width = Math.max(1, Math.round(imgWidth * displayScale));

  canvas.height = Math.max(1, Math.round(imgHeight * displayScale));

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.imageSmoothingEnabled = true;

  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(imageResult, 0, 0, canvas.width, canvas.height);
});
