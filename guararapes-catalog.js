(function () {
  const base = 'assets/guararapes/';
  const source = 'https://www.guararapes.com.br/produto/';
  window.GUARARAPES_CATALOG = [
    { id: 'pau-ferro', name: 'Pau-Ferro', line: 'Madeiras do Brasil', finish: 'Deep Wood', previewColor: 0x6f4933, image: `${base}pau-ferro.webp`, sourceUrl: `${source}pau-ferro/` },
    { id: 'carvalho-natural', name: 'Carvalho Natural', line: 'Madeiras do Mundo', finish: 'Deep Wood', previewColor: 0xb1845a, image: `${base}carvalho-natural.webp`, sourceUrl: `${source}carvalho-natural/` },
    { id: 'imbuia', name: 'Imbuia', line: 'Madeiras do Brasil', finish: 'Deep Wood', previewColor: 0x4b3023, image: `${base}imbuia.webp`, sourceUrl: `${source}imbuia/` },
    { id: 'freijo', name: 'Freijó', line: 'Madeiras do Brasil', finish: 'Syncro', previewColor: 0xa8754d, image: `${base}freijo.webp`, sourceUrl: `${source}freijo/` },
    { id: 'quartzo', name: 'Quartzo', line: 'Magma', finish: 'Magma', previewColor: 0xd9d4c9, image: `${base}quartzo.webp`, sourceUrl: `${source}quartzo/` },
    { id: 'fontana', name: 'Fontana', line: 'Magma', finish: 'Magma', previewColor: 0xd0c9bd, image: `${base}fontana.webp`, sourceUrl: `${source}fontana/` },
    { id: 'cinza-perfeito', name: 'Cinza Perfeito', line: 'Colors', finish: 'Matt', previewColor: 0x969797, image: `${base}cinza-perfeito.webp`, sourceUrl: `${source}cinza-perfeito/` },
    { id: 'mangue', name: 'Mangue', line: 'Colors', finish: 'Matt', previewColor: 0x75533f, image: `${base}mangue.webp`, sourceUrl: `${source}mangue/` },
    { id: 'areia', name: 'Areia', line: 'Colors', finish: 'Matt', previewColor: 0xd2c5ae, image: `${base}areia.webp`, sourceUrl: `${source}areia/` },
    { id: 'brisa', name: 'Brisa', line: 'Colors', finish: 'Matt', previewColor: 0xd6d8d2, image: `${base}brisa.webp`, sourceUrl: `${source}brisa/` },
    { id: 'azul-petroleo', name: 'Azul Petróleo', line: 'Colors', finish: 'Matt', previewColor: 0x164d58, image: `${base}azul-petroleo.webp`, sourceUrl: `${source}azul-petroleo/` },
    { id: 'grafite', name: 'Grafite', line: 'Colors', finish: 'Matt', previewColor: 0x3d3e3e, image: `${base}grafite.webp`, sourceUrl: `${source}grafite/` },
    { id: 'marrom-sepia', name: 'Marrom Sépia', line: 'Colors', finish: 'Matt', previewColor: 0x60473d, image: `${base}marrom-sepia.webp`, sourceUrl: `${source}marrom-sepia/` },
  ];

  // A atualização/importação feita no painel pode complementar o catálogo local
  // sem substituir os padrões oficiais já verificados no código.
  try {
    const saved = JSON.parse(localStorage.getItem('montai.guararapesCatalog') || 'null');
    if (Array.isArray(saved?.entries)) {
      const merged = new Map([...window.GUARARAPES_CATALOG, ...saved.entries]
        .filter(item => item && item.id && item.name && item.image)
        .map(item => [item.id, item]));
      window.GUARARAPES_CATALOG = [...merged.values()];
    }
  } catch (_error) { /* catálogo incorporado segue disponível offline */ }

  // Padrões citados no pedido, mas não localizados no catálogo oficial consultado.
  // Permanecem pendentes para importação manual, sem equivalência inventada.
  window.GUARARAPES_REVIEW_QUEUE = [
    'Carvalho Canári', 'Louro Freijó Poro', 'Louro Freijó Trend', 'Frevo', 'Frapê',
    'Lord', 'Kashmir', 'Cinza Cristal', 'Branco Supremo', 'Cristalina', 'Betón', 'Ébano',
  ];
  window.GUARARAPES_CATALOG_META = {
    version: 'official-pages-2026-11-13',
    downloadsUrl: 'https://www.guararapes.com.br/downloads/',
    disclaimer: 'Imagens oficiais de referência; confirmar autorização comercial e validar a amostra física antes de especificar.',
  };
}());
