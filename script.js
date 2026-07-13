const canvas = document.getElementById("canvas1");
const ctx = canvas.getContext("2d");
const newCanVas = document.getElementById("canvas2");
const ctxNew = newCanVas.getContext("2d");

const imageInput = document.getElementById("imageInput");

const removeWhiteBG_button = document.getElementById("removeWhiteBG"); // nút xóa nền trắng
const editButton = document.getElementById("edit"); // nút chỉnh ảnh thường
const unSharpMask_button = document.getElementById("unSharpMask"); // nút chỉnh ảnh vip bằng unsharpmask

const startButton = document.getElementById("start"); // nút bắt đầu
const downLoadLink = document.getElementById("downLoadLink"); // link để download ảnh

const blabla = 1;
const bro = 2;
const bruh = 3;
const hehe = 4;
const haha = 5;
const het = 6;
const final = 7;

let imageResult = null;

let choose = null;

let Avg;
let imgWidth;
let imgHeight;
let newWidth;
let newHeight;

let offSetX;
let offSetY;
// input 1
/*imageInput.addEventListener("input", function (e) {
  downLoadLink.style.display = "none";
  newCanVas.style.display = "none";

  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      imgWidth = img.width;
      imgHeight = img.height;
      canvas.width = 500;
      canvas.height = 500;
      newCanVas.width = 500;
      newCanVas.height = 500;
      Avg = Math.min(500 / img.width, 500 / img.height);
      newWidth = img.width * Avg;
      newHeight = img.height * Avg;
      offSetX = (canvas.width - newWidth) / 2;
      offSetY = (canvas.height - newHeight) / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, offSetX, offSetY, newWidth, newHeight);
      canvas.style.display = "block";
    };
    img.src = e.target.result;
    imageResult = img;
  };
  reader.readAsDataURL(file);
});*/

// input 2
imageInput.addEventListener("input", function (e) {
  downLoadLink.style.display = "none";
  newCanVas.style.display = "none";

  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      // Kích thước gốc ảnh
      imgWidth = img.width;
      imgHeight = img.height;

      // Tính tỉ lệ hiển thị vừa màn hình (ví dụ khung 500x500)
      const maxDisplaySize = Math.min(window.innerWidth * 0.6, 500);
      const displayScale = Math.min(
        maxDisplaySize / imgWidth,
        maxDisplaySize / imgHeight,
      );
      newWidth = imgWidth;
      newHeight = imgHeight;

      // Canvas hiển thị (canvas chính)
      canvas.width = imgWidth * displayScale;
      canvas.height = imgHeight * displayScale;

      // Canvas xử lý nền (canvas xuất file) — giữ kích thước gốc
      newCanVas.width = imgWidth;
      newCanVas.height = imgHeight;

      // Căn giữa hình hiển thị
      offSetX = (canvas.width - imgWidth * displayScale) / 2;
      offSetY = (canvas.height - imgHeight * displayScale) / 2;

      // Vẽ ảnh vừa khung hiển thị
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        img,
        offSetX,
        offSetY,
        imgWidth * displayScale,
        imgHeight * displayScale,
      );
      canvas.style.display = "block";

      imageResult = img; // Lưu ảnh gốc để xử lý nền
    };
    img.src = e.target.result;
  };

  reader.readAsDataURL(file);
});

removeWhiteBG_button.addEventListener("click", function () {
  choose = "removeWhite";
  removeWhiteBG_button.style.backgroundColor = "#093654";
  editButton.style.backgroundColor = "#3498db";
  unSharpMask_button.style.backgroundColor = "#3498db";
});

editButton.addEventListener("click", function () {
  choose = "edit";
  removeWhiteBG_button.style.backgroundColor = "#3498db";
  editButton.style.backgroundColor = "#093654";
  unSharpMask_button.style.backgroundColor = "#3498db";
});

unSharpMask_button.addEventListener("click", function () {
  choose = "unSharpMask";
  removeWhiteBG_button.style.backgroundColor = "#3498db";
  editButton.style.backgroundColor = "#3498db";
  unSharpMask_button.style.backgroundColor = "#093654";
});

// hàm bool chọn khoảng màu để edit
function isTrueColor(r, g, b, toneRange) {
  const { r: rRange, g: gRange, b: bRange } = toneRange;
  return (
    r >= rRange[0] &&
    r <= rRange[1] &&
    g >= gRange[0] &&
    g <= gRange[1] &&
    b >= bRange[0] &&
    b <= bRange[1]
  );
}

function removeWhiteHaloSmart() {
  const imageData = reMoveWhiteBG();
  const data = imageData.data;
  const w = imageData.width;
  const h = imageData.height;

  // Clone dữ liệu gốc để tham chiếu màu lân cận
  const original = new Uint8ClampedArray(data);

  function getPixel(x, y) {
    const i = (y * w + x) * 4;
    return [
      original[i], // r
      original[i + 1], // g
      original[i + 2], // b
      original[i + 3], // a
    ];
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      let r = original[idx];
      let g = original[idx + 1];
      let b = original[idx + 2];
      let a = original[idx + 3];

      // Độ sáng pixel
      let brightness = (r + g + b) / 3;

      // Điều kiện pixel viền trắng mờ
      if (brightness > 180 && a > 0 && a < 255) {
        let sumR = 0,
          sumG = 0,
          sumB = 0,
          count = 0;

        // Lấy 8 pixel xung quanh
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            let nx = x + dx,
              ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              let [nr, ng, nb, na] = getPixel(nx, ny);
              if (na > 0) {
                // chỉ lấy pixel có alpha > 0
                sumR += nr;
                sumG += ng;
                sumB += nb;
                count++;
              }
            }
          }
        }

        if (count > 0) {
          data[idx] = Math.round(sumR / count); // thay màu bằng trung bình
          data[idx + 1] = Math.round(sumG / count);
          data[idx + 2] = Math.round(sumB / count);
          // giữ nguyên alpha gốc để không mất độ mượt
        }
      }
    }
  }

  ctxNew.putImageData(imageData, 0, 0);
  newCanVas.style.display = "block";
}
// xóa nền trắng
function reMoveWhiteBG() {
  // Lấy dữ liệu pixel từ canvas
  const imageData = ctxNew.getImageData(
    0,
    0,
    newCanVas.width,
    newCanVas.height,
  );
  const { data, width, height } = imageData;

  // --- Bước 1: Xóa trắng (tăng độ nhạy) ---
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    let alpha = data[i + 3];

    // Tính độ khác biệt với màu trắng
    let diff = Math.sqrt(
      Math.pow(255 - r, 2) + Math.pow(255 - g, 2) + Math.pow(255 - b, 2),
    );

    // Nếu gần trắng thì xóa (ngưỡng có thể chỉnh 80–100)
    if (diff < 85) {
      data[i + 3] = 0;
    }
  }

  // --- Bước 2: Làm mềm rìa (feather) ---
  const radius = 1; // bán kính vùng mờ
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];

      if (alpha === 0) continue; // bỏ pixel đã trong suốt

      let totalAlpha = 0;
      let count = 0;

      // Lấy trung bình alpha 8 pixel xung quanh
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nIdx = ((y + dy) * width + (x + dx)) * 4 + 3;
          totalAlpha += data[nIdx];
          count++;
        }
      }

      const avgAlpha = totalAlpha / count;
      data[idx + 3] = Math.min(alpha, avgAlpha);
    }
  }

  return imageData;
}

// edit ảnh
function editImage() {
  const imageData = ctxNew.getImageData(
    0,
    0,
    newCanVas.width,
    newCanVas.height,
  );
  const data = imageData.data;

  const copy = new Uint8ClampedArray(data);

  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  const kernelSize = 3;
  const half = Math.floor(kernelSize / 2);

  for (let y = half; y < newHeight - half; y++) {
    for (let x = half; x < newWidth - half; x++) {
      let r = 0,
        g = 0,
        b = 0;

      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const px = x + kx;
          const py = y + ky;
          const offset = (py * newWidth + px) * 4;
          const weight = kernel[(ky + half) * kernelSize + (kx + half)];

          r += copy[offset] * weight;
          g += copy[offset + 1] * weight;
          b += copy[offset + 2] * weight;
        }
      }

      const i = (y * newWidth + x) * 4;
      data[i] = Math.min(Math.max(r, 0), 255);
      data[i + 1] = Math.min(Math.max(g, 0), 255);
      data[i + 2] = Math.min(Math.max(b, 0), 255);
    }
  }

  ctxNew.putImageData(imageData, 0, 0);
  newCanVas.style.display = "block";
}

// hàm blur radius làm mờ ảnh
/*function blurRadius() {
  const imageData = newCanVas.getImageData(
    offSetX,
    offSetY,
    newWidth,
    newHeight
  );
  const data = imageData.data;

  const copy = new Uint8ClampedArray(data);

  for (let y = 1; y < newHeight - 1; y++) {
    for (let x = 1; x < newWidth - 1; x++) {
      let r = 0,
        g = 0,
        b = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const px = x + kx;
          const py = y + ky;
          const offset = (py * newWidth + px) * 4;

          r += copy[offset];
          g += copy[offset + 1];
          b += copy[offset + 2];
        }
      }

      const i = (y * newWidth + x) * 4;
      data[i] = r / 9;
      data[i + 1] = g / 9;
      data[i + 2] = b / 9;
    }
  }
  ctxNew.putImageData(imageData, 0, 0);
  newCanVas.style.display = "block";
}*/

// hàm tạo kernel gaussian 3x3
function createGaussianKernel(size = 5, sigma = 1.5) {
  const kernel = [];
  const half = Math.floor(size / 2);
  let sum = 0;

  for (let y = -half; y <= half; y++) {
    for (let x = -half; x <= half; x++) {
      const value =
        (1 / (2 * Math.PI * sigma * sigma)) *
        Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
      kernel.push(value);
      sum += value;
    }
  }

  // Chuẩn hóa kernel sao cho tổng bằng 1
  return kernel.map((v) => v / sum);
}

// hàm làm mờ bằng gaussian
// Sửa gaussianBlur
function gaussianBlur() {
  const imageData = ctxNew.getImageData(
    Math.floor(offSetX),
    Math.floor(offSetY),
    Math.floor(newWidth),
    Math.floor(newHeight),
  );
  const data = imageData.data;

  const half = Math.floor(3 / 2);
  const copy = new Uint8ClampedArray(data);
  const kernel = createGaussianKernel(3, 1);

  for (let y = half; y < newHeight - half; y++) {
    for (let x = half; x < newWidth - half; x++) {
      let r = 0,
        g = 0,
        b = 0;

      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const px = x + kx;
          const py = y + ky;
          const offset = (py * newWidth + px) * 4; // Dùng newWidth
          const weight = kernel[(ky + half) * 3 + (kx + half)];

          r += copy[offset] * weight;
          g += copy[offset + 1] * weight;
          b += copy[offset + 2] * weight;
        }
      }

      const i = (y * newWidth + x) * 4; // sửa từ width -> newWidth
      data[i] = Math.round(r);
      data[i + 1] = Math.round(g);
      data[i + 2] = Math.round(b);
      data[i + 3] = copy[i + 3];
    }
  }
  ctxNew.putImageData(imageData, Math.floor(offSetX), Math.floor(offSetY));
  return ctxNew.getImageData(
    Math.floor(offSetX),
    Math.floor(offSetY),
    Math.floor(newWidth),
    Math.floor(newHeight),
  );
}

// hàm làm sắc ảnh bằng unsharpmask
function unsharpMask(amount = 1) {
  const imageData = ctx.getImageData(
    Math.floor(offSetX),
    Math.floor(offSetY),
    Math.floor(newWidth),
    Math.floor(newHeight),
  );
  const data = imageData.data;
  const blur = gaussianBlur();
  const blurData = blur.data;

  const result = new Uint8ClampedArray(data.length);

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let value = data[i + c] + amount * (data[i + c] - blurData[i + c]);
      result[i + c] = Math.min(Math.max(Math.round(value), 0), 255);
    }
    result[i + 3] = data[i + 3];
  }

  const sharpenedImageData = new ImageData(
    result,
    Math.floor(newWidth),
    Math.floor(newHeight),
  );
  ctxNew.putImageData(
    sharpenedImageData,
    Math.floor(offSetX),
    Math.floor(offSetY),
  );
  newCanVas.style.display = "block";
}

// Hàm downLoadLink 1
/*function enableDownloadLink() {
  const dataURL = newCanVas.toDataURL("image/png");
  downLoadLink.href = dataURL;
  downLoadLink.download = "removed-bg.png";
  downLoadLink.style.display = "inline";
}*/

// Hàm downLoadLink 2
function enableDownloadLink() {
  // newCanVas đã có kích thước đúng với ảnh gốc
  const dataURL = newCanVas.toDataURL("image/png");
  downLoadLink.href = dataURL;
  downLoadLink.download = "removed-bg.png";
  downLoadLink.style.display = "inline";
}

// Bắt đầu chỉnh ảnh
startButton.addEventListener("click", function () {
  if (!imageResult || choose == null) return;

  // Xóa canvas 2 trước
  ctxNew.clearRect(0, 0, newCanVas.width, newCanVas.height);

  // Vẽ ảnh gốc lên canvas 2 ở góc (0,0) — KHÔNG offset
  ctxNew.drawImage(imageResult, 0, 0, newCanVas.width, newCanVas.height);

  if (choose == "removeWhite") {
    removeWhiteHaloSmart();
  } else if (choose == "edit") {
    editImage();
  } else if (choose == "unSharpMask") {
    unsharpMask(3);
  }

  // Bật link tải sau khi xử lý xong
  enableDownloadLink();
});
