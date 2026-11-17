/*
 * Fabricantes de MDF cadastrados para a loja.
 *
 * Os padrões só entram aqui quando há dados reais do fabricante. Hoje o
 * catálogo Guararapes já está incorporado no projeto; os demais fabricantes
 * ficam disponíveis para seleção, mas aguardam importação de seus catálogos.
 * Isso evita inventar nomes, códigos ou acabamentos.
 */
(function () {
  const guararapesEntries = Array.isArray(window.GUARARAPES_CATALOG)
    ? window.GUARARAPES_CATALOG.map(item => ({
      ...item,
      manufacturerId: 'guararapes',
      code: item.code || '',
      availability: item.availability || 'active',
    }))
    : [];

  const defaults = [
    {
      id: 'arauco',
      name: 'Arauco',
      website: 'https://arauco.com.br/',
      catalogUrl: 'https://arauco.com.br/downloads/',
      logo: 'https://images.seeklogo.com/logo-png/19/1/arauco-logo-png_seeklogo-191105.png',
      logoSource: 'https://arauco.com.br/blog/arauco-apresenta-nova-identidade-visual/',
      active: true,
      patterns: [],
    },
    {
      id: 'guararapes',
      name: 'Guararapes',
      website: 'https://www.guararapes.com.br/',
      catalogUrl: 'https://www.guararapes.com.br/produtos/mdf/decorativos/',
      logo: 'https://www.guararapes.com.br/images/logo.svg',
      logoSource: 'https://www.guararapes.com.br/',
      active: true,
      patterns: guararapesEntries,
    },
    {
      id: 'berneck',
      name: 'Berneck',
      website: 'https://www.berneck.com.br/',
      catalogUrl: 'https://www.berneck.com.br/products/mdf-berneck',
      logo: 'https://s3.sa-east-1.amazonaws.com/gofind.img.repo/berneck.jpg',
      logoSource: 'https://www.berneck.com.br/onde-comprar',
      active: true,
      patterns: [],
    },
    {
      id: 'duratex',
      name: 'Duratex',
      website: 'https://www.duratex.com.br/',
      catalogUrl: 'https://www.duratex.com.br/produtos',
      logo: 'https://www.duratex.com.br/images/logos/logo_duratex_madeira.svg',
      logoSource: 'https://www.duratex.com.br/',
      active: true,
      patterns: [],
    },
  ];

  let saved = [];
  try {
    const parsed = JSON.parse(localStorage.getItem('montai.manufacturers') || '[]');
    if (Array.isArray(parsed)) saved = parsed;
  } catch (_error) {
    saved = [];
  }

  const savedById = new Map(saved.map(item => [item.id, item]));
  window.MDF_MANUFACTURERS = defaults.map(manufacturer => {
    const override = savedById.get(manufacturer.id);
    if (!override) return manufacturer;
    const patterns = Array.isArray(override.patterns) && override.patterns.every(pattern => pattern && pattern.id && pattern.name && pattern.image && pattern.sourceUrl)
      ? override.patterns
      : manufacturer.patterns;
    return {
      ...manufacturer,
      ...override,
      patterns,
      logo: override.logo || manufacturer.logo,
      catalogUrl: override.catalogUrl || manufacturer.catalogUrl,
    };
  });

  window.MDF_MANUFACTURER_MAP = Object.fromEntries(window.MDF_MANUFACTURERS.map(item => [item.id, item]));
}());
