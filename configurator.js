import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const $ = selector => document.querySelector(selector);
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const state = { model: 'custom-wardrobe', width: 120, height: 200, depth: 50, thickness: 18, manufacturer: 'guararapes', material: 'freijo', doors: 2, drawers: 0, shelves: 3, openDoors: false, referenceNotes: '' };
const manufacturers = Array.isArray(window.MDF_MANUFACTURERS) ? window.MDF_MANUFACTURERS.filter(item => item.active !== false) : [];
const manufacturerMap = Object.fromEntries(manufacturers.map(item => [item.id, item]));
let materials = {};
function buildMaterials(manufacturerId = state.manufacturer) {
  const entries = manufacturerMap[manufacturerId]?.patterns || [];
  return Object.fromEntries(entries.filter(item => item.availability !== 'inactive').map(item => [item.id, {
    label: item.name,
    detail: `${item.line || 'Catálogo oficial'}${item.finish ? ` · ${item.finish}` : ''}${item.code ? ` · cód. ${item.code}` : ''}`,
    color: item.previewColor || 0xa8754d,
    swatch: item.image ? `url("${item.image}") center/cover` : `#${(item.previewColor || 0xa8754d).toString(16).padStart(6, '0')}`,
    image: item.image,
    sourceUrl: item.sourceUrl,
    line: item.line || '',
    finish: item.finish || '',
    code: item.code || '',
  }]));
}
const modelCatalog = [
  { id: 'custom-wardrobe', name: 'Armário', description: 'Organização sob medida', image: 'https://images.unsplash.com/photo-1558997519-83ea9252edf8?auto=format&fit=crop&w=800&q=85' },
  { id: 'custom-closet', name: 'Guarda-roupa', description: 'Mais espaço para o quarto', image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=800&q=85' },
  { id: 'custom-rack', name: 'Rack', description: 'Sala organizada e leve', image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=85' },
  { id: 'custom-shelf', name: 'Estante', description: 'Nichos para expor e guardar', image: 'https://images.unsplash.com/photo-1594620302200-9a762244a156?auto=format&fit=crop&w=800&q=85' },
  { id: 'custom-kitchen', name: 'Cozinha', description: 'Bancada e armários planejados', image: 'https://images.unsplash.com/photo-1556912167-f556f1f39fdf?auto=format&fit=crop&w=800&q=85' },
  { id: 'custom-bathroom', name: 'Gabinete', description: 'Medida certa para o banheiro', image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=800&q=85' },
  { id: 'custom-desk', name: 'Escrivaninha', description: 'Um canto para produzir', image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=800&q=85' },
  { id: 'custom-sideboard', name: 'Aparador', description: 'Apoio elegante para a sala', image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=800&q=85' },
];
const modelNames = Object.fromEntries(modelCatalog.map(model => [model.id, `${model.name} personalizado`]));
const modelDefaults = {
  'custom-wardrobe': { doors: 2, drawers: 0, shelves: 3 },
  'custom-closet': { doors: 2, drawers: 2, shelves: 4 },
  'custom-rack': { doors: 0, drawers: 2, shelves: 2 },
  'custom-shelf': { doors: 0, drawers: 0, shelves: 5 },
  'custom-kitchen': { doors: 3, drawers: 2, shelves: 2 },
  'custom-bathroom': { doors: 2, drawers: 1, shelves: 1 },
  'custom-desk': { doors: 0, drawers: 3, shelves: 1 },
  'custom-sideboard': { doors: 2, drawers: 2, shelves: 2 },
};
const requestedManufacturer = new URLSearchParams(window.location.search).get('manufacturer');
const requestedFinish = new URLSearchParams(window.location.search).get('finish');
if (requestedManufacturer && manufacturerMap[requestedManufacturer]) state.manufacturer = requestedManufacturer;
materials = buildMaterials();
if (requestedFinish && materials[requestedFinish]) state.material = requestedFinish;
const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
const clampNumber = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
let scene, camera, renderer, controls, modelGroup, quoteTimer, lastQuote;
let assemblyView = false;
let completedAssemblySteps = [];
let currentAssemblyStep = 0;
const referenceFiles = [];
const referenceObjectUrls = new Map();
const MAX_REFERENCE_FILES = 8;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function readState() {
  state.model = $('#model').value;
  document.querySelectorAll('[data-field]').forEach(input => {
    const key = input.dataset.field;
    if (key === 'model') return;
    state[key] = input.type === 'checkbox' ? input.checked : (input.type === 'number' || input.type === 'range' || input.tagName === 'SELECT' && ['thickness'].includes(key) ? clampNumber(input.value, state[key]) : input.value);
  });
}

function renderModelOptions() {
  const container = $('#model-options');
  container.replaceChildren();
  modelCatalog.forEach(model => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'model-option';
    button.dataset.model = model.id;
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', model.id === state.model ? 'true' : 'false');
    const image = document.createElement('img');
    image.src = model.image;
    image.alt = `Exemplo de ${model.name.toLowerCase()}`;
    image.loading = 'lazy';
    const copy = document.createElement('span');
    copy.className = 'model-option-copy';
    const name = document.createElement('strong');
    name.textContent = model.name;
    const description = document.createElement('small');
    description.textContent = model.description;
    copy.append(name, description);
    const check = document.createElement('span');
    check.className = 'model-option-check';
    check.textContent = '✓';
    check.setAttribute('aria-hidden', 'true');
    button.append(image, copy, check);
    button.addEventListener('click', () => selectModel(model.id));
    container.append(button);
  });
  updateModelOptions();
}

function updateModelOptions() {
  document.querySelectorAll('[data-model]').forEach(button => {
    const active = button.dataset.model === state.model;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });
}

function selectModel(modelId) {
  if (!modelNames[modelId]) return;
  state.model = modelId;
  $('#model').value = modelId;
  Object.assign(state, modelDefaults[modelId] || {});
  Object.entries(modelDefaults[modelId] || {}).forEach(([key, value]) => {
    const input = document.querySelector(`[data-field="${key}"]`);
    if (input) input.value = value;
  });
  updateModelOptions();
  readState();
  updateSummary();
  renderAssemblyInventory();
  rebuildModel();
  updateQuote();
}

function renderManufacturerOptions() {
  const container = $('#manufacturer-options');
  if (!container) return;
  container.replaceChildren();
  manufacturers.forEach(manufacturer => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'config-manufacturer-option';
    button.dataset.manufacturer = manufacturer.id;
    button.setAttribute('role', 'radio');
    const image = document.createElement('img');
    image.src = manufacturer.logo;
    image.alt = `Logo ${manufacturer.name}`;
    image.loading = 'lazy';
    image.addEventListener('error', () => { image.hidden = true; fallback.textContent = manufacturer.name; fallback.hidden = false; });
    const fallback = document.createElement('span');
    fallback.className = 'manufacturer-wordmark';
    fallback.textContent = manufacturer.name;
    fallback.hidden = true;
    const count = document.createElement('small');
    count.textContent = manufacturer.patterns.length ? `${manufacturer.patterns.length} padrões` : 'Catálogo a importar';
    button.append(image, fallback, count);
    button.addEventListener('click', () => selectManufacturer(manufacturer.id));
    container.append(button);
  });
  updateManufacturerOptions();
  updateManufacturerStatus();
}

function updateManufacturerOptions() {
  document.querySelectorAll('[data-manufacturer]').forEach(button => {
    const active = button.dataset.manufacturer === state.manufacturer;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-checked', active ? 'true' : 'false');
  });
}

function updateManufacturerStatus() {
  const status = $('#manufacturer-status');
  const manufacturer = manufacturerMap[state.manufacturer];
  if (!status || !manufacturer) return;
  status.innerHTML = manufacturer.patterns.length
    ? `${manufacturer.patterns.length} padrões oficiais cadastrados para esta marca.`
    : `Ainda não há padrões cadastrados para ${escapeHtml(manufacturer.name)}. <a href="${escapeHtml(manufacturer.catalogUrl)}" target="_blank" rel="noopener noreferrer">Consultar catálogo oficial ↗</a>`;
}

function selectManufacturer(manufacturerId) {
  if (!manufacturerMap[manufacturerId]) return;
  state.manufacturer = manufacturerId;
  materials = buildMaterials(manufacturerId);
  state.material = Object.keys(materials)[0] || '';
  updateManufacturerOptions();
  updateManufacturerStatus();
  renderMaterialOptions();
  updateSummary();
  renderAssemblyInventory();
  rebuildModel();
  updateQuote();
}

function renderMaterialOptions() {
  const container = $('#material-options');
  container.replaceChildren();
  Object.entries(materials).forEach(([id, material]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'material-option';
    button.dataset.material = id;
    button.setAttribute('role', 'radio');
    button.style.setProperty('--swatch', material.swatch || `#${material.color.toString(16).padStart(6, '0')}`);
    const swatch = document.createElement('span');
    swatch.className = 'material-swatch';
    swatch.setAttribute('aria-hidden', 'true');
    const name = document.createElement('strong');
    name.textContent = material.label;
    const detail = document.createElement('span');
    detail.textContent = material.detail;
    button.append(swatch, name, detail);
    button.addEventListener('click', () => selectMaterial(id));
    container.append(button);
  });
  $('#material-count').textContent = `${Object.keys(materials).length} opções`;
  if (!Object.keys(materials).length) {
    const empty = document.createElement('div');
    empty.className = 'material-empty';
    const manufacturer = manufacturerMap[state.manufacturer];
    empty.innerHTML = `<strong>Catálogo ainda não cadastrado para ${escapeHtml(manufacturer?.name || 'este fabricante')}.</strong>Consulte a fonte oficial para validar os padrões antes de especificar o móvel. <a href="${escapeHtml(manufacturer?.catalogUrl || '#')}" target="_blank" rel="noopener noreferrer">Abrir catálogo oficial ↗</a><span class="material-source">Nenhuma cor, código ou acabamento foi inventado nesta vitrine.</span>`;
    container.append(empty);
  }
  updateMaterialOptions();
}

function updateMaterialOptions() {
  document.querySelectorAll('[data-material]').forEach(button => {
    const active = button.dataset.material === state.material;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-checked', active ? 'true' : 'false');
  });
}

function selectMaterial(materialId) {
  if (!materials[materialId]) return;
  state.material = materialId;
  updateMaterialOptions();
  updateSummary();
  renderAssemblyInventory();
  rebuildModel();
  updateQuote();
}

function materialFor(color = state.material) { return new THREE.MeshStandardMaterial({ color: materials[color]?.color || 0xa8754d, roughness: .62, metalness: .03 }); }
function panel(width, height, depth, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material || materialFor());
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function rebuildModel() {
  if (!modelGroup) return;
  modelGroup.clear();
  const w = state.width / 100;
  const h = state.height / 100;
  const d = state.depth / 100;
  const t = state.thickness / 1000;
  const explode = assemblyView ? Math.min(.28, Math.max(w, h, d) * .11) : 0;
  const wood = materialFor();
  const dark = new THREE.MeshStandardMaterial({ color: 0x332a22, roughness: .7 });
  modelGroup.add(panel(t, h, d, -w / 2 + t / 2 - explode, 0, 0, wood));
  modelGroup.add(panel(t, h, d, w / 2 - t / 2 + explode, 0, 0, wood));
  modelGroup.add(panel(w - 2 * t, t, d, 0, h / 2 - t / 2 + explode, 0, wood));
  modelGroup.add(panel(w - 2 * t, t, d, 0, -h / 2 + t / 2 - explode, 0, wood));
  modelGroup.add(panel(w - 2 * t, h - 2 * t, t / 2, 0, 0, -d / 2 + t / 4 - explode, wood));

  const usableHeight = h - 2 * t;
  for (let index = 0; index < state.shelves; index += 1) {
    const y = -h / 2 + t + usableHeight * ((index + 1) / (state.shelves + 1));
    modelGroup.add(panel(w - 2 * t, t, d - t, 0, y, explode * .35, wood));
  }

  const doorCount = Math.max(0, Math.min(4, Math.round(state.doors)));
  if (doorCount) {
    const gap = Math.min(.012, w / 80);
    const doorWidth = (w - gap * (doorCount + 1)) / doorCount;
    for (let index = 0; index < doorCount; index += 1) {
      const doorGroup = new THREE.Group();
      const x = -w / 2 + gap + doorWidth / 2 + index * (doorWidth + gap);
      const door = panel(doorWidth, h - 2 * t, t, state.openDoors ? (index < doorCount / 2 ? doorWidth / 2 : -doorWidth / 2) : 0, 0, d / 2 + t / 2 + explode, wood);
      const handle = panel(.018, .08, .018, index < doorCount / 2 ? doorWidth * .25 : -doorWidth * .25, 0, d / 2 + t + .012 + explode, dark);
      doorGroup.position.x = x;
      doorGroup.position.y = index % 2 ? explode * .45 : -explode * .45;
      if (state.openDoors) doorGroup.rotation.y = index < doorCount / 2 ? -.95 : .95;
      doorGroup.add(door, handle);
      modelGroup.add(doorGroup);
    }
  }

  const drawerCount = Math.max(0, Math.min(6, Math.round(state.drawers)));
  for (let index = 0; index < drawerCount; index += 1) {
    const drawerHeight = Math.min(.22, (h - 2 * t) / Math.max(drawerCount, 1) * .72);
    const y = h / 2 - t - drawerHeight / 2 - index * (drawerHeight + .025);
    modelGroup.add(panel(w - 2 * t, drawerHeight, t, 0, y, d / 2 + t / 2 + explode, wood));
    modelGroup.add(panel(.12, .014, .014, 0, y, d / 2 + t + .012 + explode, dark));
  }
  fitCamera(w, h, d);
}

function fitCamera(w, h, d) {
  const maxSize = Math.max(w, h, d);
  camera.position.set(maxSize * 1.55, maxSize * .9, maxSize * 1.7);
  controls.target.set(0, 0, 0);
  controls.maxDistance = maxSize * 5;
  controls.minDistance = maxSize * .8;
  controls.update();
}

function initScene() {
  const canvas = $('#scene');
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(34, canvas.clientWidth / canvas.clientHeight, .01, 100);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = .08;
  controls.maxPolarAngle = Math.PI * .82;
  const ambient = new THREE.HemisphereLight(0xffffff, 0xb7a593, 2.2);
  const key = new THREE.DirectionalLight(0xffffff, 3.2);
  key.position.set(4, 6, 5);
  key.castShadow = true;
  scene.add(ambient, key);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(5, 64), new THREE.MeshStandardMaterial({ color: 0xe9e0d5, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.25;
  floor.receiveShadow = true;
  scene.add(floor);
  modelGroup = new THREE.Group();
  modelGroup.position.y = .02;
  scene.add(modelGroup);
  rebuildModel();
  $('#viewer-status').textContent = 'Modelo pronto · arraste para girar';
  const render = () => { controls.update(); renderer.render(scene, camera); requestAnimationFrame(render); };
  render();
  window.addEventListener('resize', () => { const width = canvas.clientWidth; const height = canvas.clientHeight; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); });
}

function fallbackQuote() {
  const area = (2 * state.height * state.depth + 2 * state.width * state.depth + state.width * state.height * .55 + state.shelves * state.width * state.depth) / 10000;
  const rate = { freijo: 115, white: 82, graphite: 105, oak: 122 }[state.material] || 115;
  const materialCost = area * rate * (state.thickness / 18);
  const components = state.doors * 95 + state.drawers * 180 + state.shelves * 28;
  const labor = 280 + state.doors * 35 + state.drawers * 55;
  const subtotal = Math.round((materialCost + components + labor) * 1.08 * 100) / 100;
  const total = Math.round(subtotal * 1.25 * 100) / 100;
  return { total, pixTotal: Math.round(total * .95 * 100) / 100, currency: 'BRL', source: 'browser-fallback' };
}

async function updateQuote() {
  clearTimeout(quoteTimer);
  quoteTimer = setTimeout(async () => {
    const payload = { modelId: state.model, configuration: { ...state } };
    try {
      const response = await fetch('/api/configurator/quote', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error('quote_failed');
      lastQuote = await response.json();
    } catch (_error) {
      lastQuote = fallbackQuote();
    }
    $('#price').textContent = money(lastQuote.total);
    $('#price-note').textContent = `${manufacturerMap[state.manufacturer]?.name || 'Fabricante a definir'} · ${materials[state.material]?.label || 'Padrão a definir'} · ${state.doors} portas · ${state.shelves} prateleiras · ${money(lastQuote.pixTotal)} no Pix`;
  }, 180);
}

function updateSummary() {
  $('#viewer-title').textContent = modelNames[state.model] || 'Móvel personalizado';
  $('#dimension-width').textContent = `${state.width} cm`;
  $('#dimension-height').textContent = `${state.height} cm`;
  $('#dimension-depth').textContent = `${state.depth} cm`;
  $('#reference-width').textContent = `${state.width} cm`;
  $('#reference-height').textContent = `${state.height} cm`;
  $('#reference-depth').textContent = `${state.depth} cm`;
  $('#doors-output').textContent = state.doors;
  $('#drawers-output').textContent = state.drawers;
  $('#shelves-output').textContent = state.shelves;
  $('#summary-list').innerHTML = [['Modelo', modelNames[state.model]], ['Fabricante', manufacturerMap[state.manufacturer]?.name || 'A definir'], ['Padrão', materials[state.material]?.label || 'A definir'], ['Código', materials[state.material]?.code || 'Não informado'], ['Medidas', `${state.width} × ${state.height} × ${state.depth} cm`], ['Espessura', `${state.thickness} mm`], ['Portas', state.doors], ['Gavetas', state.drawers], ['Prateleiras', state.shelves], ['Referências', referenceFiles.length ? `${referenceFiles.length} arquivo(s)` : 'Nenhum arquivo'], ['Observações', state.referenceNotes ? 'Adicionadas' : 'Nenhuma']].map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
}

function showStep(step) {
  document.querySelectorAll('[data-panel]').forEach(panel => panel.classList.toggle('is-active', panel.dataset.panel === step));
  document.querySelectorAll('[data-step]').forEach(tab => { const active = tab.dataset.step === step; tab.classList.toggle('is-active', active); tab.setAttribute('aria-selected', active ? 'true' : 'false'); });
}

function toast(message) { const element = $('#toast'); element.textContent = message; element.classList.add('is-visible'); setTimeout(() => element.classList.remove('is-visible'), 2600); }
function formatFileSize(bytes) { if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`; return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
function referenceMetadata() { return referenceFiles.map(file => ({ name: file.name, type: file.type, size: file.size, lastModified: file.lastModified })); }
function projectPayload() {
  const manufacturer = manufacturerMap[state.manufacturer];
  const material = materials[state.material];
  return {
    id: `local-${Date.now()}`,
    createdAt: new Date().toISOString(),
    configuration: { ...state },
    materialSelection: {
      manufacturerId: state.manufacturer,
      manufacturerName: manufacturer?.name || '',
      patternId: state.material || '',
      patternName: material?.label || '',
      code: material?.code || '',
      finish: material?.finish || '',
      sourceUrl: material?.sourceUrl || '',
    },
    references: { notes: state.referenceNotes || '', files: referenceMetadata() },
    quote: lastQuote || fallbackQuote(),
  };
}

function renderReferenceFiles() {
  const preview = $('#reference-media-preview');
  const meta = $('#reference-media-meta');
  referenceObjectUrls.forEach((url, file) => { if (!referenceFiles.includes(file)) { URL.revokeObjectURL(url); referenceObjectUrls.delete(file); } });
  preview.replaceChildren();
  meta.textContent = referenceFiles.length ? `${referenceFiles.length} de ${MAX_REFERENCE_FILES} arquivo(s) selecionado(s).` : 'Nenhum arquivo adicionado.';
  referenceFiles.forEach((file, index) => {
    const card = document.createElement('article');
    card.className = 'reference-media-card';
    const media = document.createElement(file.type.startsWith('video/') ? 'video' : 'img');
    const objectUrl = referenceObjectUrls.get(file) || URL.createObjectURL(file);
    referenceObjectUrls.set(file, objectUrl);
    media.src = objectUrl;
    media.alt = file.name;
    media.setAttribute('aria-label', file.name);
    if (media.tagName === 'VIDEO') { media.controls = true; media.muted = true; media.preload = 'metadata'; }
    const info = document.createElement('div');
    info.className = 'reference-media-info';
    const name = document.createElement('strong');
    name.textContent = file.name;
    const size = document.createElement('small');
    size.textContent = `${file.type.startsWith('video/') ? 'Vídeo' : 'Imagem'} · ${formatFileSize(file.size)}`;
    info.append(name, size);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'reference-media-remove';
    remove.textContent = 'Remover';
    remove.setAttribute('aria-label', `Remover ${file.name}`);
    remove.addEventListener('click', () => { const [removed] = referenceFiles.splice(index, 1); const url = referenceObjectUrls.get(removed); if (url) URL.revokeObjectURL(url); referenceObjectUrls.delete(removed); renderReferenceFiles(); updateSummary(); });
    card.append(media, info, remove);
    preview.append(card);
  });
  updateSummary();
}

function addReferenceFiles(fileList) {
  const incoming = [...fileList];
  const errors = [];
  incoming.forEach(file => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) { errors.push(`${file.name}: formato não suportado`); return; }
    const maxBytes = file.type.startsWith('video/') ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) { errors.push(`${file.name}: limite de ${file.type.startsWith('video/') ? '50 MB' : '10 MB'}`); return; }
    if (referenceFiles.length >= MAX_REFERENCE_FILES) { errors.push(`Limite de ${MAX_REFERENCE_FILES} arquivos atingido`); return; }
    if (referenceFiles.some(existing => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified)) return;
    referenceFiles.push(file);
  });
  renderReferenceFiles();
  if (errors.length) toast(errors[0]);
}

function projectShareText() {
  return `Projeto Montaé\n${modelNames[state.model]}\nFabricante: ${manufacturerMap[state.manufacturer]?.name || 'A definir'}\nPadrão: ${materials[state.material]?.label || 'A definir'}${materials[state.material]?.code ? `\nCódigo: ${materials[state.material].code}` : ''}\nMedidas: ${state.width} × ${state.height} × ${state.depth} cm\nPortas: ${state.doors} · Gavetas: ${state.drawers} · Prateleiras: ${state.shelves}${state.referenceNotes ? `\nObservações: ${state.referenceNotes}` : ''}`;
}

async function shareProject() {
  const shareData = { title: 'Projeto de móvel personalizado', text: projectShareText() };
  if (referenceFiles.length && navigator.canShare?.({ files: referenceFiles })) shareData.files = referenceFiles;
  try {
    if (navigator.share) { await navigator.share(shareData); toast('Projeto compartilhado com as referências.'); return; }
    const blob = new Blob([JSON.stringify(projectPayload(), null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.download = 'projeto-montae.json'; link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href); toast('Resumo do projeto baixado.');
  } catch (error) { if (error.name !== 'AbortError') toast('Não foi possível compartilhar agora.'); }
}

function renderAssemblyInventory() {
  const pieces = [
    ['Laterais estruturais', '2 peças', 'L / R'],
    ['Tampo e base', '2 peças', 'T / B'],
    ['Fundo do móvel', '1 peça', 'F'],
    ['Prateleiras reguláveis', `${state.shelves} ${state.shelves === 1 ? 'peça' : 'peças'}`, 'P'],
    ...(state.doors ? [['Portas e dobradiças', `${state.doors} ${state.doors === 1 ? 'peça' : 'peças'}`, 'PT']] : []),
    ...(state.drawers ? [['Frentes e caixas de gaveta', `${state.drawers} ${state.drawers === 1 ? 'conjunto' : 'conjuntos'}`, 'G']] : []),
  ];
  const hardware = [
    ['Cavilhas e parafusos', 'kit completo'],
    ...(state.doors ? [['Dobradiças com amortecimento', `${state.doors * 2} un.`]] : []),
    ...(state.drawers ? [['Corrediças telescópicas', `${state.drawers} pares`]] : []),
    ['Puxadores', `${Math.max(state.doors, state.drawers)} un.`],
    ['Manual de montagem', 'personalizado'],
  ];
  $('#parts-list').innerHTML = pieces.map(([name, quantity, code]) => `<div class="inventory-item"><span>${name}</span><b>${quantity} · ${code}</b></div>`).join('');
  $('#hardware-list').innerHTML = hardware.map(([name, quantity]) => `<div class="inventory-item"><span>${name}</span><b>${quantity}</b></div>`).join('');
}

function renderAssemblyProgress() {
  const steps = [...document.querySelectorAll('[data-assembly-step]')];
  const nextStep = steps.findIndex(step => !completedAssemblySteps.includes(Number(step.dataset.assemblyStep)));
  const currentStep = completedAssemblySteps.includes(currentAssemblyStep)
    ? (nextStep === -1 ? steps.length - 1 : Math.max(0, nextStep))
    : currentAssemblyStep;
  steps.forEach(step => {
    const index = Number(step.dataset.assemblyStep);
    step.classList.toggle('is-done', completedAssemblySteps.includes(index));
    step.classList.toggle('is-current', index === currentStep);
    step.setAttribute('aria-pressed', index === currentStep ? 'true' : 'false');
  });
  $('#assembly-progress-bar').style.width = `${completedAssemblySteps.length / steps.length * 100}%`;
  $('#assembly-progress-label').textContent = `${completedAssemblySteps.length} de ${steps.length} etapas concluídas`;
  $('#complete-assembly').textContent = completedAssemblySteps.length === steps.length ? 'Montagem concluída' : 'Marcar etapa como concluída';
}

document.querySelectorAll('[data-assembly-step]').forEach(button => button.addEventListener('click', () => {
  const index = Number(button.dataset.assemblyStep);
  currentAssemblyStep = index;
  button.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  renderAssemblyProgress();
  if (completedAssemblySteps.includes(index)) toast(`Etapa ${String(index + 1).padStart(2, '0')} já foi concluída.`);
}));
$('#complete-assembly').addEventListener('click', () => {
  const steps = [...document.querySelectorAll('[data-assembly-step]')];
  if (completedAssemblySteps.length === steps.length) { toast('Montagem concluída. Faça a conferência final.'); return; }
  const selected = steps.find(step => Number(step.dataset.assemblyStep) === currentAssemblyStep && !completedAssemblySteps.includes(currentAssemblyStep));
  const next = selected || steps.find(step => !completedAssemblySteps.includes(Number(step.dataset.assemblyStep)));
  currentAssemblyStep = Number(next.dataset.assemblyStep);
  completedAssemblySteps.push(currentAssemblyStep);
  const following = steps.find(step => !completedAssemblySteps.includes(Number(step.dataset.assemblyStep)));
  if (following) currentAssemblyStep = Number(following.dataset.assemblyStep);
  renderAssemblyProgress();
  toast(completedAssemblySteps.length === 5 ? 'Montagem concluída.' : 'Etapa marcada como concluída.');
});
$('#reset-assembly').addEventListener('click', () => { completedAssemblySteps = []; renderAssemblyProgress(); toast('Manual recomeçado.'); });
$('#assembly-explode').addEventListener('click', event => { assemblyView = !assemblyView; event.currentTarget.textContent = assemblyView ? 'Voltar para montagem' : 'Ver peças separadas'; rebuildModel(); });
$('#print-manual').addEventListener('click', () => window.print());

document.querySelectorAll('[data-field]').forEach(input => input.addEventListener('input', () => { readState(); updateSummary(); renderAssemblyInventory(); rebuildModel(); updateQuote(); }));
document.querySelectorAll('[data-field]').forEach(input => input.addEventListener('change', () => { readState(); updateSummary(); renderAssemblyInventory(); rebuildModel(); updateQuote(); }));
document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => showStep(button.dataset.step)));
document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => { readState(); updateSummary(); showStep(button.dataset.next); }));
document.querySelectorAll('[data-prev]').forEach(button => button.addEventListener('click', () => showStep(button.dataset.prev)));
$('#reference-media').addEventListener('change', event => { addReferenceFiles(event.target.files); event.target.value = ''; });
$('#share-project').addEventListener('click', shareProject);
$('#save-project').addEventListener('click', () => { const projects = JSON.parse(localStorage.getItem('montai.savedProjects') || '[]'); projects.unshift(projectPayload()); localStorage.setItem('montai.savedProjects', JSON.stringify(projects.slice(0, 20))); toast('Projeto salvo neste dispositivo.'); });
function addToCart() { const cart = JSON.parse(localStorage.getItem('montai.cart') || '[]'); cart.push({ ...projectPayload(), name: modelNames[state.model], price: lastQuote?.total || fallbackQuote().total, manufacturer: manufacturerMap[state.manufacturer]?.name || '', finish: materials[state.material]?.label || '', finishCode: materials[state.material]?.code || '' }); localStorage.setItem('montai.cart', JSON.stringify(cart)); toast('Móvel personalizado adicionado à sacola.'); }
$('#add-cart').addEventListener('click', addToCart);
$('#buy-now').addEventListener('click', () => { addToCart(); toast('Configuração preparada para o checkout.'); });
$('#save-image').addEventListener('click', () => { const link = document.createElement('a'); link.download = 'montae-movel-personalizado.png'; link.href = renderer.domElement.toDataURL('image/png'); link.click(); });

readState();
renderManufacturerOptions();
renderModelOptions();
renderMaterialOptions();
renderReferenceFiles();
updateSummary();
renderAssemblyInventory();
renderAssemblyProgress();
initScene();
updateQuote();
window.addEventListener('beforeunload', () => referenceObjectUrls.forEach(url => URL.revokeObjectURL(url)));
