const canvas = document.getElementById("canvas1");
const ctx = canvas.getContext("2d");
const newCanVas = document.getElementById("canvas2");
const ctxNew = newCanVas.getContext("2d");

const imageInput = document.getElementById("imageInput");

const removeWhiteBG_button = document.getElementById("removeWhiteBG");
const editButton = document.getElementById("edit");
const startButton = document.getElementById("start");
const downLoadLink = document.getElementById("downLoadLink");

let imageResult = null;
let choose = null;
let Avg;
let newWidth;
let newHeight;
let offSetX;
let offSetY;

imageInput.addEventListener("input", function (e) {
  downLoadLink.style.display = "none";
  newCanVas.style.display = "none";

  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
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
});

removeWhiteBG_button.addEventListener("click", function () {
  choose = "removeWhite";
  removeWhiteBG_button.style.backgroundColor = "#093654";
  editButton.style.backgroundColor = "#3498db";
});

editButton.addEventListener("click", function () {
  choose = "edit";
  removeWhiteBG_button.style.backgroundColor = "#3498db";
  editButton.style.backgroundColor = "#093654";
});

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

// xóa nền trắng
function reMoveWhiteBG() {
  const imageData = ctxNew.getImageData(offSetX, offSetY, newWidth, newHeight);
  const data = imageData.data;

  const toneRange = { r: [240, 255], g: [240, 255], b: [240, 255] };

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isTrueColor(r, g, b, toneRange)) {
      data[i + 3] = 0;
    }
  }
  ctxNew.putImageData(imageData, offSetX, offSetY);
  newCanVas.style.display = "block";
}

// edit ảnh
function editImage() {
  const imageData = ctxNew.getImageData(offSetX, offSetY, newWidth, newHeight);
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

  ctxNew.putImageData(imageData, offSetX, offSetY);
  newCanVas.style.display = "block";
}

function enableDownloadLink() {
  const dataURL = newCanVas.toDataURL("image/png");
  downLoadLink.href = dataURL;
  downLoadLink.download = "removed-bg.png";
  downLoadLink.style.display = "inline";
}

// Bắt đầu chỉnh ảnh
startButton.addEventListener("click", function () {
  if (!imageResult || choose == null) {
    return;
  }

  ctxNew.clearRect(0, 0, newCanVas.width, newCanVas.height);
  ctxNew.drawImage(imageResult, offSetX, offSetY, newWidth, newHeight);

  if (choose == "removeWhite") {
    reMoveWhiteBG();
    enableDownloadLink();
  } else if (choose == "edit") {
    editImage();
    enableDownloadLink();
  }
});
