const canvas = document.getElementById("focusCanvas");
const ctx = canvas.getContext("2d");
const i18nNodes = Array.from(document.querySelectorAll("[data-i18n]"));

const controlIds = [
  "domeStrength",
  "refractiveBias",
  "temperature",
  "domeTilt",
  "domeGap",
  "screenOffset",
  "rayCount",
  "followLens",
  "followAmount",
];

const controls = Object.fromEntries(controlIds.map((id) => [id, document.getElementById(id)]));

const outputs = {
  domeStrength: document.getElementById("domeStrengthValue"),
  refractiveBias: document.getElementById("refractiveBiasValue"),
  temperature: document.getElementById("temperatureValue"),
  domeTilt: document.getElementById("domeTiltValue"),
  domeGap: document.getElementById("domeGapValue"),
  screenOffset: document.getElementById("screenOffsetValue"),
  rayCount: document.getElementById("rayCountValue"),
  followAmount: document.getElementById("followAmountValue"),
  objectDistance: document.getElementById("objectDistanceValue"),
  focusDistance: document.getElementById("focusDistanceValue"),
  focalLength: document.getElementById("focalLengthValue"),
  temperatureShift: document.getElementById("temperatureShiftValue"),
  axisShift: document.getElementById("axisShiftValue"),
  domePenalty: document.getElementById("domePenaltyValue"),
  blurRadius: document.getElementById("blurRadiusValue"),
  sharpness: document.getElementById("sharpnessValue"),
  mode: document.getElementById("modeValue"),
};

const LENS_SPEC = {
  focalLengthMm: 2.8,
  fNumber: 2.0,
  hfovDeg: 99,
  vfovDeg: 74,
  minFocusM: 1.0,
  pixelPitchUm: 2.0,
};

LENS_SPEC.apertureDiameterMm = LENS_SPEC.focalLengthMm / LENS_SPEC.fNumber;
LENS_SPEC.sensorWidthMm = 2 * LENS_SPEC.focalLengthMm * Math.tan((LENS_SPEC.hfovDeg * Math.PI) / 360);
LENS_SPEC.sensorHeightMm = 2 * LENS_SPEC.focalLengthMm * Math.tan((LENS_SPEC.vfovDeg * Math.PI) / 360);

const defaults = {
  domeStrength: 1.2,
  refractiveBias: 1.1,
  temperature: 20,
  domeTilt: 0.4,
  domeGap: 4.0,
  screenOffset: 12,
  rayCount: 5,
  followLens: false,
  followAmount: 0.24,
};

const state = {
  dpr: Math.max(1, window.devicePixelRatio || 1),
  viewport: { width: 0, height: 0 },
  pointer: { x: 120, y: 0, inside: false },
  dragSubject: false,
  dragLens: false,
  dragOverlay: false,
  overlay: {
    offsetX: 0,
    offsetY: 0,
    dragOffsetX: 0,
    dragOffsetY: 0,
  },
  language: "en",
  lens: {
    x: 0,
    targetX: 0,
    radius: 58,
    aperture: 210,
  },
  object: {
    x: 120,
    y: -40,
  },
  controlValues: { ...defaults },
  lastOptics: null,
};

const translations = {
  en: {
    eyebrow: "Interactive Optics Study",
    title: "M12 Dome Camera Focus",
    helperText:
      "Drag the subject in the scene and drag the lens toward or away from the fixed sensor to see how a 2.8 mm F2.0 M12 camera lens changes subject clarity, focus distance, sensor blur, and thermal focus drift under a dome front element.",
    languageLabel: "Language",
    legendSubject: "Subject",
    legendRays: "Refracted rays",
    legendDomeCover: "Dome cover",
    legendImagePlane: "Image plane",
    legendSensorPlane: "Sensor plane",
    cameraLensTitle: "Camera Lens",
    nominalLensLabel: "Nominal lens",
    fovLabel: "Field of view",
    minFocusLabel: "Minimum focus",
    mountLabel: "Mount",
    lensTuningTitle: "Lens Tuning",
    lensPowerBiasLabel: "Lens power bias",
    lensAberrationBiasLabel: "Lens aberration bias",
    realDomeInfluenceTitle: "Real Dome Influence",
    domeTiltLabel: "Dome tilt",
    domeGapLabel: "Dome-to-lens gap",
    lensTemperatureLabel: "Lens temperature",
    sceneDepthSpanLabel: "Scene depth span",
    rayCountLabel: "Ray count",
    interactionTitle: "Interaction",
    lensFollowCursorLabel: "Lens follow cursor",
    followAmountLabel: "Follow amount",
    resetSceneLabel: "Reset Scene",
    liveReadoutTitle: "Live Readout",
    subjectDistanceLabel: "Subject distance",
    focusSetDistanceLabel: "Focus set distance",
    effectiveFocalLengthLabel: "Effective focal length",
    thermalFocusShiftLabel: "Thermal focus shift",
    opticalAxisShiftLabel: "Optical axis shift",
    domeEdgePenaltyLabel: "Dome edge penalty",
    sensorBlurCircleLabel: "Sensor blur circle",
    sharpnessLabel: "Sharpness",
    modeLabel: "Mode",
    canvasSubject: "Subject",
    canvasSensorPlane: "Sensor plane",
    canvasSensorPreview: "Sensor preview",
    canvasDepthRange: "Depth range 1 m to {distance}",
    canvasSubjectDistance: "Subject {distance}",
    canvasActualImagePlane: "Actual image plane",
    canvasOpticalAxis: "Optical axis",
    canvasCameraModel: "99° H / 74° V camera model",
    canvasFarStop: "{distance} stop",
    canvasNearStop: "1 m stop",
    canvasFocusTravel: "Focus travel",
    modeIdle: "Idle",
    modeDraggingLens: "Dragging lens",
    modeDraggingSubject: "Dragging subject",
    modeDraggingOverlay: "Dragging overlay",
    modeLensFollowEnabled: "Lens follow enabled",
    sharpVerySharp: "Very sharp",
    sharpUsable: "Usable",
    sharpNoticeablySoft: "Noticeably soft",
    sharpSoft: "Soft",
  },
  zh: {
    eyebrow: "交互光学演示",
    title: "M12 Dome 相机焦点演示",
    helperText:
      "拖动场景中的目标物，再拖动镜头靠近或远离固定传感器，即可观察 2.8 mm F2.0 M12 相机镜头在 Dome 前盖影响下的清晰度、对焦距离、传感器模糊和温漂变化。",
    languageLabel: "语言",
    legendSubject: "目标物",
    legendRays: "折射光线",
    legendDomeCover: "球罩外壳",
    legendImagePlane: "像面",
    legendSensorPlane: "传感器平面",
    cameraLensTitle: "相机镜头",
    nominalLensLabel: "标称镜头",
    fovLabel: "视场角",
    minFocusLabel: "最近对焦",
    mountLabel: "接口",
    lensTuningTitle: "镜头调校",
    lensPowerBiasLabel: "镜头光学偏置",
    lensAberrationBiasLabel: "镜头像差偏置",
    realDomeInfluenceTitle: "真实 Dome 影响",
    domeTiltLabel: "Dome 倾斜",
    domeGapLabel: "Dome 到镜头间隙",
    lensTemperatureLabel: "镜头温度",
    sceneDepthSpanLabel: "场景深度范围",
    rayCountLabel: "光线数量",
    interactionTitle: "交互控制",
    lensFollowCursorLabel: "镜头跟随鼠标",
    followAmountLabel: "跟随强度",
    resetSceneLabel: "重置场景",
    liveReadoutTitle: "实时读数",
    subjectDistanceLabel: "目标距离",
    focusSetDistanceLabel: "当前对焦距离",
    effectiveFocalLengthLabel: "等效焦距",
    thermalFocusShiftLabel: "热漂移焦移",
    opticalAxisShiftLabel: "光轴偏移",
    domeEdgePenaltyLabel: "Dome 边缘惩罚",
    sensorBlurCircleLabel: "传感器模糊圈",
    sharpnessLabel: "清晰度",
    modeLabel: "模式",
    canvasSubject: "目标物",
    canvasSensorPlane: "传感器平面",
    canvasSensorPreview: "传感器预览",
    canvasDepthRange: "景深范围 1 m 到 {distance}",
    canvasSubjectDistance: "目标 {distance}",
    canvasActualImagePlane: "实际像面",
    canvasOpticalAxis: "光轴",
    canvasCameraModel: "99° 水平 / 74° 垂直视场模型",
    canvasFarStop: "{distance} 端",
    canvasNearStop: "1 m 端",
    canvasFocusTravel: "对焦行程",
    modeIdle: "空闲",
    modeDraggingLens: "正在拖动镜头",
    modeDraggingSubject: "正在拖动目标",
    modeDraggingOverlay: "正在拖动观察面板",
    modeLensFollowEnabled: "已开启镜头跟随",
    sharpVerySharp: "非常清晰",
    sharpUsable: "可用",
    sharpNoticeablySoft: "明显偏软",
    sharpSoft: "模糊",
  },
};

function t(key, params = {}) {
  const dictionary = translations[state.language] || translations.en;
  const template = dictionary[key] || translations.en[key] || key;
  return Object.entries(params).reduce((result, [paramKey, value]) => result.replace(`{${paramKey}}`, value), template);
}

function applyTranslations() {
  i18nNodes.forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });

  document.documentElement.lang = state.language === "zh" ? "zh-CN" : "en";
  document.title = t("title");
  document.getElementById("languageSelect").value = state.language;
}

function setLanguage(language) {
  state.language = language;
  applyTranslations();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function canvasFont(size, weight = 600) {
  const adjustedSize = state.language === "zh" ? Math.max(10, size - 1) : size;
  const family = state.language === "zh"
    ? '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans SC", sans-serif'
    : '"Segoe UI", "Helvetica Neue", sans-serif';
  return `${weight} ${adjustedSize}px ${family}`;
}

function round(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : "--";
}

function formatDistance(valueM) {
  if (!Number.isFinite(valueM)) {
    return "--";
  }

  if (valueM > 40) {
    return "Infinity";
  }

  return `${round(valueM, 2)} m`;
}

function getBounds() {
  const padding = Math.max(72, state.viewport.width * 0.08);
  return {
    padding,
    centerY: state.viewport.height / 2,
    lensMinX: padding + 180,
    lensMaxX: state.viewport.width * 0.68,
    objectMinX: padding * 0.7,
    objectMaxX: state.lens.x - 90,
    maxObjectY: state.viewport.height * 0.34,
  };
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  state.dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * state.dpr);
  canvas.height = Math.round(rect.height * state.dpr);
  state.viewport.width = rect.width;
  state.viewport.height = rect.height;

  if (!state.lens.x) {
    state.lens.x = rect.width * 0.45;
    state.lens.targetX = state.lens.x;
  }
}

function updateOutputs() {
  outputs.domeStrength.textContent = round(state.controlValues.domeStrength, 2);
  outputs.refractiveBias.textContent = round(state.controlValues.refractiveBias, 2);
  outputs.temperature.textContent = `${round(state.controlValues.temperature, 0)} C`;
  outputs.domeTilt.textContent = `${round(state.controlValues.domeTilt, 2)} deg`;
  outputs.domeGap.textContent = `${round(state.controlValues.domeGap, 1)} mm`;
  outputs.screenOffset.textContent = `${round(state.controlValues.screenOffset, 1)} m`;
  outputs.rayCount.textContent = String(state.controlValues.rayCount);
  outputs.followAmount.textContent = round(state.controlValues.followAmount, 2);
}

function resetScene() {
  state.controlValues = { ...defaults };
  controls.domeStrength.value = String(defaults.domeStrength);
  controls.refractiveBias.value = String(defaults.refractiveBias);
  controls.temperature.value = String(defaults.temperature);
  controls.domeTilt.value = String(defaults.domeTilt);
  controls.domeGap.value = String(defaults.domeGap);
  controls.screenOffset.value = String(defaults.screenOffset);
  controls.rayCount.value = String(defaults.rayCount);
  controls.followLens.checked = defaults.followLens;
  controls.followAmount.value = String(defaults.followAmount);

  state.pointer.inside = false;
  state.object.x = 120;
  state.object.y = -40;
  state.lens.targetX = state.viewport.width * 0.45;
  updateOutputs();
}

function syncControlValues() {
  state.controlValues.domeStrength = Number(controls.domeStrength.value);
  state.controlValues.refractiveBias = Number(controls.refractiveBias.value);
  state.controlValues.temperature = Number(controls.temperature.value);
  state.controlValues.domeTilt = Number(controls.domeTilt.value);
  state.controlValues.domeGap = Number(controls.domeGap.value);
  state.controlValues.screenOffset = Number(controls.screenOffset.value);
  state.controlValues.rayCount = Number(controls.rayCount.value);
  state.controlValues.followLens = controls.followLens.checked;
  state.controlValues.followAmount = Number(controls.followAmount.value);
  updateOutputs();
}

function canvasPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function lensHitTest(point) {
  const { centerY } = getBounds();
  const dx = point.x - state.lens.x;
  const dy = point.y - centerY;
  return Math.abs(dx) < state.lens.radius && Math.abs(dy) < state.lens.aperture * 0.45;
}

function subjectHitTest(point) {
  const { centerY } = getBounds();
  const subjectX = state.object.x;
  const subjectY = centerY + state.object.y;
  const dx = point.x - subjectX;
  const dy = point.y - subjectY;
  const headHit = Math.hypot(dx, dy) < 18;
  const bodyHit = Math.abs(dx) < 14 && point.y >= Math.min(centerY, subjectY) - 8 && point.y <= Math.max(centerY, subjectY) + 8;
  return headHit || bodyHit;
}

function getOverlayLayout() {
  const previewWidth = clamp(state.viewport.width * 0.24, 188, 248);
  const previewHeight = clamp(previewWidth * 0.68, 120, 168);
  const railWidth = 220;
  const railHeight = 12;
  const railCardWidth = railWidth + 32;
  const railCardHeight = 52;
  const gap = 34;
  const overlayWidth = Math.max(previewWidth, railCardWidth);
  const overlayHeight = previewHeight + gap + railCardHeight;
  const baseX = state.viewport.width - overlayWidth - 28;
  const baseY = 28;
  const overlayX = clamp(
    baseX + state.overlay.offsetX,
    16,
    Math.max(16, state.viewport.width - overlayWidth - 16),
  );
  const overlayY = clamp(
    baseY + state.overlay.offsetY,
    16,
    Math.max(16, state.viewport.height - overlayHeight - 16),
  );

  return {
    previewWidth,
    previewHeight,
    railWidth,
    railHeight,
    overlayWidth,
    overlayHeight,
    overlayX,
    overlayY,
    previewX: overlayX + overlayWidth - previewWidth,
    previewY: overlayY,
    railX: overlayX + 16,
    railY: overlayY + previewHeight + gap + 26,
    baseX,
    baseY,
  };
}

function overlayHitTest(point) {
  const layout = getOverlayLayout();
  return point.x >= layout.overlayX
    && point.x <= layout.overlayX + layout.overlayWidth
    && point.y >= layout.overlayY
    && point.y <= layout.overlayY + layout.overlayHeight;
}

function handlePointerMove(event) {
  const point = canvasPointFromEvent(event);
  const bounds = getBounds();
  state.pointer.x = point.x;
  state.pointer.y = point.y - bounds.centerY;
  state.pointer.inside = true;

  if (state.dragOverlay) {
    const layout = getOverlayLayout();
    const nextOverlayX = clamp(
      point.x - state.overlay.dragOffsetX,
      16,
      Math.max(16, state.viewport.width - layout.overlayWidth - 16),
    );
    const nextOverlayY = clamp(
      point.y - state.overlay.dragOffsetY,
      16,
      Math.max(16, state.viewport.height - layout.overlayHeight - 16),
    );
    state.overlay.offsetX = nextOverlayX - layout.baseX;
    state.overlay.offsetY = nextOverlayY - layout.baseY;
    return;
  }

  if (state.dragLens) {
    state.lens.targetX = clamp(point.x, bounds.lensMinX, bounds.lensMaxX);
    return;
  }

  if (state.dragSubject) {
    state.object.x = clamp(point.x, bounds.objectMinX, bounds.objectMaxX);
    state.object.y = clamp(point.y - bounds.centerY, -bounds.maxObjectY, bounds.maxObjectY);
  }
}

function computeOptics() {
  const { width, height } = state.viewport;
  const bounds = getBounds();
  const { centerY } = bounds;
  const domeStrength = state.controlValues.domeStrength;
  const refractiveBias = state.controlValues.refractiveBias;
  const domeTiltDeg = state.controlValues.domeTilt;
  const domeGapMm = state.controlValues.domeGap;
  const temperatureC = state.controlValues.temperature;
  const temperatureDelta = temperatureC - 20;
  const thermalFocalScale = 1 - temperatureDelta * 0.00085;
  const thermalSensorShiftMm = temperatureDelta * 0.0009;
  const maxFocusDistanceM = Math.max(LENS_SPEC.minFocusM + 0.5, state.controlValues.screenOffset);
  const offAxisRatio = Math.abs(state.object.y) / Math.max(1, bounds.maxObjectY);
  const domeGapFactor = clamp(8 / domeGapMm, 0.55, 3.2);
  const domeAxisShiftPx = domeTiltDeg * domeGapFactor * (16 + offAxisRatio * 28);
  const domeFocusOffsetMm = domeTiltDeg * domeGapFactor * (0.0014 + offAxisRatio * 0.0012);
  const domeEdgePenaltyMm = offAxisRatio * domeGapFactor * (domeTiltDeg * 0.008 + 0.0025);
  const domeSkewPx = domeTiltDeg * domeGapFactor * 6;

  const effectiveFocalMm = clamp(
    (LENS_SPEC.focalLengthMm / (1 + (domeStrength - 1) * 0.14 + (refractiveBias - 1.1) * 0.09)) * thermalFocalScale,
    2.35,
    3.2,
  );

  const subjectMix = 1 - ((state.object.x - bounds.objectMinX) / Math.max(1, bounds.objectMaxX - bounds.objectMinX));
  const subjectDistanceM = clamp(
    LENS_SPEC.minFocusM + Math.pow(subjectMix, 1.35) * (maxFocusDistanceM - LENS_SPEC.minFocusM),
    LENS_SPEC.minFocusM,
    maxFocusDistanceM,
  );

  const dragMix = 1 - ((state.lens.x - bounds.lensMinX) / Math.max(1, bounds.lensMaxX - bounds.lensMinX));
  const imageDistanceAtMinFocusMm = 1 / ((1 / effectiveFocalMm) - (1 / (LENS_SPEC.minFocusM * 1000)));
  const imageDistanceAtMaxFocusMm = 1 / ((1 / effectiveFocalMm) - (1 / (maxFocusDistanceM * 1000)));
  const sensorDistanceBaseMm = imageDistanceAtMinFocusMm + (imageDistanceAtMaxFocusMm - imageDistanceAtMinFocusMm) * dragMix;
  const sensorDistanceMm = clamp(
    sensorDistanceBaseMm + thermalSensorShiftMm,
    Math.min(imageDistanceAtMaxFocusMm, imageDistanceAtMinFocusMm),
    Math.max(imageDistanceAtMaxFocusMm, imageDistanceAtMinFocusMm),
  );
  const focusSetDiopters = Math.max(0.000001, (1 / effectiveFocalMm) - (1 / sensorDistanceMm));
  const focusSetDistanceM = 1 / focusSetDiopters / 1000;

  const subjectImageDistanceMm = 1 / ((1 / effectiveFocalMm) - (1 / (subjectDistanceM * 1000)));
  const domeAdjustedImageDistanceMm = subjectImageDistanceMm + domeFocusOffsetMm;
  const imageShiftMm = domeAdjustedImageDistanceMm - sensorDistanceMm;
  const sensorX = width * 0.82;
  const imagePlaneX = clamp(sensorX + imageShiftMm * 9000, state.lens.x + 34, width - 30);
  const magnification = -domeAdjustedImageDistanceMm / Math.max(1, subjectDistanceM * 1000);
  const imageY = centerY + state.object.y * (1 + magnification * 240) + domeAxisShiftPx;

  const cocMm = (LENS_SPEC.apertureDiameterMm * Math.abs(sensorDistanceMm - domeAdjustedImageDistanceMm)) / Math.max(0.001, domeAdjustedImageDistanceMm);
  const edgeAberrationMm =
    offAxisRatio *
    0.012 *
    domeStrength *
    (0.7 + refractiveBias * 0.45);
  const totalBlurMm = cocMm + edgeAberrationMm + domeEdgePenaltyMm;

  const apertureHalf = state.lens.aperture * 0.44;
  const rayCount = state.controlValues.rayCount;
  const outerAberration = domeStrength * 4 + refractiveBias * 3 + domeEdgePenaltyMm * 700;
  const rays = [];
  const hits = [];

  for (let index = 0; index < rayCount; index += 1) {
    const normalized = rayCount === 1 ? 0 : (index / (rayCount - 1)) * 2 - 1;
    const lensY = centerY + normalized * apertureHalf;
    const entryX = state.lens.x - state.lens.radius * 0.52;
    const deviationY = Math.pow(normalized, 3) * outerAberration + domeSkewPx * normalized;

    const targetX = imagePlaneX;
    const targetY = imageY + deviationY;

    const slope = (targetY - lensY) / Math.max(1, targetX - state.lens.x);
    const hitY = lensY + slope * (sensorX - state.lens.x);
    hits.push(hitY);

    rays.push({
      normalized,
      entryX,
      lensY,
      targetX,
      targetY,
      hitY,
    });
  }

  const averageHitY = hits.reduce((sum, hit) => sum + hit, 0) / hits.length;
  const blurRadiusPx = Math.max(8, (totalBlurMm / LENS_SPEC.sensorHeightMm) * 220 + 4);
  const previewBlurPx = clamp((totalBlurMm * 1000 / LENS_SPEC.pixelPitchUm) * 1.9, 0, 14);
  const focusInsideScene = imagePlaneX > state.lens.x + 20 && imagePlaneX < width - 30;
  const sharpnessScore = clamp(1 - totalBlurMm / 0.05, 0, 1);

  let sharpnessLabel = "Soft";
  if (sharpnessScore > 0.82) {
    sharpnessLabel = t("sharpVerySharp");
  } else if (sharpnessScore > 0.58) {
    sharpnessLabel = t("sharpUsable");
  } else if (sharpnessScore > 0.32) {
    sharpnessLabel = t("sharpNoticeablySoft");
  } else {
    sharpnessLabel = t("sharpSoft");
  }

  return {
    bounds,
    centerY,
    subjectDistanceM,
    focusSetDistanceM,
    maxFocusDistanceM,
    focusTravelRatio: 1 - dragMix,
    effectiveFocalMm,
    thermalSensorShiftMm,
    domeAxisShiftPx,
    domeEdgePenaltyMm,
    subjectImageDistanceMm,
    domeAdjustedImageDistanceMm,
    sensorDistanceMm,
    imageY,
    imagePlaneX,
    focusInsideScene,
    sensorX,
    rays,
    blurRadiusPx,
    previewBlurPx,
    averageHitY,
    cocMm,
    totalBlurMm,
    sharpnessLabel,
    sharpnessScore,
    height,
  };
}

function drawBackgroundGrid(centerY) {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(23, 34, 44, 0.05)";
  for (let x = 40; x < state.viewport.width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 18);
    ctx.lineTo(x, state.viewport.height - 18);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(23, 34, 44, 0.12)";
  ctx.beginPath();
  ctx.moveTo(20, centerY);
  ctx.lineTo(state.viewport.width - 20, centerY);
  ctx.stroke();
  ctx.restore();
}

function drawLens(centerY) {
  const top = centerY - state.lens.aperture * 0.5;
  const bottom = centerY + state.lens.aperture * 0.5;

  const lensGradient = ctx.createLinearGradient(state.lens.x - 35, top, state.lens.x + 35, bottom);
  lensGradient.addColorStop(0, "rgba(168, 231, 233, 0.2)");
  lensGradient.addColorStop(0.5, "rgba(103, 193, 205, 0.42)");
  lensGradient.addColorStop(1, "rgba(36, 111, 135, 0.22)");

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(state.lens.x, top);
  ctx.bezierCurveTo(state.lens.x + 56, top + 38, state.lens.x + 56, bottom - 38, state.lens.x, bottom);
  ctx.bezierCurveTo(state.lens.x - 56, bottom - 38, state.lens.x - 56, top + 38, state.lens.x, top);
  ctx.fillStyle = lensGradient;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(14, 88, 110, 0.52)";
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(state.lens.x - 11, top + 10);
  ctx.bezierCurveTo(state.lens.x + 4, top + 32, state.lens.x + 4, bottom - 32, state.lens.x - 11, bottom - 10);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
  ctx.stroke();
  ctx.restore();
}

function drawDomeCover(centerY) {
  const domeGapPx = clamp(state.controlValues.domeGap * 8.5, 18, 78);
  const shellHeight = state.lens.aperture * 1.12;
  const shellDepth = clamp(24 + domeGapPx * 0.72, 34, 84);
  const shellHalfHeight = shellHeight * 0.5;
  const domeCenterX = state.lens.x - domeGapPx - shellDepth * 0.22;
  const tiltRad = (state.controlValues.domeTilt * Math.PI) / 180;
  const shellGradient = ctx.createRadialGradient(
    domeCenterX - shellDepth * 0.68,
    centerY - shellHalfHeight * 0.36,
    shellDepth * 0.08,
    domeCenterX,
    centerY,
    shellHalfHeight,
  );
  shellGradient.addColorStop(0, "rgba(232, 249, 252, 0.68)");
  shellGradient.addColorStop(0.42, "rgba(128, 201, 213, 0.24)");
  shellGradient.addColorStop(1, "rgba(55, 128, 145, 0.04)");

  ctx.save();
  ctx.translate(domeCenterX, centerY);
  ctx.rotate(-tiltRad * 0.85);

  ctx.beginPath();
  ctx.moveTo(shellDepth * 0.26, -shellHalfHeight * 0.92);
  ctx.bezierCurveTo(-shellDepth * 0.28, -shellHalfHeight * 1.04, -shellDepth * 1.02, -shellHalfHeight * 0.52, -shellDepth * 1.04, 0);
  ctx.bezierCurveTo(-shellDepth * 1.02, shellHalfHeight * 0.52, -shellDepth * 0.28, shellHalfHeight * 1.04, shellDepth * 0.26, shellHalfHeight * 0.92);
  ctx.bezierCurveTo(shellDepth * 0.42, shellHalfHeight * 0.54, shellDepth * 0.42, -shellHalfHeight * 0.54, shellDepth * 0.26, -shellHalfHeight * 0.92);
  ctx.closePath();
  ctx.fillStyle = shellGradient;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(66, 126, 144, 0.48)";
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-shellDepth * 0.78, -shellHalfHeight * 0.24);
  ctx.quadraticCurveTo(-shellDepth * 0.36, -shellHalfHeight * 0.86, shellDepth * 0.08, -shellHalfHeight * 0.18);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(shellDepth * 0.18, -shellHalfHeight * 0.76, shellDepth * 0.18, shellHeight * 1.52, 12);
  ctx.fillStyle = "rgba(58, 74, 84, 0.1)";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(shellDepth * 0.24, -shellHalfHeight * 0.88);
  ctx.lineTo(shellDepth * 0.24, shellHalfHeight * 0.88);
  ctx.strokeStyle = "rgba(52, 68, 79, 0.28)";
  ctx.stroke();
  ctx.restore();
}

function drawObject(centerY) {
  const objectX = state.object.x;
  const objectY = centerY + state.object.y;
  ctx.save();
  ctx.strokeStyle = "rgba(208, 103, 39, 0.82)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(objectX, centerY);
  ctx.lineTo(objectX, objectY);
  ctx.stroke();

  ctx.fillStyle = "#d06727";
  ctx.beginPath();
  ctx.arc(objectX, objectY, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#17222c";
  ctx.font = canvasFont(14, 600);
  ctx.fillText(t("canvasSubject"), objectX - 24, objectY - 14);
  ctx.restore();
}

function drawSensor(sensorX, averageHitY, blurRadiusPx, centerY) {
  ctx.save();
  ctx.strokeStyle = "rgba(120, 71, 17, 0.66)";
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(sensorX, 28);
  ctx.lineTo(sensorX, state.viewport.height - 28);
  ctx.stroke();
  ctx.setLineDash([]);

  const spotGradient = ctx.createRadialGradient(sensorX, averageHitY, 4, sensorX, averageHitY, blurRadiusPx);
  spotGradient.addColorStop(0, "rgba(12, 138, 124, 0.46)");
  spotGradient.addColorStop(1, "rgba(12, 138, 124, 0.02)");
  ctx.fillStyle = spotGradient;
  ctx.beginPath();
  ctx.ellipse(sensorX, averageHitY, blurRadiusPx * 0.7, blurRadiusPx, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#5a4126";
  ctx.font = canvasFont(14, 600);
  ctx.fillText(t("canvasSensorPlane"), sensorX - 38, centerY - 46);
  ctx.restore();
}

function drawPreview(optics) {
  const {
    previewWidth: panelWidth,
    previewHeight: panelHeight,
    previewX: panelX,
    previewY: panelY,
  } = getOverlayLayout();
  const blurPx = optics.previewBlurPx;
  const depthMix = clamp(
    (optics.subjectDistanceM - LENS_SPEC.minFocusM) / Math.max(0.001, state.controlValues.screenOffset - LENS_SPEC.minFocusM),
    0,
    1,
  );
  const subjectScale = 1.05 - depthMix * 0.48;
  const subjectOffsetX = (state.object.y / Math.max(1, optics.bounds.maxObjectY)) * 18;
  const subjectFootY = panelY + panelHeight - 24;

  ctx.save();
  ctx.fillStyle = "rgba(255, 252, 246, 0.92)";
  ctx.strokeStyle = "rgba(23, 34, 44, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(23, 34, 44, 0.82)";
  ctx.font = canvasFont(13, 600);
  ctx.fillText(t("canvasSensorPreview"), panelX + 14, panelY + 22);
  ctx.font = canvasFont(11, 500);
  ctx.fillStyle = "rgba(90, 102, 112, 0.92)";
  ctx.fillText(t("canvasDepthRange", { distance: `${round(state.controlValues.screenOffset, 1)} m` }), panelX + 14, panelY + 36);

  const chartX = panelX + 16;
  const chartY = panelY + 44;
  const chartW = panelWidth - 32;
  const chartH = panelHeight - 60;

  ctx.save();
  ctx.beginPath();
  ctx.rect(chartX, chartY, chartW, chartH);
  ctx.clip();

  const sceneGradient = ctx.createLinearGradient(chartX, chartY, chartX, chartY + chartH);
  sceneGradient.addColorStop(0, "#dfe8ee");
  sceneGradient.addColorStop(0.55, "#eef0ea");
  sceneGradient.addColorStop(1, "#d9d0c3");
  ctx.fillStyle = sceneGradient;
  ctx.fillRect(chartX, chartY, chartW, chartH);

  ctx.filter = `blur(${blurPx.toFixed(2)}px)`;

  ctx.fillStyle = "#f1ede2";
  ctx.fillRect(chartX, chartY + chartH * 0.62, chartW, chartH * 0.38);

  ctx.strokeStyle = "rgba(96, 112, 122, 0.35)";
  ctx.lineWidth = 2;
  for (let index = 0; index < 5; index += 1) {
    const mix = index / 4;
    const lineY = chartY + chartH * (0.7 + mix * 0.22);
    ctx.beginPath();
    ctx.moveTo(chartX + chartW * (0.18 + mix * 0.12), lineY);
    ctx.lineTo(chartX + chartW * (0.82 - mix * 0.12), lineY);
    ctx.stroke();
  }

  const doorwayX = chartX + chartW * 0.15;
  const doorwayW = chartW * 0.24;
  ctx.fillStyle = "#b7c1c8";
  ctx.fillRect(doorwayX, chartY + chartH * 0.18, doorwayW, chartH * 0.46);
  ctx.fillStyle = "#5b6872";
  ctx.fillRect(doorwayX + doorwayW * 0.18, chartY + chartH * 0.24, doorwayW * 0.64, chartH * 0.34);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(chartX + chartW * 0.52, chartY + chartH * 0.16);
  ctx.lineTo(chartX + chartW * 0.8, chartY + chartH * 0.16);
  ctx.stroke();

  const subjectCenterX = chartX + chartW * 0.63 + subjectOffsetX;
  const bodyHeight = 36 * subjectScale;
  const bodyWidth = 14 * subjectScale;
  const headRadius = 7 * subjectScale;

  ctx.fillStyle = "rgba(208, 103, 39, 0.92)";
  ctx.beginPath();
  ctx.arc(subjectCenterX, subjectFootY - bodyHeight - headRadius * 1.2, headRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(subjectCenterX - bodyWidth * 0.5, subjectFootY - bodyHeight, bodyWidth, bodyHeight, bodyWidth * 0.45);
  ctx.fill();

  ctx.strokeStyle = "rgba(208, 103, 39, 0.92)";
  ctx.lineWidth = 3 * subjectScale;
  ctx.beginPath();
  ctx.moveTo(subjectCenterX - bodyWidth * 0.42, subjectFootY - bodyHeight * 0.54);
  ctx.lineTo(subjectCenterX - bodyWidth * 0.92, subjectFootY - bodyHeight * 0.18);
  ctx.moveTo(subjectCenterX + bodyWidth * 0.42, subjectFootY - bodyHeight * 0.54);
  ctx.lineTo(subjectCenterX + bodyWidth * 0.92, subjectFootY - bodyHeight * 0.18);
  ctx.moveTo(subjectCenterX - bodyWidth * 0.22, subjectFootY);
  ctx.lineTo(subjectCenterX - bodyWidth * 0.58, subjectFootY + bodyHeight * 0.32);
  ctx.moveTo(subjectCenterX + bodyWidth * 0.22, subjectFootY);
  ctx.lineTo(subjectCenterX + bodyWidth * 0.58, subjectFootY + bodyHeight * 0.32);
  ctx.stroke();

  ctx.fillStyle = "rgba(23, 34, 44, 0.15)";
  ctx.beginPath();
  ctx.ellipse(subjectCenterX, subjectFootY + bodyHeight * 0.38, bodyWidth * 1.4, bodyWidth * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "rgba(23, 34, 44, 0.16)";
  ctx.lineWidth = 1;
  ctx.strokeRect(chartX, chartY, chartW, chartH);

  ctx.fillStyle = optics.sharpnessScore > 0.72 ? "#0c8a7c" : optics.sharpnessScore > 0.42 ? "#b1741a" : "#c5522a";
  ctx.font = canvasFont(12, 700);
  ctx.fillText(optics.sharpnessLabel, panelX + 14, panelY + panelHeight - 12);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(23, 34, 44, 0.68)";
  ctx.font = canvasFont(11, 600);
  ctx.fillText(t("canvasSubjectDistance", { distance: formatDistance(optics.subjectDistanceM) }), panelX + panelWidth - 14, panelY + panelHeight - 12);
  ctx.textAlign = "start";
  ctx.restore();
}

function drawFocusTravel(optics) {
  const { railWidth, railHeight, railX, railY } = getOverlayLayout();
  const handleX = railX + railWidth * optics.focusTravelRatio;

  ctx.save();
  ctx.fillStyle = "rgba(255, 252, 246, 0.92)";
  ctx.strokeStyle = "rgba(23, 34, 44, 0.1)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(railX - 16, railY - 26, railWidth + 32, 52, 18);
  ctx.fill();
  ctx.stroke();

  const railGradient = ctx.createLinearGradient(railX, railY, railX + railWidth, railY);
  railGradient.addColorStop(0, "rgba(12, 138, 124, 0.18)");
  railGradient.addColorStop(1, "rgba(208, 103, 39, 0.22)");
  ctx.fillStyle = railGradient;
  ctx.beginPath();
  ctx.roundRect(railX, railY - railHeight * 0.5, railWidth, railHeight, 999);
  ctx.fill();

  ctx.strokeStyle = "rgba(23, 34, 44, 0.28)";
  ctx.beginPath();
  ctx.moveTo(railX, railY - 12);
  ctx.lineTo(railX, railY + 12);
  ctx.moveTo(railX + railWidth, railY - 12);
  ctx.lineTo(railX + railWidth, railY + 12);
  ctx.stroke();

  ctx.fillStyle = "#17222c";
  ctx.font = canvasFont(12, 600);
  ctx.fillText(t("canvasFarStop", { distance: `${round(optics.maxFocusDistanceM, 1)} m` }), railX - 2, railY - 16);
  ctx.fillText(t("canvasNearStop"), railX + railWidth - 42, railY - 16);
  ctx.fillText(t("canvasFocusTravel"), railX, railY + 26);

  ctx.fillStyle = "#d06727";
  ctx.beginPath();
  ctx.arc(handleX, railY, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawRays(optics) {
  ctx.save();
  ctx.lineWidth = 1.7;
  optics.rays.forEach((ray) => {
    ctx.strokeStyle = ray.normalized === 0 ? "rgba(15, 112, 158, 0.94)" : "rgba(32, 111, 154, 0.58)";
    ctx.beginPath();
    ctx.moveTo(state.object.x, optics.centerY + state.object.y);
    ctx.lineTo(ray.entryX, ray.lensY);
    ctx.lineTo(ray.targetX, ray.targetY);
    ctx.stroke();
  });
  ctx.restore();
}

function drawFocusMarker(optics) {
  if (!optics.focusInsideScene) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = "rgba(12, 138, 124, 0.95)";
  ctx.fillStyle = "rgba(12, 138, 124, 0.14)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(optics.imagePlaneX, optics.imageY, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(optics.imagePlaneX - 16, optics.imageY);
  ctx.lineTo(optics.imagePlaneX + 16, optics.imageY);
  ctx.moveTo(optics.imagePlaneX, optics.imageY - 16);
  ctx.lineTo(optics.imagePlaneX, optics.imageY + 16);
  ctx.stroke();
  ctx.fillStyle = "#0c8a7c";
  ctx.font = canvasFont(14, 600);
  ctx.fillText(t("canvasActualImagePlane"), optics.imagePlaneX - 42, optics.imageY - 18);
  ctx.restore();
}

function drawAnnotations(optics) {
  const labelY = 28;
  ctx.save();
  ctx.fillStyle = "rgba(23, 34, 44, 0.75)";
  ctx.font = canvasFont(13, 600);
  ctx.fillText(t("canvasOpticalAxis"), 28, optics.centerY - 10);
  ctx.fillText(t("canvasCameraModel"), state.lens.x + 18, labelY);
  ctx.restore();
}

function render() {
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  ctx.clearRect(0, 0, state.viewport.width, state.viewport.height);

  const optics = computeOptics();
  state.lastOptics = optics;

  drawBackgroundGrid(optics.centerY);
  drawSensor(optics.sensorX, optics.averageHitY, optics.blurRadiusPx, optics.centerY);
  drawRays(optics);
  drawDomeCover(optics.centerY);
  drawLens(optics.centerY);
  drawObject(optics.centerY);
  drawFocusMarker(optics);
  drawAnnotations(optics);
  drawPreview(optics);
  drawFocusTravel(optics);

  outputs.objectDistance.textContent = formatDistance(optics.subjectDistanceM);
  outputs.focusDistance.textContent = formatDistance(optics.focusSetDistanceM);
  outputs.focalLength.textContent = `${round(optics.effectiveFocalMm, 3)} mm`;
  outputs.temperatureShift.textContent = `${round(optics.thermalSensorShiftMm * 1000, 1)} um`;
  outputs.axisShift.textContent = `${round(optics.domeAxisShiftPx, 1)} px`;
  outputs.domePenalty.textContent = `${round(optics.domeEdgePenaltyMm * 1000, 1)} um`;
  outputs.blurRadius.textContent = `${round(optics.cocMm * 1000, 1)} um`;
  outputs.sharpness.textContent = optics.sharpnessLabel;
  outputs.mode.textContent = state.dragLens
    ? t("modeDraggingLens")
    : state.dragSubject
      ? t("modeDraggingSubject")
      : state.dragOverlay
        ? t("modeDraggingOverlay")
        : state.controlValues.followLens
          ? t("modeLensFollowEnabled")
          : t("modeIdle");

  const pointerPoint = { x: state.pointer.x, y: state.pointer.y + optics.centerY };
  canvas.style.cursor = state.dragLens || state.dragSubject || state.dragOverlay
    ? "grabbing"
    : state.pointer.inside && overlayHitTest(pointerPoint)
      ? "grab"
      : state.pointer.inside && lensHitTest(pointerPoint)
        ? "grab"
        : state.pointer.inside && subjectHitTest(pointerPoint)
          ? "grab"
          : "crosshair";
}

function tick() {
  const bounds = getBounds();
  if (state.controlValues.followLens && state.pointer.inside && !state.dragLens && !state.dragOverlay) {
    const followTarget = bounds.lensMinX + (state.pointer.x / Math.max(1, state.viewport.width)) * (bounds.lensMaxX - bounds.lensMinX);
    const blended = state.lens.targetX * (1 - state.controlValues.followAmount) + followTarget * state.controlValues.followAmount;
    state.lens.targetX = clamp(blended, bounds.lensMinX, bounds.lensMaxX);
  }

  state.lens.x += (state.lens.targetX - state.lens.x) * 0.16;
  render();
  requestAnimationFrame(tick);
}

function initializeEvents() {
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerdown", (event) => {
    const point = canvasPointFromEvent(event);
    if (overlayHitTest(point)) {
      const layout = getOverlayLayout();
      state.dragOverlay = true;
      state.overlay.dragOffsetX = point.x - layout.overlayX;
      state.overlay.dragOffsetY = point.y - layout.overlayY;
      canvas.setPointerCapture(event.pointerId);
      return;
    }

    if (lensHitTest(point)) {
      state.dragLens = true;
      canvas.setPointerCapture(event.pointerId);
      state.lens.targetX = clamp(point.x, getBounds().lensMinX, getBounds().lensMaxX);
      return;
    }

    if (subjectHitTest(point)) {
      state.dragSubject = true;
      canvas.setPointerCapture(event.pointerId);
      handlePointerMove(event);
    }
  });

  canvas.addEventListener("pointerup", (event) => {
    state.dragSubject = false;
    state.dragLens = false;
    state.dragOverlay = false;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  });

  canvas.addEventListener("pointerleave", () => {
    state.pointer.inside = false;
    state.dragSubject = false;
    state.dragLens = false;
    state.dragOverlay = false;
  });

  window.addEventListener("resize", resizeCanvas);

  Object.values(controls).forEach((control) => {
    control.addEventListener("input", syncControlValues);
  });

  document.getElementById("languageSelect").addEventListener("change", (event) => setLanguage(event.target.value));
  document.getElementById("resetScene").addEventListener("click", resetScene);
}

resizeCanvas();
applyTranslations();
syncControlValues();
initializeEvents();
tick();