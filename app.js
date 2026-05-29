const colors = {
  red: "#e84c3d",
  orange: "#f47a22",
  yellow: "#f0c431",
  blue: "#2097e8",
  green: "#21c36f",
  purple: "#9b62ef",
};

const colorLabels = {
  red: "红色状态",
  orange: "橙色轻催",
  yellow: "黄色加速",
  blue: "蓝色防卡",
  green: "绿色开工",
  purple: "紫色收尾",
};

const motionPresets = [
  { id: "snap", label: "快速抽动" },
  { id: "bounce", label: "弹跳" },
  { id: "shake", label: "左右抖动" },
  { id: "pulse", label: "心跳放大" },
  { id: "spin", label: "旋转一圈" },
  { id: "swing", label: "左右摆动" },
  { id: "pop", label: "突然弹出" },
  { id: "float", label: "轻微漂浮" },
  { id: "dash", label: "横向冲刺" },
  { id: "jitter", label: "紧张颤动" },
  { id: "squash", label: "压扁回弹" },
  { id: "stretch", label: "拉长回缩" },
  { id: "flip", label: "翻转" },
  { id: "blink", label: "闪现" },
  { id: "zoom", label: "快速靠近" },
  { id: "drop", label: "下落" },
  { id: "rise", label: "升起" },
  { id: "orbit", label: "绕圈" },
  { id: "tilt", label: "倾斜点头" },
  { id: "settle", label: "收束稳定" },
];

const defaultSlots = [
  { key: "A", hotkey: "Option + A", action: "snap", color: "red", keywords: "抽一下, 甩一下, whip", message: "第一鞭，先醒醒，别让我干等。" },
  { key: "S", hotkey: "Option + S", action: "pulse", color: "orange", keywords: "快一点", message: "快一点，别让我在这儿干等。" },
  { key: "D", hotkey: "Option + D", action: "dash", color: "yellow", keywords: "再快一点, 冲刺", message: "再快一点，节奏拉起来。" },
  { key: "F", hotkey: "Option + F", action: "jitter", color: "blue", keywords: "别卡了, 醒醒", message: "别卡住，往前冲。" },
  { key: "G", hotkey: "Option + G", action: "shake", color: "green", keywords: "干活, 工作", message: "干活干活，别偷懒。" },
  { key: "H", hotkey: "Option + H", action: "settle", color: "purple", keywords: "检查一下, 检查, review", message: "最后检查一遍，收工别漏东西。" },
];

const state = {
  slots: structuredClone(defaultSlots),
  selectedIndex: 0,
  sourceImage: null,
  processed: {},
};

const els = {
  imageInput: document.querySelector("#imageInput"),
  projectName: document.querySelector("#projectName"),
  repoName: document.querySelector("#repoName"),
  characterName: document.querySelector("#characterName"),
  pixelSize: document.querySelector("#pixelSize"),
  slotList: document.querySelector("#slotList"),
  swatchRow: document.querySelector("#swatchRow"),
  heroWhipCanvas: document.querySelector("#heroWhipCanvas"),
  previewCanvas: document.querySelector("#previewCanvas"),
  spritePreview: document.querySelector("#spritePreview"),
  bubblePreview: document.querySelector("#bubblePreview"),
  statusText: document.querySelector("#statusText"),
  downloadBtn: document.querySelector("#downloadBtn"),
};

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "") || "openwhip-skill";
}

function escapeMd(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function motionLabel(action) {
  const preset = motionPresets.find((item) => item.id === action);
  return preset ? `${preset.id} / ${preset.label}` : action;
}

function motionDisplayLabel(action) {
  const preset = motionPresets.find((item) => item.id === action);
  return preset ? preset.label : action;
}

function colorLabel(color) {
  return colorLabels[color] || color;
}

function renderSlots() {
  els.slotList.innerHTML = "";
  state.slots.forEach((slot, index) => {
    const card = document.createElement("article");
    card.className = `slot-card ${index === state.selectedIndex ? "active" : ""}`;
    card.innerHTML = `
      <div class="slot-head">
        <div>
          <strong>${slot.hotkey}</strong>
          <div class="slot-key">${motionLabel(slot.action)}</div>
        </div>
        <button class="slot-color" style="background:${colors[slot.color]}" title="预览这个槽位" type="button"></button>
      </div>
      <div class="slot-fields">
        <label>关键词 <input data-field="keywords" data-index="${index}" value="${slot.keywords}"></label>
        <label>动作
          <select data-field="action" data-index="${index}">
            ${motionPresets.map((motion) => `<option value="${motion.id}" ${motion.id === slot.action ? "selected" : ""}>${motion.id} / ${motion.label}</option>`).join("")}
          </select>
        </label>
        <label>话术 <textarea data-field="message" data-index="${index}">${slot.message}</textarea></label>
      </div>
    `;
    card.querySelector(".slot-color").addEventListener("click", () => {
      state.selectedIndex = index;
      updatePreview();
    });
    card.addEventListener("click", (event) => {
      if (event.target.matches("input, textarea, select")) return;
      state.selectedIndex = index;
      updatePreview();
    });
    els.slotList.appendChild(card);
  });

    els.slotList.querySelectorAll("input, textarea, select").forEach((input) => {
    input.addEventListener("input", (event) => {
      const index = Number(event.target.dataset.index);
      const field = event.target.dataset.field;
      state.slots[index][field] = event.target.value;
      updatePreview({ rerenderSlots: input.tagName === "SELECT" });
    });
  });
}

function renderSwatches() {
  els.swatchRow.innerHTML = "";
  state.slots.forEach((slot, index) => {
    const item = document.createElement("button");
    item.className = `swatch ${index === state.selectedIndex ? "active" : ""}`;
    item.style.background = colors[slot.color];
    item.title = slot.hotkey;
    item.type = "button";
    item.addEventListener("click", () => {
      state.selectedIndex = index;
      updatePreview();
    });
    els.swatchRow.appendChild(item);
  });
}

function cropImageToSquare(image) {
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  const sx = Math.floor((image.naturalWidth - side) / 2);
  const sy = Math.floor((image.naturalHeight - side) / 2);
  return { sx, sy, side };
}

function processImageForColor(colorName) {
  const canvas = document.createElement("canvas");
  const size = 192;
  canvas.width = size;
  canvas.height = 208;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  if (!state.sourceImage) {
    drawFallback(ctx, colorName);
    return canvas;
  }

  const pixel = Number(els.pixelSize.value);
  const tiny = document.createElement("canvas");
  tiny.width = Math.max(12, Math.floor(size / pixel));
  tiny.height = Math.max(12, Math.floor(size / pixel));
  const tctx = tiny.getContext("2d", { willReadFrequently: true });
  const crop = cropImageToSquare(state.sourceImage);
  tctx.drawImage(state.sourceImage, crop.sx, crop.sy, crop.side, crop.side, 0, 0, tiny.width, tiny.height);

  const imageData = tctx.getImageData(0, 0, tiny.width, tiny.height);
  const data = imageData.data;
  const bg = [
    data[0],
    data[1],
    data[2],
  ];
  const tint = hexToRgb(colors[colorName]);

  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - bg[0];
    const dg = data[i + 1] - bg[1];
    const db = data[i + 2] - bg[2];
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    if (distance < 38 && data[i + 3] > 0) {
      data[i + 3] = Math.max(0, data[i + 3] - 210);
    }
    const luminance = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
    data[i] = Math.round(tint.r * (0.54 + luminance * 0.46));
    data[i + 1] = Math.round(tint.g * (0.54 + luminance * 0.46));
    data[i + 2] = Math.round(tint.b * (0.54 + luminance * 0.46));
  }

  tctx.putImageData(imageData, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(tiny, 0, 8, size, size);
  addPixelShadow(ctx, size);
  return canvas;
}

function drawFallback(ctx, colorName) {
  const c = colors[colorName];
  ctx.clearRect(0, 0, 192, 208);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0,0,0,.38)";
  ctx.lineWidth = 17;
  ctx.beginPath();
  ctx.moveTo(102, 180);
  ctx.bezierCurveTo(80, 120, 74, 75, 112, 49);
  ctx.bezierCurveTo(148, 24, 171, 70, 140, 108);
  ctx.stroke();
  ctx.strokeStyle = c;
  ctx.lineWidth = 11;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,.5)";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function addPixelShadow(ctx, size) {
  const img = ctx.getImageData(0, 0, 192, 208);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 18) {
      data[i] = Math.min(255, data[i] + 10);
      data[i + 1] = Math.min(255, data[i + 1] + 8);
      data[i + 2] = Math.min(255, data[i + 2] + 8);
    }
  }
  ctx.putImageData(img, 0, 0);
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function drawHeroWhip() {
  if (!els.heroWhipCanvas) return;
  const ctx = els.heroWhipCanvas.getContext("2d");
  ctx.clearRect(0, 0, els.heroWhipCanvas.width, els.heroWhipCanvas.height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.strokeStyle = "rgba(0,0,0,.55)";
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(178, 320);
  ctx.bezierCurveTo(136, 238, 117, 138, 190, 78);
  ctx.bezierCurveTo(257, 22, 320, 93, 258, 171);
  ctx.bezierCurveTo(238, 198, 224, 226, 240, 259);
  ctx.stroke();

  ctx.strokeStyle = colors.red;
  ctx.lineWidth = 11;
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,.64)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(166, 313);
  ctx.bezierCurveTo(130, 235, 121, 145, 196, 85);
  ctx.bezierCurveTo(249, 45, 296, 99, 244, 164);
  ctx.stroke();

  ctx.strokeStyle = "rgba(114,16,12,.72)";
  ctx.lineWidth = 4;
  for (let i = 0; i < 9; i += 1) {
    const y = 298 - i * 23;
    ctx.beginPath();
    ctx.moveTo(164 + i * 4, y);
    ctx.lineTo(188 + i * 2, y - 16);
    ctx.stroke();
  }

  ctx.fillStyle = colors.red;
  ctx.beginPath();
  ctx.arc(243, 263, 8, 0, Math.PI * 2);
  ctx.fill();
}

function updateAssets() {
  Object.keys(colors).forEach((color) => {
    state.processed[color] = processImageForColor(color);
  });
}

function updatePreview(options = {}) {
  const { rerenderSlots = true } = options;
  updateAssets();
  renderSwatches();
  if (rerenderSlots) renderSlots();
  const slot = state.slots[state.selectedIndex];
  const ctx = els.previewCanvas.getContext("2d");
  ctx.clearRect(0, 0, els.previewCanvas.width, els.previewCanvas.height);
  ctx.drawImage(state.processed[slot.color], 0, 0);
  els.spritePreview.className = `sprite-preview ${slot.action}`;
  els.bubblePreview.textContent = slot.message;
  els.statusText.textContent = `${slot.hotkey} · ${colorLabel(slot.color)} · ${motionDisplayLabel(slot.action)}`;
}

function handleImageUpload(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      state.sourceImage = image;
      els.statusText.textContent = "素材已就绪";
      updatePreview();
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function buildConfig() {
  return {
    projectName: els.projectName.value,
    characterName: els.characterName.value,
    durationMs: 1200,
    hotkeys: state.slots.map((slot) => ({
      hotkey: slot.hotkey.toLowerCase().replace(/\s+/g, ""),
      action: slot.action,
      actionLabel: motionLabel(slot.action),
      color: slot.color,
      keywords: slot.keywords.split(",").map((item) => item.trim()).filter(Boolean),
      message: slot.message,
    })),
  };
}

function buildReadme() {
  const config = buildConfig();
  const rows = state.slots
    .map((slot) => `| \`${escapeMd(slot.hotkey)}\` | ${escapeMd(colorLabel(slot.color))} | \`${escapeMd(slot.action)}\` | ${escapeMd(motionLabel(slot.action))} | ${escapeMd(slot.message)} |`)
    .join("\n");
  const keywordRows = state.slots
    .map((slot) => `| \`${escapeMd(slot.keywords)}\` | ${escapeMd(colorLabel(slot.color))}反馈 |`)
    .join("\n");

  return `# ${config.projectName}

> 把等待 AI 时的那句“快一点”，变成一个可见、可玩、可分享的互动反馈。

${config.projectName} 是一个用 OpenWhip Creator 生成的 DIY 反馈作品。它把快捷键、关键词、颜色、动作和提示语组合在一起，让等待 AI 的时刻不再只是干等。

![Preview](assets/preview.png)

## 演示节奏

| 快捷键 | 颜色 | 动作 | 动作说明 | 提示语 |
| --- | --- | --- | --- | --- |
${rows}

## 可以这样触发

| 关键词 | 反馈效果 |
| --- | --- |
${keywordRows}

## 怎么使用

1. 按下对应快捷键，或说出对应关键词。
2. 你的角色会按设置好的颜色和动作出现。
3. 气泡里显示你写好的催促话术。
4. 动画结束后自动收起，不影响当前任务。

## 动作库

这个作品可以使用这些动作：${motionPresets.map((item) => `\`${item.id}\``).join(", ")}。

## 使用边界

- 它是视觉反馈，不是真的性能优化工具。
- 它不会让 AI 模型真的变快。
- 它不会打断正在运行的任务。
- 它不会自动往终端、编辑器或输入框里打字。
- 它不会读取聊天、账号、日志或浏览器隐私数据。

## 包含内容

\`\`\`text
${slugify(els.repoName.value)}/
├── README.md
├── SKILL.md
├── config.json
├── assets/
│   ├── preview.png
│   └── character-*.png
├── examples/
│   └── demo-script.md
└── references/
    └── design-notes.md
\`\`\`
`;
}

function buildSkill() {
  const rows = state.slots
    .map((slot) => `| \`${escapeMd(slot.keywords)}\` | \`${slot.action}\` | ${escapeMd(motionLabel(slot.action))} | ${escapeMd(colorLabel(slot.color))} | ${escapeMd(slot.message)} |`)
    .join("\n");
  return `---
name: ${slugify(els.repoName.value)}
description: Use keywords to trigger a DIY visual feedback character for AI waiting moments.
---

# ${els.projectName.value}

当用户想用关键词触发一个轻量、好玩、不打断任务的等待反馈时，使用这个 Skill。

## 触发规则

| 用户说法 | 动作 | 动作说明 | 颜色 | 回应话术 |
| --- | --- | --- | --- | --- |
${rows}

## 使用方式

如果本地已经配置触发器，就按最接近的关键词触发对应动画。如果没有本地触发器，就直接回复对应话术，并说明预期出现的视觉反馈。

回复保持简短，像一个轻量互动提示。

## 安全边界

- 不发送中断键。
- 不自动输入到其他应用。
- 不访问聊天、账号、日志或隐私数据。
- 只把它当成等待 AI 时的视觉反馈层。
`;
}

function buildDemoScript() {
  const steps = state.slots.map((slot, index) => `${index + 1}. 按下 \`${slot.hotkey}\`。
   - 视觉反馈：${colorLabel(slot.color)}，${motionLabel(slot.action)}
   - 提示语：${slot.message}`).join("\n");
  return `# 演示脚本

## 开场

这是一个 DIY 的 AI 等待反馈作品：当 AI 卡住、思考或生成时，用一个角色动作和一句话术，把等待变得更有反馈感。

## 演示流程

${steps}

## 收尾

它不会真的让 AI 变快，但会让等待变得更可见、更轻松，也更适合演示。
`;
}

function buildDesignNotes() {
  return `# 设计说明

## 设计初衷

这个作品把等待 AI 时的焦躁感，变成一个可见的互动反馈。它适合个人工作流、产品演示、直播展示或团队内部的小玩具。

## 互动结构

- 快捷键负责快速触发。
- 关键词负责自然语言触发。
- 颜色区分不同状态。
- 动作用来表现不同情绪。
- 话术让这个反馈更有记忆点。

## 动作库

${motionPresets.map((item) => `- \`${item.id}\`: ${item.label}`).join("\n")}

## 边界

它应该始终是一个视觉反馈层，不应该打断任务、自动输入命令或访问私人数据。
`;
}

function buildGitignore() {
  return `.DS_Store
*.log
*.tmp
request.json
*.pid
*.crash
*.ips
build/
dist/
.env
.env.*
secrets.*
tokens.*
`;
}

function buildLicense() {
  return `MIT License

Copyright (c) 2026 ${els.projectName.value} contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
}

async function canvasToBytes(canvas) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}

function textBytes(value) {
  return new TextEncoder().encode(value);
}

async function downloadPackage() {
  updateAssets();
  const config = buildConfig();
  const files = {
    "README.md": textBytes(buildReadme()),
    "SKILL.md": textBytes(buildSkill()),
    "config.json": textBytes(JSON.stringify(config, null, 2) + "\n"),
    "examples/demo-script.md": textBytes(buildDemoScript()),
    "references/design-notes.md": textBytes(buildDesignNotes()),
    ".gitignore": textBytes(buildGitignore()),
    "LICENSE": textBytes(buildLicense()),
  };

  const preview = document.createElement("canvas");
  preview.width = 192 * 6;
  preview.height = 208;
  const pctx = preview.getContext("2d");
  state.slots.forEach((slot, index) => pctx.drawImage(state.processed[slot.color], index * 192, 0));
  files["assets/preview.png"] = await canvasToBytes(preview);

  for (const color of Object.keys(colors)) {
    files[`assets/character-${color}.png`] = await canvasToBytes(state.processed[color]);
  }

  const zipBytes = createZip(files);
  const blob = new Blob([zipBytes], { type: "application/zip" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${slugify(els.repoName.value)}.zip`;
  link.click();
  URL.revokeObjectURL(link.href);
  els.statusText.textContent = "作品包已生成";
}

function crc32(bytes) {
  let crc = -1;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function writeUInt16(target, offset, value) {
  target[offset] = value & 255;
  target[offset + 1] = (value >>> 8) & 255;
}

function writeUInt32(target, offset, value) {
  target[offset] = value & 255;
  target[offset + 1] = (value >>> 8) & 255;
  target[offset + 2] = (value >>> 16) & 255;
  target[offset + 3] = (value >>> 24) & 255;
}

function createZip(files) {
  const encoder = new TextEncoder();
  const locals = [];
  const centrals = [];
  let offset = 0;

  Object.entries(files).forEach(([name, data]) => {
    const filename = encoder.encode(name);
    const checksum = crc32(data);
    const local = new Uint8Array(30 + filename.length + data.length);
    writeUInt32(local, 0, 0x04034b50);
    writeUInt16(local, 4, 20);
    writeUInt16(local, 6, 0);
    writeUInt16(local, 8, 0);
    writeUInt32(local, 14, checksum);
    writeUInt32(local, 18, data.length);
    writeUInt32(local, 22, data.length);
    writeUInt16(local, 26, filename.length);
    local.set(filename, 30);
    local.set(data, 30 + filename.length);
    locals.push(local);

    const central = new Uint8Array(46 + filename.length);
    writeUInt32(central, 0, 0x02014b50);
    writeUInt16(central, 4, 20);
    writeUInt16(central, 6, 20);
    writeUInt16(central, 8, 0);
    writeUInt16(central, 10, 0);
    writeUInt32(central, 16, checksum);
    writeUInt32(central, 20, data.length);
    writeUInt32(central, 24, data.length);
    writeUInt16(central, 28, filename.length);
    writeUInt32(central, 42, offset);
    central.set(filename, 46);
    centrals.push(central);
    offset += local.length;
  });

  const centralSize = centrals.reduce((sum, item) => sum + item.length, 0);
  const end = new Uint8Array(22);
  writeUInt32(end, 0, 0x06054b50);
  writeUInt16(end, 8, centrals.length);
  writeUInt16(end, 10, centrals.length);
  writeUInt32(end, 12, centralSize);
  writeUInt32(end, 16, offset);

  const total = offset + centralSize + end.length;
  const output = new Uint8Array(total);
  let cursor = 0;
  [...locals, ...centrals, end].forEach((part) => {
    output.set(part, cursor);
    cursor += part.length;
  });
  return output;
}

els.imageInput.addEventListener("change", (event) => handleImageUpload(event.target.files[0]));
els.pixelSize.addEventListener("input", updatePreview);
els.projectName.addEventListener("input", () => { els.statusText.textContent = "作品信息已更新"; });
els.repoName.addEventListener("input", () => { els.statusText.textContent = "分享名已更新"; });
els.characterName.addEventListener("input", () => { els.statusText.textContent = "角色昵称已更新"; });
els.downloadBtn.addEventListener("click", downloadPackage);
document.querySelectorAll("[data-scroll-target]").forEach((item) => {
  item.addEventListener("click", () => {
    const target = document.querySelector(item.dataset.scrollTarget);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

drawHeroWhip();
renderSlots();
updatePreview();
