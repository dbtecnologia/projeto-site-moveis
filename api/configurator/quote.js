const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const round = value => Math.round(value * 100) / 100;
const models = new Set(['custom-wardrobe', 'custom-closet', 'custom-rack', 'custom-shelf', 'custom-kitchen', 'custom-bathroom', 'custom-desk', 'custom-sideboard']);
const materials = {
  freijo: { label: 'Freijó', rate: 115 },
  'pau-ferro': { label: 'Pau-Ferro', rate: 122 },
  'carvalho-natural': { label: 'Carvalho Natural', rate: 122 },
  imbuia: { label: 'Imbuia', rate: 125 },
  quartzo: { label: 'Quartzo', rate: 130 },
  fontana: { label: 'Fontana', rate: 132 },
  'cinza-perfeito': { label: 'Cinza Perfeito', rate: 105 },
  mangue: { label: 'Mangue', rate: 108 },
  areia: { label: 'Areia', rate: 98 },
  brisa: { label: 'Brisa', rate: 98 },
  'azul-petroleo': { label: 'Azul Petróleo', rate: 108 },
  grafite: { label: 'Grafite', rate: 105 },
  'marrom-sepia': { label: 'Marrom Sépia', rate: 115 },
};
const limits = { width: [40, 300], height: [60, 280], depth: [25, 90], thickness: [15, 25], doors: [0, 4], drawers: [0, 6], shelves: [0, 8] };

function validInteger(value, range) { return Number.isInteger(value) && value >= range[0] && value <= range[1]; }
function validate(configuration, modelId) {
  if (!models.has(modelId)) return 'model_not_supported';
  for (const key of Object.keys(limits)) {
    const value = number(configuration[key], NaN);
    if (!validInteger(value, limits[key])) return `${key}_out_of_range`;
  }
  if (configuration.doors > 0 && configuration.width / configuration.doors < 25) return 'doors_too_narrow';
  if (configuration.shelves > 0 && configuration.height / (configuration.shelves + 1) < 18) return 'shelves_too_close';
  return null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method_not_allowed' }); }
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch (_error) { return res.status(400).json({ error: 'invalid_json' }); }
  const configuration = body.configuration || {};
  const modelId = String(body.modelId || configuration.model || '');
  const error = validate(configuration, modelId);
  if (error) return res.status(422).json({ error, message: 'A configuração não atende às regras dimensionais atuais.' });

  const material = materials[String(configuration.material)] || materials.freijo;
  const width = number(configuration.width), height = number(configuration.height), depth = number(configuration.depth), thickness = number(configuration.thickness);
  const shelves = number(configuration.shelves), doors = number(configuration.doors), drawers = number(configuration.drawers);
  const area = (2 * height * depth + 2 * width * depth + width * height * .55 + shelves * width * depth) / 10000;
  const materialCost = area * material.rate * (thickness / 18);
  const components = doors * 95 + drawers * 180 + shelves * 28;
  const labor = 280 + doors * 35 + drawers * 55;
  const operatingCost = (materialCost + components + labor) * .08;
  const subtotal = round(materialCost + components + labor + operatingCost);
  const total = round(subtotal * 1.25);
  const pixTotal = round(total * .95);
  return res.status(200).json({ source: 'server', modelId, currency: 'BRL', total, pixTotal, subtotal, priceVersion: 'configurator-v1', configuration: { width, height, depth, thickness, material: material.label, doors, drawers, shelves }, breakdown: { areaM2: round(area), material: round(materialCost), components: round(components), labor: round(labor), operatingCost: round(operatingCost), margin: round(total - subtotal) } });
};
