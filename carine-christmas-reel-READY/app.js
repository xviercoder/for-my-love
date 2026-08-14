const $ = (s) => document.querySelector(s);

const startButton = $("#startButton");
const garden = $("#garden");
const waterButton = $("#waterButton");
const waterCount = $("#waterCount");
const waterHint = $("#waterHint");
const gardenMessage = $("#gardenMessage");
const wateringCan = $("#wateringCan");
const waterStream = $("#waterStream");
const sakuraTree = $("#sakuraTree");
const secretNote = $("#secretNote");
const loveOverlay = $("#loveOverlay");
const heartParticles = $("#heartParticles");
const memoryOverlay = $("#memoryOverlay");
const memoryStage = $("#memoryStage");
const closeMemory = $("#closeMemory");
const viewer = $("#viewer");
const viewerContent = $("#viewerContent");
const viewerClose = $("#viewerClose");
const soundButton = $("#soundButton");
const ambientAudio = $("#ambientAudio");

const storyOverlay = $("#storyOverlay");
const storyScroll = $("#storyScroll");
const storyFrameStage = $("#storyFrameStage");
const storyLyricWrap = $("#storyLyricWrap");
const storyKicker = $("#storyKicker");
const storyLyric = $("#storyLyric");
const storySub = $("#storySub");
const storyProgressBar = $("#storyProgressBar");
const storyTime = $("#storyTime");
const storyTrack = $("#storyTrack");
const storyClose = $("#storyClose");

let wateringLevel = 0;
let wateringLocked = false;
let musicPlaying = false;
let lyricTimeline = [];
let memories = [];

let storyRunning = false;
let storyLyricIndex = -1;
let storyVisualIndex = -1;
let storyVisuals = [];
const STORY_DURATION = 30;
const STORY_VIDEO_START_HINT = 22.5;
const FRAME_TRANSITION_MS = 680;

const fallbackLyrics = [
  { start:0.00, end:3.00, style:"script", text:"Merry Christmas, I Miss You" },
  { start:5.60, end:7.80, style:"script", text:"So what if I call?" },
  { start:11.90, end:14.00, style:"serif", text:"And I use this holiday" },
  { start:14.10, end:16.60, style:"serif", text:"to make my way to your ghost" },
  { start:23.80, end:26.00, style:"script", text:"And I get the chance to say" },
  { start:26.00, end:28.60, style:"script", text:"Merry Christmas, I miss you" },
  { start:28.60, end:30.00, style:"small", text:"for Carine ♡" }
];

/*
  ==========================================
  MEDIA OTOMATIS — TIDAK PERLU EDIT FILE INI
  ==========================================

  FOTO:
  assets/media/photos/photo-01.jpg
  assets/media/photos/photo-02.jpg
  ...
  assets/media/photos/photo-12.jpg

  VIDEO:
  assets/media/videos/video-01.mp4
  ...
  assets/media/videos/video-06.mp4

  MUSIK:
  assets/media/music/music.mp3

  Website akan mengecek file-file tersebut otomatis.
*/

async function mediaExists(src) {
  try {
    const separator = src.includes("?") ? "&" : "?";
    const response = await fetch(`${src}${separator}check=${Date.now()}`, { method: "HEAD", cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

async function firstExisting(base, extensions) {
  for (const ext of extensions) {
    const src = `${base}.${ext}`;
    if (await mediaExists(src)) return src;
  }
  return null;
}

function freshSrc(src) {
  const separator = src.includes("?") ? "&" : "?";
  return `${src}${separator}v=${Date.now()}`;
}

async function discoverMemories() {
  try {
    const photoExts = ["jpg", "jpeg", "png", "webp"];

    // Cek semua kandidat secara paralel agar tidak menahan pembukaan story.
    const photoJobs = [];
    for (let i = 1; i <= 20; i++) {
      const n = String(i).padStart(2, "0");
      for (const ext of photoExts) {
        const src = `assets/media/photos/photo-${n}.${ext}`;
        photoJobs.push(
          mediaExists(src).then(ok => ok ? { order:i, type:"image", src } : null)
        );
      }
    }

    const videoJobs = [];
    for (let i = 1; i <= 1; i++) {
      const n = String(i).padStart(2, "0");
      const src = `assets/media/videos/video-${n}.mp4`;
      videoJobs.push(
        mediaExists(src).then(ok => ok ? { order:i, type:"video", src } : null)
      );
    }

    const checked = await Promise.all([...photoJobs, ...videoJobs]);
    const unique = new Map();

    checked.filter(Boolean).forEach(item => {
      const key = `${item.type}-${item.order}`;
      // Untuk foto, ekstensi pertama yang ditemukan per nomor yang dipakai.
      if (!unique.has(key)) unique.set(key, item);
    });

    memories = [...unique.values()]
      .sort((a,b) => a.type === b.type ? a.order - b.order : (a.type === "image" ? -1 : 1))
      .map(({type,src,order}) => ({type,src,order}));

    console.info(`[Carine] Media ditemukan: ${memories.filter(x => x.type === "image").length} foto, ${memories.filter(x => x.type === "video").length} video`);
    return memories;
  } catch (error) {
    console.warn("[Carine] Gagal scan media, story tetap berjalan.", error);
    memories = memories || [];
    return memories;
  }
}

function parseClock(value) {
  const raw = value.trim();
  if (!raw) return 0;
  const parts = raw.split(":").map(Number);
  if (parts.length === 2) return (parts[0] * 60) + parts[1];
  return Number(raw) || 0;
}

function normalizeLyricTimeline(lines) {
  if (!lines.length) return fallbackLyrics;
  const maxEnd = Math.max(...lines.map(item => item.end));
  if (!Number.isFinite(maxEnd) || maxEnd <= 0) return fallbackLyrics;

  const scale = STORY_DURATION / maxEnd;
  return lines.map(item => ({
    ...item,
    start: Number((item.start * scale).toFixed(2)),
    end: Number((item.end * scale).toFixed(2))
  }));
}

async function loadLyricTimeline() {
  try {
    const response = await fetch("assets/media/lyrics/lyrics.txt", { cache: "no-store" });
    if (!response.ok) throw new Error("lyrics.txt not found");

    const text = await response.text();
    const parsed = text
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("#"))
      .map(line => {
        const [start, end, style = "script", ...copy] = line.split("|");
        return {
          start: parseClock(start),
          end: parseClock(end),
          style: style.trim().toLowerCase(),
          text: copy.join("|").trim().replace(/\\n/g, "\n")
        };
      })
      .filter(item => Number.isFinite(item.start) && Number.isFinite(item.end) && item.end > item.start && item.text);

    lyricTimeline = normalizeLyricTimeline(parsed);
  } catch {
    lyricTimeline = fallbackLyrics;
  }
}

function formatTime(seconds) {
  const sec = Math.max(0, Math.floor(seconds));
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, "0");
  return `${String(m).padStart(2, "0")}:${s}`;
}

function lyricAt(time) {
  return lyricTimeline.findIndex(item => time >= item.start && time < item.end);
}

function pauseStageMedia() {
  [...storyFrameStage.querySelectorAll("video")].forEach(video => video.pause());
}

function resolveStoryVideoStart() {
  // Final video masuk tepat di boundary lyric berikutnya, bukan di tengah sebuah lyric/scene.
  const nextLyric = lyricTimeline.find(item => item.start >= STORY_VIDEO_START_HINT);
  return Math.min(STORY_DURATION, Math.max(0, nextLyric?.start ?? STORY_VIDEO_START_HINT));
}

function buildStoryVisuals() {
  const images = memories.filter(item => item.type === "image");
  const videos = memories.filter(item => item.type === "video");
  const imageByOrder = new Map(images.map(item => [item.order, item]));
  const photoSegments = [];
  const videoStart = resolveStoryVideoStart();

  // Setiap frame foto berganti tepat ketika lyric/scene berikutnya dimulai.
  const photoStops = [...lyricTimeline.filter(item => item.start < videoStart)];

  if (!photoStops.length) {
    const image = imageByOrder.get(1) || null;
    photoSegments.push({
      type: image ? "image" : "placeholder",
      src: image?.src || "",
      start: 0,
      end: videoStart,
      side: "left",
      label: image ? "photo 01" : "Masukkan photo-01.jpg ke assets/media/photos/"
    });
  } else {
    photoStops.forEach((item, index) => {
      const slot = index + 1;
      const image = imageByOrder.get(slot) || null;
      photoSegments.push({
        type: image ? "image" : "placeholder",
        src: image?.src || "",
        start: item.start,
        end: Math.min(item.end, videoStart),
        side: index % 2 === 0 ? "left" : "right",
        label: image ? `photo ${String(slot).padStart(2, "0")}` : `Masukkan photo-${String(slot).padStart(2, "0")}.jpg`
      });
    });
  }

  const finalVideo = videos.length ? [...videos].sort((a,b) => a.order - b.order).at(-1) : null;
  const allVisuals = [
    ...photoSegments,
    {
      type: finalVideo ? "video" : "video-placeholder",
      src: finalVideo?.src || "",
      start: videoStart,
      end: STORY_DURATION,
      side: "center",
      label: finalVideo ? "our christmas video" : "Masukkan video-01.mp4 di assets/media/videos/"
    }
  ];

  storyVisuals = allVisuals;

  const sectionCount = Math.max(7, lyricTimeline.length + 2);
  storyTrack.innerHTML = Array.from({ length: sectionCount }, (_, i) => {
    const cls = i === sectionCount - 1 ? "story-step story-step-end" : "story-step";
    return `<div class="${cls}"></div>`;
  }).join("");
}

function visualAt(time) {
  return storyVisuals.findIndex(item => time >= item.start && time < item.end);
}

function setLyricClasses(item, index) {
  storyLyric.className = "story-lyric";
  if (item.style === "serif") storyLyric.classList.add("story-lyric-serif");
  else if (item.style === "small") storyLyric.classList.add("story-lyric-small");
  else storyLyric.classList.add("story-lyric-script");

  storyLyricWrap.classList.remove("from-left", "from-right", "is-visible", "is-exit");
  storyLyricWrap.classList.add(index % 2 === 0 ? "from-left" : "from-right");
}

function showStoryLyric(index) {
  if (index === storyLyricIndex || index < 0) return;
  storyLyricIndex = index;
  const item = lyricTimeline[index];
  if (!item) return;

  storyLyricWrap.classList.remove("is-visible");
  storyLyricWrap.classList.add("is-exit");

  setTimeout(() => {
    setLyricClasses(item, index);
    storyLyric.textContent = item.text;
    storyKicker.textContent = index < lyricTimeline.length - 2 ? "scroll slowly" : "almost at the end";
    storySub.textContent = "";

    storyLyricWrap.classList.remove("is-exit");
    requestAnimationFrame(() => storyLyricWrap.classList.add("is-visible"));
  }, 120);
}

function hideStoryLyric() {
  if (storyLyricIndex === -1) return;
  storyLyricIndex = -1;
  storyLyricWrap.classList.remove("is-visible");
  storyLyricWrap.classList.add("is-exit");
}

function createFrameElement(item, index) {
  const frame = document.createElement("div");
  frame.className = `story-frame ${item.side === "center" ? "is-center" : item.side === "left" ? "is-left" : "is-right"}`;
  if (item.type === "video" || item.type === "video-placeholder") frame.classList.add("is-video-frame");
  frame.style.setProperty("--rot", item.side === "center" ? "0deg" : index % 2 === 0 ? "-3deg" : "3deg");
  frame.style.setProperty("--frameTransition", `${FRAME_TRANSITION_MS}ms`);
  frame.style.setProperty("--storyDuration", `${Math.max(3, item.end - item.start).toFixed(2)}s`);
  frame.style.setProperty("--floatX", item.side === "left" ? "10px" : item.side === "right" ? "-10px" : "0px");
  frame.style.setProperty("--floatY", item.side === "center" ? "-8px" : "-14px");
  frame.style.setProperty("--mediaStartX", item.side === "left" ? "-72px" : item.side === "right" ? "72px" : "0px");
  frame.style.setProperty("--mediaEndX", item.side === "left" ? "12px" : item.side === "right" ? "-12px" : "0px");
  frame.style.setProperty("--mediaStartRotate", item.side === "left" ? "-2.2deg" : item.side === "right" ? "2.2deg" : "0deg");
  frame.style.setProperty("--mediaEndRotate", item.side === "left" ? "0.8deg" : item.side === "right" ? "-0.8deg" : "0deg");

  const mat = document.createElement("div");
  mat.className = "story-frame-mat";

  const mediaWrap = document.createElement("div");
  mediaWrap.className = "story-frame-media";

  if (item.type === "image") {
    const img = document.createElement("img");
    img.src = freshSrc(item.src);
    img.alt = "Our memory";
    img.loading = "lazy";
    mediaWrap.appendChild(img);
  } else if (item.type === "video") {
    const video = document.createElement("video");
    video.src = freshSrc(item.src);
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.controls = false;
    mediaWrap.appendChild(video);
    setTimeout(() => video.play().catch(() => {}), 70);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "story-placeholder";
    placeholder.innerHTML = `<strong>${item.type === "video-placeholder" ? "Final Video" : "Photo Frame"}</strong><span>${item.label}</span>`;
    mediaWrap.appendChild(placeholder);
  }

  const caption = document.createElement("p");
  caption.className = "story-frame-caption";
  caption.textContent = item.label;

  mat.append(mediaWrap, caption);
  frame.appendChild(mat);
  return frame;
}

function showStoryVisual(index) {
  if (index === storyVisualIndex) return;
  storyVisualIndex = index;
  pauseStageMedia();

  const oldFrames = [...storyFrameStage.querySelectorAll(".story-frame")];
  oldFrames.forEach(el => {
    el.classList.remove("is-in");
    el.classList.add("is-out");
    // Exit dimulai tepat di akhir timestamp scene dan tidak dipotong sebelum transisi selesai.
    setTimeout(() => el.remove(), FRAME_TRANSITION_MS + 40);
  });

  // index -1 berarti sedang berada di gap antar lyric: frame lama cukup keluar.
  if (index < 0) return;

  const item = storyVisuals[index];
  if (!item) return;
  const frame = createFrameElement(item, index);
  storyFrameStage.appendChild(frame);

  // Dua RAF memastikan frame mulai dari posisi off-screen lalu masuk tepat di timestamp scene.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => frame.classList.add("is-in"));
  });
}

function updateStoryProgress() {
  if (!storyRunning) return;
  const max = Math.max(1, storyScroll.scrollHeight - storyScroll.clientHeight);
  const progress = storyScroll.scrollTop / max;
  const time = Math.min(STORY_DURATION, progress * STORY_DURATION);

  storyProgressBar.style.width = `${progress * 100}%`;
  storyTime.textContent = `${formatTime(time)} / 00:30`;

  const lyricIndex = lyricAt(time);
  if (lyricIndex >= 0) showStoryLyric(lyricIndex);
  else hideStoryLyric();

  const visualIndex = visualAt(time);
  showStoryVisual(visualIndex);
}

function finishStoryExperience(openGallery = true) {
  if (!storyRunning && !storyOverlay.classList.contains("open")) return;
  storyRunning = false;
  pauseStageMedia();
  storyOverlay.classList.remove("open");
  storyOverlay.setAttribute("aria-hidden", "true");
  storyScroll.scrollTop = 0;
  storyFrameStage.innerHTML = "";
  storyLyricWrap.classList.remove("is-visible", "is-exit", "from-left", "from-right");

  if (openGallery) {
    setTimeout(() => {
      buildMemories();
      memoryOverlay.classList.add("open");
      memoryOverlay.setAttribute("aria-hidden", "false");
    }, 260);
  }
}

async function startStoryExperience() {
  // Buka story SEGERA. Jangan tunggu proses scan media.
  storyRunning = true;
  storyVisualIndex = -1;
  storyLyricIndex = -1;
  storyFrameStage.innerHTML = "";
  storyProgressBar.style.width = "0%";
  storyTime.textContent = "00:00 / 00:30";
  storyScroll.scrollTop = 0;

  // Build dulu dari media yang sudah ada / placeholder.
  buildStoryVisuals();
  storyOverlay.classList.add("open");
  storyOverlay.setAttribute("aria-hidden", "false");
  updateStoryProgress();

  // Musik tidak boleh menggagalkan story.
  try {
    ambientAudio.pause();
    ambientAudio.currentTime = 0;
    ambientAudio.loop = false;
    await ambientAudio.play();
    musicPlaying = true;
    soundButton.textContent = "♫";
  } catch {
    musicPlaying = false;
  }

  // Scan media setelah overlay sudah terlihat, lalu refresh visual.
  try {
    await discoverMemories();
    if (!storyRunning) return;
    buildStoryVisuals();
    storyVisualIndex = -1;
    updateStoryProgress();
  } catch (error) {
    console.warn("[Carine] Media refresh gagal, placeholder tetap digunakan.", error);
  }
}

storyClose.addEventListener("click", () => finishStoryExperience(true));
storyScroll.addEventListener("scroll", updateStoryProgress, { passive: true });

const growthMessages = [
  "Bunganya masih tidur…",
  "Ada sesuatu yang mulai tumbuh 🌱",
  "Sedikit lagi… jangan berhenti.",
  "Batangnya mulai kuat.",
  "Hampir berbunga untuk Carine.",
  "Sekarang ia menjadi sakura ♡"
];

const growthHints = [
  "Tap to help it grow",
  "It likes your attention",
  "One more little drink",
  "Keep going",
  "Almost there…",
  "Look at the tree ♡"
];

startButton.addEventListener("click", () => {
  garden.scrollIntoView({ behavior: "smooth" });
});

function populateGround() {
  const grass = $("#grassClusters");
  const flowers = $("#tinyFlowers");

  for (let i = 0; i < 48; i++) {
    const el = document.createElement("i");
    el.className = "grass";
    el.style.setProperty("--left", `${4 + Math.random() * 92}%`);
    el.style.setProperty("--bottom", `${4 + Math.random() * 72}%`);
    el.style.setProperty("--rot", `${-24 + Math.random() * 48}deg`);
    grass.appendChild(el);
  }

  for (let i = 0; i < 20; i++) {
    const el = document.createElement("i");
    el.className = "mini-flower";
    el.style.setProperty("--left", `${5 + Math.random() * 90}%`);
    el.style.setProperty("--bottom", `${7 + Math.random() * 67}%`);
    el.style.transform = `scale(${.55 + Math.random() * .65})`;
    flowers.appendChild(el);
  }
}

function splashWater() {
  wateringCan.classList.add("active");
  setTimeout(() => waterStream.classList.add("active"), 200);
  setTimeout(() => waterStream.classList.remove("active"), 900);
  setTimeout(() => wateringCan.classList.remove("active"), 1050);
}

waterButton.addEventListener("click", () => {
  if (wateringLocked || wateringLevel >= 5) return;

  wateringLocked = true;
  splashWater();

  setTimeout(() => {
    wateringLevel++;
    waterCount.textContent = wateringLevel;
    sakuraTree.className.baseVal = `sakura-tree stage-${wateringLevel}`;
    gardenMessage.textContent = growthMessages[wateringLevel];
    waterHint.textContent = growthHints[wateringLevel];

    if (wateringLevel === 5) {
      waterButton.classList.add("grown");
      launchPetals(34);
      setTimeout(() => secretNote.classList.add("visible"), 850);
    }

    wateringLocked = false;
  }, 640);
});

function launchPetals(amount = 20) {
  const host = $("#floatingPetals");
  for (let i = 0; i < amount; i++) {
    const p = document.createElement("i");
    p.className = "petal";
    p.style.left = `${Math.random() * 100}%`;
    p.style.setProperty("--duration", `${5 + Math.random() * 5}s`);
    p.style.setProperty("--drift", `${-90 + Math.random() * 180}px`);
    p.style.animationDelay = `${Math.random() * 2.2}s`;
    host.appendChild(p);
    setTimeout(() => p.remove(), 12000);
  }
}

function createHeartBurst() {
  heartParticles.innerHTML = "";
  const colors = ["#ffb4d1", "#f477a7", "#ffd4e4", "#e55d94", "#fff2f7"];
  for (let i = 0; i < 34; i++) {
    const dot = document.createElement("i");
    dot.className = "heart-particle";
    const angle = (Math.PI * 2 * i) / 34 + Math.random() * .3;
    const dist = 95 + Math.random() * 170;
    dot.style.setProperty("--x", `${Math.cos(angle) * dist}px`);
    dot.style.setProperty("--y", `${Math.sin(angle) * dist}px`);
    dot.style.setProperty("--c", colors[Math.floor(Math.random() * colors.length)]);
    dot.style.animationDelay = `${.45 + Math.random() * .25}s`;
    heartParticles.appendChild(dot);
  }
}

secretNote.addEventListener("click", () => {
  secretNote.classList.remove("visible");
  createHeartBurst();
  loveOverlay.classList.add("show");

  setTimeout(() => {
    loveOverlay.classList.remove("show");
    startStoryExperience();
  }, 1220);
});

function buildMemories() {
  memoryStage.innerHTML = "";

  const items = memories.length ? memories : [
    { type:"placeholder", label:"Belum ada media. Masukkan photo-01.jpg ke assets/media/photos/" },
    { type:"placeholder", label:"Tambahkan photo-02.jpg, photo-03.jpg, dan seterusnya." },
    { type:"placeholder", label:"Video masuk ke assets/media/videos/ dengan nama video-01.mp4." },
    { type:"placeholder", label:"Tidak perlu mengedit kode. Website mendeteksi media otomatis." }
  ];

  items.forEach((item, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `memory-card ${item.type === "video" ? "video-card" : ""} ${item.type === "placeholder" ? "placeholder" : ""}`;
    card.style.setProperty("--sx", `${-160 + Math.random()*320}px`);
    card.style.setProperty("--sy", `${-170 + Math.random()*240}px`);
    card.style.setProperty("--r", `${-20 + Math.random()*40}deg`);
    card.style.setProperty("--delay", `${.08 + index*.1}s`);

    if (item.type === "image") {
      const img = document.createElement("img");
      img.src = freshSrc(item.src);
      img.alt = `Memory ${index + 1}`;
      img.loading = "lazy";
      card.appendChild(img);
      card.addEventListener("click", () => openViewer(item));
    } else if (item.type === "video") {
      const video = document.createElement("video");
      video.src = freshSrc(item.src);
      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";
      card.appendChild(video);
      card.addEventListener("click", () => openViewer(item));
    } else {
      const label = document.createElement("span");
      label.textContent = item.label;
      card.appendChild(label);
    }

    memoryStage.appendChild(card);
  });
}

function openViewer(item) {
  viewerContent.innerHTML = "";

  if (item.type === "image") {
    const img = document.createElement("img");
    img.src = freshSrc(item.src);
    img.alt = "Our memory";
    viewerContent.appendChild(img);
  }

  if (item.type === "video") {
    const video = document.createElement("video");
    video.src = freshSrc(item.src);
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    viewerContent.appendChild(video);
  }

  viewer.classList.add("open");
  viewer.setAttribute("aria-hidden","false");
}

function closeViewer() {
  const video = viewerContent.querySelector("video");
  if (video) video.pause();
  viewer.classList.remove("open");
  viewer.setAttribute("aria-hidden","true");
  viewerContent.innerHTML = "";
}

viewerClose.addEventListener("click", closeViewer);
viewer.addEventListener("click", (event) => {
  if (event.target === viewer) closeViewer();
});

closeMemory.addEventListener("click", () => {
  memoryOverlay.classList.remove("open");
  memoryOverlay.setAttribute("aria-hidden","true");
  setTimeout(() => secretNote.classList.add("visible"), 650);
});

soundButton.addEventListener("click", async () => {
  if (!musicPlaying) {
    try {
      await ambientAudio.play();
      musicPlaying = true;
      soundButton.textContent = "♫";
    } catch {
      alert("Tambahkan file assets/media/music/music.mp3 terlebih dahulu jika ingin memakai musik.");
    }
  } else {
    ambientAudio.pause();
    musicPlaying = false;
    soundButton.textContent = "♪";
  }
});

ambientAudio.addEventListener("ended", () => {
  musicPlaying = false;
  soundButton.textContent = "♪";
});

setInterval(() => {
  if (wateringLevel === 5 && !document.hidden) launchPetals(3);
}, 3600);

(async function init() {
  await Promise.all([discoverMemories(), loadLyricTimeline()]);
  populateGround();
})();
