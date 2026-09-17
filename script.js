// ============================================================
// IMAGE EDITOR
// ============================================================
// Giữ các ID HTML hiện tại:
//
// canvas1
// canvas2
// imageInput
// removeWhiteBG
// edit
// unSharpMask
// start
// downLoadLink
// submit-btn
// username
// response-message
// backgroundPanel
// outputPreview
// sourceEmpty
// fileName
// bgColorPicker
// bgHex
// selectedColorSwatch
// pickColorButton
// tolerance
// edgeSoftness
// decontaminate
// contract
// toleranceValue
// edgeValue
// decontaminateValue
// contractValue
// reset-btn
// ============================================================

// ============================================================
// DOM
// ============================================================

const canvas = document.getElementById("canvas1");
const ctx = canvas
  ? canvas.getContext("2d", { willReadFrequently: true })
  : null;

const newCanVas = document.getElementById("canvas2");
const ctxNew = newCanVas
  ? newCanVas.getContext("2d", { willReadFrequently: true })
  : null;

const imageInput = document.getElementById("imageInput");
const removeWhiteBG_button = document.getElementById("removeWhiteBG");
const editButton = document.getElementById("edit");
const unSharpMask_button = document.getElementById("unSharpMask");
const startButton = document.getElementById("start");
const downLoadLink = document.getElementById("downLoadLink");
const button = document.getElementById("submit-btn");
const input = document.getElementById("username");
const messageBox = document.getElementById("response-message");

const backgroundPanel = document.getElementById("backgroundPanel");
const outputPreview = document.getElementById("outputPreview");
const sourceEmpty = document.getElementById("sourceEmpty");
const fileNameBox = document.getElementById("fileName");

const bgColorPicker = document.getElementById("bgColorPicker");
const bgHex = document.getElementById("bgHex");
const selectedColorSwatch = document.getElementById("selectedColorSwatch");
const pickColorButton = document.getElementById("pickColorButton");

const toleranceInput = document.getElementById("tolerance");
const edgeSoftnessInput = document.getElementById("edgeSoftness");
const decontaminateInput = document.getElementById("decontaminate");
const contractInput = document.getElementById("contract");

const toleranceValue = document.getElementById("toleranceValue");
const edgeValue = document.getElementById("edgeValue");
const decontaminateValue = document.getElementById("decontaminateValue");
const contractValue = document.getElementById("contractValue");

// ============================================================
// STATE
// ============================================================

let imageResult = null;
let choose = null;
let imgWidth = 0;
let imgHeight = 0;
let displayScale = 1;

// Màu background hiện tại
let backgroundColor = {
  r: 255,
  g: 255,
  b: 255,
};

let backgroundColorSource = "auto";

let backgroundSettings = {
  tolerance: 18,
  edgeSoftness: 18,
  decontaminate: 90,
  contract: 0,
};

// ============================================================
// BASIC HELPERS
// ============================================================

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// ============================================================
// COLOR
// ============================================================

function colorDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  // Perceptual RGB distance
  return Math.sqrt(0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db);
}

function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((value) => clampByte(value).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function hexToRgb(value) {
  let hex = String(value || "").trim();
  if (!hex.startsWith("#")) {
    hex = "#" + hex;
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return null;
  }
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

// ============================================================
// BACKGROUND COLOR STATE
// ============================================================

function setBackgroundColor(r, g, b, source = "manual") {
  backgroundColor = {
    r: clampByte(r),
    g: clampByte(g),
    b: clampByte(b),
  };
  backgroundColorSource = source;
  updateBackgroundControls();
}

function updateBackgroundControls() {
  const hex = rgbToHex(backgroundColor.r, backgroundColor.g, backgroundColor.b);

  if (bgColorPicker) bgColorPicker.value = hex;
  if (bgHex) bgHex.value = hex;
  if (selectedColorSwatch) selectedColorSwatch.style.backgroundColor = hex;
  if (toleranceValue) toleranceValue.textContent = backgroundSettings.tolerance;
  if (edgeValue) edgeValue.textContent = backgroundSettings.edgeSoftness;
  if (decontaminateValue)
    decontaminateValue.textContent = backgroundSettings.decontaminate + "%";
  if (contractValue)
    contractValue.textContent = backgroundSettings.contract + " px";
}

// ============================================================
// AUTO BACKGROUND COLOR DETECTION
// ============================================================

function estimateBackgroundColor() {
  if (!ctxNew || !newCanVas || !newCanVas.width || !newCanVas.height) {
    return null;
  }

  const width = newCanVas.width;
  const height = newCanVas.height;
  const imageData = ctxNew.getImageData(0, 0, width, height);
  const data = imageData.data;
  const samples = [];

  function addSample(x, y) {
    x = clamp(Math.round(x), 0, width - 1);
    y = clamp(Math.round(y), 0, height - 1);
    const index = (y * width + x) * 4;

    if (data[index + 3] < 10) return;

    samples.push({
      r: data[index],
      g: data[index + 1],
      b: data[index + 2],
    });
  }

  const margin = Math.max(1, Math.round(Math.min(width, height) * 0.005));
  const steps = 16;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = margin + (width - 1 - margin * 2) * t;
    const y = margin + (height - 1 - margin * 2) * t;

    addSample(x, margin);
    addSample(x, height - 1 - margin);
    addSample(margin, y);
    addSample(width - 1 - margin, y);
  }

  if (!samples.length) return null;

  function median(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2) return sorted[middle];
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return {
    r: clampByte(median(samples.map((s) => s.r))),
    g: clampByte(median(samples.map((s) => s.g))),
    b: clampByte(median(samples.map((s) => s.b))),
  };
}

// ============================================================
// MODE BUTTONS
// ============================================================

function setActiveButton(activeButton) {
  const buttons = [removeWhiteBG_button, editButton, unSharpMask_button];
  buttons.forEach((btn) => {
    if (btn) btn.classList.remove("active");
  });
  if (activeButton) activeButton.classList.add("active");
}

if (removeWhiteBG_button) {
  removeWhiteBG_button.addEventListener("click", function () {
    choose = "removeWhite";
    setActiveButton(removeWhiteBG_button);
  });
}

if (editButton) {
  editButton.addEventListener("click", function () {
    choose = "edit";
    setActiveButton(editButton);
  });
}

if (unSharpMask_button) {
  unSharpMask_button.addEventListener("click", function () {
    choose = "unSharpMask";
    setActiveButton(unSharpMask_button);
  });
}

// ============================================================
// COLOR PICKER FROM IMAGE
// ============================================================

if (pickColorButton) {
  pickColorButton.addEventListener("click", function () {
    if (!imageResult) {
      alert("Hãy chọn ảnh trước.");
      return;
    }
    document.body.classList.add("color-picking");
    if (canvas) canvas.style.cursor = "crosshair";
  });
}

if (canvas) {
  canvas.addEventListener("click", function (event) {
    if (!document.body.classList.contains("color-picking")) return;
    if (!imageResult || !ctxNew) return;

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const displayX = event.clientX - rect.left;
    const displayY = event.clientY - rect.top;

    const x = clamp(
      Math.floor((displayX * imgWidth) / rect.width),
      0,
      imgWidth - 1,
    );
    const y = clamp(
      Math.floor((displayY * imgHeight) / rect.height),
      0,
      imgHeight - 1,
    );

    const pixel = ctxNew.getImageData(x, y, 1, 1).data;
    setBackgroundColor(pixel[0], pixel[1], pixel[2], "picked");

    document.body.classList.remove("color-picking");
    canvas.style.cursor = "default";
  });
}

// ============================================================
// COLOR CONTROLS
// ============================================================

if (bgColorPicker) {
  bgColorPicker.addEventListener("input", function () {
    const rgb = hexToRgb(bgColorPicker.value);
    if (rgb) setBackgroundColor(rgb.r, rgb.g, rgb.b, "manual");
  });
}

if (bgHex) {
  bgHex.addEventListener("change", function () {
    const rgb = hexToRgb(bgHex.value);
    if (!rgb) {
      alert("HEX không hợp lệ. Ví dụ: #FFFFFF");
      updateBackgroundControls();
      return;
    }
    setBackgroundColor(rgb.r, rgb.g, rgb.b, "manual");
  });

  bgHex.addEventListener("keydown", function (event) {
    if (event.key === "Enter") bgHex.blur();
  });
}

document.querySelectorAll(".color-preset").forEach((preset) => {
  preset.addEventListener("click", function () {
    const rgb = hexToRgb(preset.dataset.color);
    if (rgb) setBackgroundColor(rgb.r, rgb.g, rgb.b, "preset");
  });
});

// Range Controls
if (toleranceInput) {
  toleranceInput.addEventListener("input", function () {
    backgroundSettings.tolerance = clamp(Number(toleranceInput.value), 0, 255);
    updateBackgroundControls();
  });
}

if (edgeSoftnessInput) {
  edgeSoftnessInput.addEventListener("input", function () {
    backgroundSettings.edgeSoftness = clamp(
      Number(edgeSoftnessInput.value),
      1,
      100,
    );
    updateBackgroundControls();
  });
}

if (decontaminateInput) {
  decontaminateInput.addEventListener("input", function () {
    backgroundSettings.decontaminate = clamp(
      Number(decontaminateInput.value),
      0,
      100,
    );
    updateBackgroundControls();
  });
}

if (contractInput) {
  contractInput.addEventListener("input", function () {
    backgroundSettings.contract = clamp(Number(contractInput.value), 0, 10);
    updateBackgroundControls();
  });
}

// ============================================================
// GLOBAL BACKGROUND ALPHA MASK (Sửa lỗi xóa lòng viền chữ)
// ============================================================

function createBackgroundAlphaMap(imageData) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const total = width * height;
  const alphaMap = new Float32Array(total);

  const bg = backgroundColor;
  const tolerance = Math.max(0, backgroundSettings.tolerance);
  const softness = Math.max(1, backgroundSettings.edgeSoftness);

  for (let i = 0; i < total; i++) {
    const idx = i * 4;

    // Nếu đã là pixel trong suốt thì giữ nguyên
    if (data[idx + 3] < 10) {
      alphaMap[i] = 0;
      continue;
    }

    const dist = colorDistance(
      data[idx],
      data[idx + 1],
      data[idx + 2],
      bg.r,
      bg.g,
      bg.b,
    );

    if (dist <= tolerance) {
      alphaMap[i] = 0; // Màu trùng nền hoàn toàn -> Trong suốt
    } else if (dist >= tolerance + softness) {
      alphaMap[i] = 1; // Màu khác nền hoàn toàn -> Mẫu vật giữ nguyên
    } else {
      // Vùng chuyển tiếp mượt (Smoothstep interpolation)
      const t = (dist - tolerance) / softness;
      alphaMap[i] = t * t * (3 - 2 * t);
    }
  }

  return alphaMap;
}

// ============================================================
// SMOOTH ALPHA EDGES (Làm mềm răng cưa ở viền ảnh)
// ============================================================

function smoothAlphaEdges(alphaMap, width, height) {
  const output = new Float32Array(alphaMap);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      const currentA = alphaMap[p];

      let sum = 0;
      let count = 0;
      let minA = 1;
      let maxA = 0;

      // Lấy trung bình 3x3 pixel xung quanh
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const np = (y + dy) * width + (x + dx);
          const a = alphaMap[np];
          sum += a;
          count++;
          if (a < minA) minA = a;
          if (a > maxA) maxA = a;
        }
      }

      // Nếu có sự chênh lệch Alpha lớn ở rìa (phát hiện đường răng cưa)
      if (maxA - minA > 0.2) {
        const avg = sum / count;
        // Trộn nhẹ giữa alpha hiện tại và trung bình lân cận để khử răng cưa
        output[p] = currentA * 0.4 + avg * 0.6;
      }
    }
  }

  return output;
}

// ============================================================
// COLOR DECONTAMINATION (Khử màu viền bám)
// ============================================================

function decontaminateColorEdge(data, alphaMap, width, height) {
  const strength = clamp(backgroundSettings.decontaminate / 100, 0, 1);
  if (strength <= 0) return;

  const original = new Uint8ClampedArray(data);
  const bg = backgroundColor;
  const radius = 3;

  function getReference(x, y, currentR, currentG, currentB) {
    let best = null;
    let bestScore = Infinity;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;

        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

        const np = ny * width + nx;
        if (alphaMap[np] < 0.98) continue;

        const ni = np * 4;
        const r = original[ni];
        const g = original[ni + 1];
        const b = original[ni + 2];

        if (colorDistance(r, g, b, bg.r, bg.g, bg.b) < 15) continue;

        const distanceToCurrent = colorDistance(
          currentR,
          currentG,
          currentB,
          r,
          g,
          b,
        );
        const spatial = Math.sqrt(dx * dx + dy * dy);
        const score = distanceToCurrent + spatial * 7;

        if (score < bestScore) {
          bestScore = score;
          best = { r, g, b };
        }
      }
    }
    return best;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const alpha = alphaMap[p];

      if (alpha <= 0.01 || alpha >= 0.98) continue;

      const i = p * 4;
      const r = original[i];
      const g = original[i + 1];
      const b = original[i + 2];

      const reference = getReference(x, y, r, g, b);
      if (!reference) continue;

      const fr = reference.r - bg.r;
      const fg = reference.g - bg.g;
      const fb = reference.b - bg.b;
      const cr = r - bg.r;
      const cg = g - bg.g;
      const cb = b - bg.b;

      const denominator = fr * fr + fg * fg + fb * fb;
      if (denominator < 25) continue;

      let estimatedAlpha = clamp(
        (cr * fr + cg * fg + cb * fb) / denominator,
        0.05,
        1,
      );
      estimatedAlpha = Math.max(estimatedAlpha, alpha * 0.65);

      const restoredR = (r - (1 - estimatedAlpha) * bg.r) / estimatedAlpha;
      const restoredG = (g - (1 - estimatedAlpha) * bg.g) / estimatedAlpha;
      const restoredB = (b - (1 - estimatedAlpha) * bg.b) / estimatedAlpha;

      const blend = strength * 0.75;
      data[i] = clampByte(lerp(restoredR, reference.r, blend));
      data[i + 1] = clampByte(lerp(restoredG, reference.g, blend));
      data[i + 2] = clampByte(lerp(restoredB, reference.b, blend));
    }
  }
}

// ============================================================
// CONTRACT ALPHA
// ============================================================

function contractAlpha(alphaMap, width, height, amount) {
  const radius = Math.max(1, Math.round(amount));
  if (radius <= 0) return;

  const source = new Float32Array(alphaMap);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (source[p] <= 0) continue;

      let nearTransparent = false;
      for (let dy = -radius; dy <= radius && !nearTransparent; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

          if (source[ny * width + nx] <= 0.001) {
            nearTransparent = true;
            break;
          }
        }
      }

      if (nearTransparent) {
        alphaMap[p] = Math.min(source[p], 0.15);
      }
    }
  }
}

// ============================================================
// REMOVE BACKGROUND BY COLOR
// ============================================================

function removeBackgroundByColor() {
  if (!ctxNew || !newCanVas) return null;

  const width = newCanVas.width;
  const height = newCanVas.height;
  if (!width || !height) return null;

  const imageData = ctxNew.getImageData(0, 0, width, height);
  const data = imageData.data;

  // 1. Tạo Alpha map toàn cục (Xóa được cả bên trong viền chữ)
  let alphaMap = createBackgroundAlphaMap(imageData);

  // 2. Làm mềm răng cưa viền ảnh (Edge Smoothing)
  alphaMap = smoothAlphaEdges(alphaMap, width, height);

  // 3. Khử màu bám ở viền anti-alias
  decontaminateColorEdge(data, alphaMap, width, height);

  // 4. Co nhẹ mask nếu cài đặt contract > 0
  if (backgroundSettings.contract > 0) {
    contractAlpha(alphaMap, width, height, backgroundSettings.contract);
  }

  // 5. Cập nhật kênh Alpha thực tế vào ImageData
  for (let p = 0, i = 0; p < alphaMap.length; p++, i += 4) {
    const alpha = clamp(alphaMap[p], 0, 1);
    data[i + 3] = Math.round(alpha * 255);

    if (alpha <= 0.001) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
    }
  }

  // 6. Xử lý lem màu lần cuối
  removeColorFringe(imageData, alphaMap);

  ctxNew.putImageData(imageData, 0, 0);

  if (outputPreview) outputPreview.hidden = false;
  newCanVas.style.display = "block";

  return imageData;
}

// ============================================================
// REMOVE COLOR FRINGE
// ============================================================

function removeColorFringe(imageData, alphaMap) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const bg = backgroundColor;
  const original = new Uint8ClampedArray(data);

  const strength = clamp(backgroundSettings.decontaminate / 100, 0, 1);
  if (strength <= 0) return;

  function findInnerReference(x, y) {
    let best = null;
    let bestScore = Infinity;

    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        if (dx === 0 && dy === 0) continue;

        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

        const np = ny * width + nx;
        if (alphaMap[np] < 0.98) continue;

        const ni = np * 4;
        const r = original[ni];
        const g = original[ni + 1];
        const b = original[ni + 2];

        if (colorDistance(r, g, b, bg.r, bg.g, bg.b) < 20) continue;

        const spatial = Math.sqrt(dx * dx + dy * dy);
        const score =
          spatial * 8 - colorDistance(r, g, b, bg.r, bg.g, bg.b) * 0.15;

        if (score < bestScore) {
          bestScore = score;
          best = { r, g, b };
        }
      }
    }
    return best;
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      const alpha = alphaMap[p];

      if (alpha <= 0.02 || alpha >= 0.96) continue;

      const i = p * 4;
      const r = original[i];
      const g = original[i + 1];
      const b = original[i + 2];

      const reference = findInnerReference(x, y);
      if (!reference) continue;

      const bgDistance = colorDistance(r, g, b, bg.r, bg.g, bg.b);
      const referenceDistance = colorDistance(
        reference.r,
        reference.g,
        reference.b,
        bg.r,
        bg.g,
        bg.b,
      );

      if (referenceDistance < 20) continue;

      const contamination = clamp(
        1 - bgDistance / Math.max(referenceDistance, 1),
        0,
        1,
      );
      if (contamination <= 0.08) continue;

      const safeAlpha = Math.max(alpha, 0.12);
      const restoredR = (r - (1 - safeAlpha) * bg.r) / safeAlpha;
      const restoredG = (g - (1 - safeAlpha) * bg.g) / safeAlpha;
      const restoredB = (b - (1 - safeAlpha) * bg.b) / safeAlpha;

      const blend = strength * contamination * 0.75;
      data[i] = clampByte(lerp(r, restoredR, blend));
      data[i + 1] = clampByte(lerp(g, restoredG, blend));
      data[i + 2] = clampByte(lerp(b, restoredB, blend));
    }
  }
}

// ============================================================
// GAUSSIAN BLUR & UNSHARP MASK
// ============================================================

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

function gaussianBlurImageData(imageData, sigma = 1) {
  const width = imageData.width;
  const height = imageData.height;
  const source = imageData.data;
  const temp = new Uint8ClampedArray(source.length);
  const result = new Uint8ClampedArray(source.length);

  const kernel = createGaussianKernel1D(5, sigma);
  const half = 2;

  // Horizontal
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        weightSum = 0;

      for (let k = -half; k <= half; k++) {
        const sx = clamp(x + k, 0, width - 1);
        const weight = kernel[k + half];
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

  // Vertical
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        weightSum = 0;

      for (let k = -half; k <= half; k++) {
        const sy = clamp(y + k, 0, height - 1);
        const weight = kernel[k + half];
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

function applyUnsharpMask(imageData, amount = 1.0, sigma = 1.0, threshold = 8) {
  const source = imageData.data;
  const blur = gaussianBlurImageData(imageData, sigma);
  const blurData = blur.data;
  const result = new Uint8ClampedArray(source.length);

  for (let i = 0; i < source.length; i += 4) {
    const alpha = source[i + 3];
    result[i + 3] = alpha;

    if (alpha === 0) {
      result[i] = 0;
      result[i + 1] = 0;
      result[i + 2] = 0;
      continue;
    }

    const alphaFactor = alpha / 255;
    const localAmount = amount * (0.45 + 0.55 * alphaFactor);

    for (let c = 0; c < 3; c++) {
      const original = source[i + c];
      const blurred = blurData[i + c];
      const difference = original - blurred;

      if (Math.abs(difference) < threshold) {
        result[i + c] = original;
        continue;
      }

      result[i + c] = clampByte(original + localAmount * difference);
    }
  }

  return new ImageData(result, imageData.width, imageData.height);
}

function editImage() {
  if (!ctxNew || !newCanVas) return null;
  const imageData = ctxNew.getImageData(
    0,
    0,
    newCanVas.width,
    newCanVas.height,
  );
  const result = applyUnsharpMask(imageData, 0.55, 1.0, 8);
  ctxNew.putImageData(result, 0, 0);
  newCanVas.style.display = "block";
  return result;
}

function unsharpMaskPro() {
  if (!ctxNew || !newCanVas) return null;
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
// DOWNLOAD & LOAD IMAGE
// ============================================================

function enableDownloadLink(filename = "edited-image.png") {
  if (!newCanVas || !downLoadLink) return;
  const dataURL = newCanVas.toDataURL("image/png");
  downLoadLink.href = dataURL;
  downLoadLink.download = filename;
  downLoadLink.style.display = "inline-block";
}

if (imageInput) {
  imageInput.addEventListener("change", function (event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn một file ảnh.");
      return;
    }

    imageResult = null;
    choose = null;

    if (downLoadLink) downLoadLink.style.display = "none";
    if (outputPreview) outputPreview.hidden = true;
    if (backgroundPanel) backgroundPanel.hidden = false;
    if (sourceEmpty) sourceEmpty.style.display = "none";
    if (fileNameBox) fileNameBox.textContent = file.name;

    setActiveButton(null);

    const reader = new FileReader();
    reader.onload = function (readerEvent) {
      const img = new Image();
      img.onload = function () {
        imageResult = img;
        imgWidth = img.naturalWidth;
        imgHeight = img.naturalHeight;

        if (canvas && ctx) {
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
        }

        if (newCanVas && ctxNew) {
          newCanVas.width = imgWidth;
          newCanVas.height = imgHeight;
          ctxNew.clearRect(0, 0, imgWidth, imgHeight);
          ctxNew.imageSmoothingEnabled = false;
          ctxNew.drawImage(img, 0, 0, imgWidth, imgHeight);

          const estimated = estimateBackgroundColor();
          if (estimated) {
            setBackgroundColor(estimated.r, estimated.g, estimated.b, "auto");
          }
        }
      };

      img.onerror = function () {
        alert("Không thể đọc ảnh này.");
      };

      img.src = readerEvent.target.result;
    };

    reader.onerror = function () {
      alert("Không thể đọc file ảnh.");
    };

    reader.readAsDataURL(file);
  });
}

// ============================================================
// START PROCESSING
// ============================================================

if (startButton) {
  startButton.addEventListener("click", function () {
    if (!imageResult) {
      alert("Vui lòng chọn ảnh trước.");
      return;
    }

    if (!choose) {
      alert("Vui lòng chọn chức năng.");
      return;
    }

    if (!ctxNew || !newCanVas) {
      alert("Canvas xử lý ảnh không khả dụng.");
      return;
    }

    // Reset về ảnh gốc
    ctxNew.clearRect(0, 0, newCanVas.width, newCanVas.height);
    ctxNew.imageSmoothingEnabled = false;
    ctxNew.drawImage(imageResult, 0, 0, newCanVas.width, newCanVas.height);

    let result = null;
    let filename = "edited-image.png";

    if (outputPreview) outputPreview.hidden = false;

    if (choose === "removeWhite") {
      result = removeBackgroundByColor();
      filename = "removed-background.png";
    } else if (choose === "edit") {
      result = editImage();
      filename = "edited-image.png";
    } else if (choose === "unSharpMask") {
      result = unsharpMaskPro();
      filename = "sharpened-pro.png";
    }

    if (result) {
      enableDownloadLink(filename);
    }
  });
}

// ============================================================
// RESET
// ============================================================

const resetButton = document.getElementById("reset-btn");

if (resetButton) {
  resetButton.addEventListener("click", function () {
    imageResult = null;
    choose = null;
    imgWidth = 0;
    imgHeight = 0;
    displayScale = 1;

    if (imageInput) imageInput.value = "";
    if (downLoadLink) {
      downLoadLink.style.display = "none";
      downLoadLink.removeAttribute("href");
    }
    if (outputPreview) outputPreview.hidden = true;
    if (backgroundPanel) backgroundPanel.hidden = true;
    if (sourceEmpty) sourceEmpty.style.display = "block";
    if (fileNameBox) fileNameBox.textContent = "Chưa chọn ảnh";

    if (canvas && ctx) {
      canvas.style.display = "none";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (newCanVas && ctxNew) {
      ctxNew.clearRect(0, 0, newCanVas.width, newCanVas.height);
    }

    setActiveButton(null);
    document.body.classList.remove("color-picking");
    if (canvas) canvas.style.cursor = "default";

    backgroundColor = { r: 255, g: 255, b: 255 };
    backgroundColorSource = "auto";
    backgroundSettings = {
      tolerance: 18,
      edgeSoftness: 18,
      decontaminate: 90,
      contract: 0,
    };

    if (toleranceInput) toleranceInput.value = 18;
    if (edgeSoftnessInput) edgeSoftnessInput.value = 18;
    if (decontaminateInput) decontaminateInput.value = 90;
    if (contractInput) contractInput.value = 0;

    updateBackgroundControls();
  });
}

// ============================================================
// RESIZE PREVIEW
// ============================================================

window.addEventListener("resize", function () {
  if (!imageResult || !canvas || !ctx) return;

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

// ============================================================
// SUBMIT NAME
// ============================================================

if (button) {
  button.addEventListener("click", async function () {
    if (!input) return;
    const nameInput = input.value.trim();

    if (!nameInput) {
      alert("Vui lòng nhập tên trước khi gửi!");
      return;
    }

    try {
      const response = await fetch("/api/submit-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput }),
      });

      const result = await response.json();
      if (messageBox) messageBox.innerText = result.message || "";
    } catch (error) {
      console.error("Lỗi khi kết nối với server:", error);
      if (messageBox) messageBox.innerText = "Không thể kết nối đến Server.";
    }
  });
}

// ============================================================
// INITIAL UI
// ============================================================

updateBackgroundControls();
console.log("[Image Editor] Ready with Hole-Removal & Anti-Aliasing Enabled.");
