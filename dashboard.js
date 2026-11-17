(function () {
  const body = document.body;
  const toast = document.querySelector('[data-toast]');
  let toastTimer;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  function setView(viewName, updateUrl = true) {
    const target = document.querySelector(`[data-view="${viewName}"]`);
    if (!target) return;
    document.querySelectorAll('[data-view]').forEach(view => view.classList.toggle('active', view === target));
    document.querySelectorAll('[data-view-link]').forEach(link => link.classList.toggle('active', link.dataset.viewLink === viewName));
    if (updateUrl) history.replaceState(null, '', `#${viewName}`);
    const heading = target.querySelector('h1');
    if (heading) document.title = `${heading.textContent} · Montaí Móveis`;
    document.querySelector('.sidebar')?.classList.remove('open');
  }

  document.querySelectorAll('[data-view-link]').forEach(link => {
    link.addEventListener('click', event => {
      const view = link.dataset.viewLink;
      if (!document.querySelector(`[data-view="${view}"]`)) return;
      event.preventDefault();
      setView(view);
    });
  });

  const initialView = location.hash.replace('#', '') || (body.dataset.dashboard === 'customer' ? 'summary' : 'overview');
  setView(initialView, false);
  window.addEventListener('hashchange', () => setView(location.hash.replace('#', ''), false));

  document.querySelector('[data-sidebar-toggle]')?.addEventListener('click', () => document.querySelector('.sidebar')?.classList.toggle('open'));

  document.querySelectorAll('[data-demo-action]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      showToast(button.dataset.demoAction || 'Esta ação será ativada na próxima etapa.');
    });
  });

  function closeModal(modal) { modal?.classList.remove('open'); }
  document.querySelectorAll('[data-open-modal]').forEach(button => {
    button.addEventListener('click', () => {
      const modal = document.getElementById(button.dataset.openModal);
      if (modal) {
        prepareManagerForm(modal);
        modal.classList.add('open');
      }
    });
  });
  document.querySelectorAll('[data-close-modal]').forEach(button => {
    button.addEventListener('click', () => closeModal(button.closest('.modal-backdrop')));
  });
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', event => { if (event.target === backdrop) closeModal(backdrop); });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') document.querySelectorAll('.modal-backdrop.open').forEach(closeModal);
  });

  document.querySelectorAll('[data-demo-form]').forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      closeModal(form.closest('.modal-backdrop'));
      showToast('Alterações salvas nesta prévia. O próximo passo é sincronizar com o Supabase.');
    });
  });

  const defaultBanners = [
    { eyebrow: 'Móveis que transformam', title: 'Seu espaço. Seu jeito.', description: 'Móveis que transformam ambientes e combinam com a sua história.', image_url: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1800&q=85', primary_label: 'Comprar móveis →', primary_url: '#produtos', secondary_label: 'Personalize seu móvel', secondary_url: '#personalize', sort_order: 0, active: true },
    { eyebrow: 'Personalização de verdade', title: 'Feito para caber em você.', description: 'Escolha acabamentos, medidas e detalhes para criar uma peça só sua.', image_url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1800&q=85', primary_label: 'Criar meu móvel →', primary_url: '#personalize', secondary_label: 'Ver coleção', secondary_url: '#produtos', sort_order: 1, active: true },
    { eyebrow: 'Coleção para viver', title: 'Mais beleza no dia a dia.', description: 'Peças acolhedoras para deixar cada canto da casa com mais sentido.', image_url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1800&q=85', primary_label: 'Conhecer favoritos →', primary_url: '#produtos', secondary_label: 'Ver ofertas', secondary_url: '#produtos', sort_order: 2, active: true },
  ];
  const defaultOffers = [
    { title: 'Frete para todo o Brasil', detail: '', icon: '↗', sort_order: 0, active: true },
    { title: 'Parcela em até 12x no cartão', detail: '', icon: '▣', sort_order: 1, active: true },
    { title: '5% OFF no PIX', detail: '', icon: '◆', sort_order: 2, active: true },
    { title: 'Montagem especializada', detail: '', icon: '⌁', sort_order: 3, active: true },
  ];
  const defaultProducts = [
    { id: 'demo-rack-lisboa', name: 'Rack Lisboa', category: 'Sala', price: 999.9, old: 'R$ 1.299,90', discount: '-23%', pix: 'R$ 949,90 no PIX', image: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=700&q=80', badge: 'Mais vendido' },
    { id: 'demo-guarda-roupa-nordico', name: 'Guarda-Roupa Nórdico', category: 'Quarto', price: 1799.9, old: 'R$ 2.199,90', discount: '-18%', pix: 'R$ 1.709,90 no PIX', image: 'https://images.unsplash.com/photo-1558997519-83ea9252edf8?auto=format&fit=crop&w=700&q=80', badge: '' },
    { id: 'demo-mesa-jantar-premium', name: 'Mesa de Jantar Premium', category: 'Sala de Jantar', price: 1199.9, old: 'R$ 1.499,90', discount: '-20%', pix: 'R$ 1.139,90 no PIX', image: 'https://images.unsplash.com/photo-1617104678098-de229db51175?auto=format&fit=crop&w=700&q=80', badge: '' },
  ];
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const readLocal = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch (_error) { return fallback; }
  };
  const defaultManufacturers = (window.MDF_MANUFACTURERS || []).map(manufacturer => ({
    ...manufacturer,
    patterns: Array.isArray(manufacturer.patterns) ? manufacturer.patterns : [],
  }));
  let manufacturers = readLocal('montai.manufacturers', defaultManufacturers);
  function optimizeImage(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) return reject(new Error('Selecione uma imagem válida.'));
      if (file.size > 5 * 1024 * 1024) return reject(new Error('A imagem precisa ter até 5 MB.'));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('Não foi possível processar a imagem.'));
        image.onload = () => {
          const maxSize = 1800;
          const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', .84));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function setPreview(form, source) {
    const preview = form?.querySelector('[data-image-preview]');
    if (!preview) return;
    preview.src = source || '';
    preview.classList.toggle('visible', Boolean(source));
  }

  document.querySelectorAll('[data-image-input]').forEach(input => {
    input.addEventListener('change', async () => {
      const form = input.closest('form');
      const file = input.files?.[0];
      if (!file) return;
      try {
        const dataUrl = await optimizeImage(file);
        input.dataset.dataUrl = dataUrl;
        setPreview(form, dataUrl);
        const hint = form.querySelector('[data-image-name]');
        if (hint) hint.textContent = `${file.name} · imagem pronta para salvar`;
      } catch (error) {
        input.value = '';
        input.dataset.dataUrl = '';
        showToast(error.message);
      }
    });
  });
  let banners = readLocal('montai.banners', defaultBanners);
  let offers = readLocal('montai.offers', defaultOffers);

  function managerRow(icon, title, detail, index, type) {
    return `<div class="activity"><span class="activity-mark">${icon || '•'}</span><div style="min-width:0"><p><strong>${title}</strong></p><small>${detail || 'Ativo na vitrine'}</small></div><button class="button button-light" style="margin-left:auto" data-edit-${type}="${index}">Editar</button></div>`;
  }

  function renderManagers() {
    const bannerList = document.querySelector('[data-banner-list]');
    if (bannerList) {
      bannerList.innerHTML = banners.map((banner, index) => managerRow('▤', banner.title, `${banner.eyebrow} · ${banner.image_url ? 'imagem configurada' : 'sem imagem'}`, index, 'banner')).join('');
      document.querySelector('[data-banner-status]')?.replaceChildren(document.createTextNode(`${banners.length} banners configurados`));
    }
    const offerList = document.querySelector('[data-offer-list]');
    if (offerList) {
      offerList.innerHTML = offers.map((offer, index) => managerRow(offer.icon || '◆', offer.title, `${offer.detail || 'Exibida na faixa superior da loja'}${offer.code ? ` · código ${offer.code}` : ''}`, index, 'offer')).join('');
      document.querySelector('[data-offer-status]')?.replaceChildren(document.createTextNode(`${offers.length} mensagens configuradas`));
    }
    document.querySelectorAll('[data-edit-banner]').forEach(button => button.addEventListener('click', () => openManager('banner', Number(button.dataset.editBanner))));
    document.querySelectorAll('[data-edit-offer]').forEach(button => button.addEventListener('click', () => openManager('offer', Number(button.dataset.editOffer))));
  }

  function renderProductManager() {
    const list = document.querySelector('[data-product-list]');
    if (!list) return;
    const products = readLocal('montai.catalog', defaultProducts);
    const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    list.innerHTML = products.map((product, index) => `<tr><td><div class="product-row"><span class="product-thumb" style="background-image:url('${escapeHtml(product.image)}')"></span><strong>${escapeHtml(product.name)}</strong></div></td><td>${escapeHtml(product.sku || '—')}</td><td>${escapeHtml(product.category || 'Móveis')}</td><td>${money(product.price)}</td><td><span class="pill green">Ativo</span></td><td><button class="button button-light" data-edit-product="${index}">Editar</button></td></tr>`).join('');
    list.querySelectorAll('[data-edit-product]').forEach(button => button.addEventListener('click', () => openManager('product', Number(button.dataset.editProduct))));
  }

  function renderManufacturerManager() {
    const container = document.querySelector('[data-manufacturer-manager]');
    if (!container) return;
    container.innerHTML = manufacturers.map((manufacturer, index) => `
      <article class="card manufacturer-admin-card">
        <div class="card-head"><div><h2>${escapeHtml(manufacturer.name)}</h2><span class="status"><i class="status-dot"></i>${manufacturer.patterns?.length || 0} padrões cadastrados</span></div><span class="pill ${manufacturer.active === false ? 'gray' : 'green'}">${manufacturer.active === false ? 'Inativo' : 'Ativo'}</span></div>
        <form class="card-pad manufacturer-admin-form" data-manufacturer-form data-index="${index}">
          <div class="field"><label>URL da logo</label><input name="logo" type="url" value="${escapeHtml(manufacturer.logo || '')}" required></div>
          <div class="form-grid"><div class="field"><label>Catálogo oficial</label><input name="catalogUrl" type="url" value="${escapeHtml(manufacturer.catalogUrl || '')}" required></div><label class="toggle-row"><input name="active" type="checkbox" ${manufacturer.active === false ? '' : 'checked'}><span class="toggle-ui"></span><span>Marca ativa na loja</span></label></div>
          <div class="field"><label>IDs de padrões disponíveis</label><textarea name="patternIds" rows="3" placeholder="freijo, quartzo">${escapeHtml((manufacturer.patterns || []).map(pattern => pattern.id).join(', '))}</textarea><small class="upload-hint">Use somente IDs existentes no catálogo oficial incorporado. Não invente nomes, códigos ou acabamentos.</small></div>
          <div class="field"><label>Atualizar padrões via JSON oficial</label><textarea name="patternsJson" rows="5" placeholder='[{"id":"...","name":"...","image":"...","sourceUrl":"..."}]'>${escapeHtml((manufacturer.patterns || []).length ? JSON.stringify(manufacturer.patterns, null, 2) : '')}</textarea><small class="upload-hint">Opcional. Cada item precisa ter id, name, image e sourceUrl. O JSON deve vir de uma fonte oficial.</small></div>
          <div class="form-actions"><button class="button button-accent" type="submit">Salvar fabricante</button></div>
        </form>
      </article>
    `).join('');
    container.querySelectorAll('[data-manufacturer-form]').forEach(form => form.addEventListener('submit', event => {
      event.preventDefault();
      const index = Number(form.dataset.index);
      const current = manufacturers[index];
      const data = Object.fromEntries(new FormData(form).entries());
      let availablePatterns = current.patterns || [];
      if (String(data.patternsJson || '').trim()) {
        try {
          const parsed = JSON.parse(data.patternsJson);
          if (!Array.isArray(parsed)) throw new Error('patterns');
          const valid = parsed.filter(pattern => pattern && pattern.id && pattern.name && pattern.image && pattern.sourceUrl);
          if (!valid.length) throw new Error('empty');
          availablePatterns = valid;
        } catch (_error) {
          showToast('JSON inválido. Informe uma lista oficial com id, name, image e sourceUrl.');
          return;
        }
      }
      const allowedIds = new Set(availablePatterns.map(pattern => pattern.id));
      const requestedIds = String(data.patternIds || '').split(',').map(value => value.trim()).filter(Boolean);
      manufacturers[index] = { ...current, logo: data.logo, catalogUrl: data.catalogUrl, active: data.active === 'on', patterns: availablePatterns.filter(pattern => requestedIds.includes(pattern.id) && allowedIds.has(pattern.id)) };
      localStorage.setItem('montai.manufacturers', JSON.stringify(manufacturers));
      renderManufacturerManager();
      showToast('Fabricante salvo nesta prévia.');
    }));
  }

  const defaultSales = [
    { date: '2026-09-08', order: '#MT-1038', product: 'Rack Lisboa', quantity: 2, payment: 'PIX', total: 1899.8 },
    { date: '2026-09-14', order: '#MT-1040', product: 'Guarda-Roupa Nórdico', quantity: 1, payment: 'Cartão', total: 1799.9 },
    { date: '2026-09-18', order: '#MT-1041', product: 'Mesa de Jantar Premium', quantity: 1, payment: 'PIX', total: 1199.9 },
    { date: '2026-09-22', order: '#MT-1042', product: 'Rack Lisboa', quantity: 1, payment: 'Cartão', total: 999.9 },
    { date: '2026-09-27', order: '#MT-1044', product: 'Cama Casal Montana', quantity: 1, payment: 'PIX', total: 1499.9 },
    { date: '2026-10-01', order: '#MT-1046', product: 'Guarda-Roupa Nórdico', quantity: 1, payment: 'Cartão', total: 2340.5 },
    { date: '2026-10-02', order: '#MT-1047', product: 'Mesa de Jantar Premium', quantity: 1, payment: 'PIX', total: 829 },
    { date: '2026-10-03', order: '#MT-1048', product: 'Rack Lisboa', quantity: 1, payment: 'PIX', total: 1899.9 },
  ];
  const financeSales = readLocal('montai.sales', defaultSales);
  const localDate = date => date.toISOString().slice(0, 10);
  const financeMoney = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = value => new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');

  function selectedFinanceRows() {
    const start = document.querySelector('[data-finance-start]')?.value || '1900-01-01';
    const end = document.querySelector('[data-finance-end]')?.value || '2999-12-31';
    return financeSales.filter(row => row.date >= start && row.date <= end);
  }

  function renderFinance() {
    const rows = selectedFinanceRows();
    const revenue = rows.reduce((sum, row) => sum + Number(row.total || 0), 0);
    const pix = rows.filter(row => row.payment === 'PIX').reduce((sum, row) => sum + Number(row.total || 0), 0);
    const card = rows.filter(row => row.payment !== 'PIX').reduce((sum, row) => sum + Number(row.total || 0), 0);
    const uniqueOrders = new Set(rows.map(row => row.order)).size;
    const start = document.querySelector('[data-finance-start]')?.value || '';
    const end = document.querySelector('[data-finance-end]')?.value || '';
    const setText = (selector, value) => { const element = document.querySelector(selector); if (element) element.textContent = value; };
    setText('[data-finance-revenue]', financeMoney(revenue));
    setText('[data-finance-revenue-foot]', rows.length ? `${rows.length} vendas detalhadas` : 'Nenhuma venda no período');
    setText('[data-finance-orders]', String(uniqueOrders));
    setText('[data-finance-orders-foot]', `${rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0)} itens vendidos`);
    setText('[data-finance-ticket]', financeMoney(uniqueOrders ? revenue / uniqueOrders : 0));
    setText('[data-finance-pix]', financeMoney(pix));
    setText('[data-finance-card]', `Cartão: ${financeMoney(card)}`);
    setText('[data-finance-period]', `${start ? formatDate(start) : 'início'} a ${end ? formatDate(end) : 'hoje'}`);

    const chart = document.querySelector('[data-finance-chart]');
    if (chart) {
      const byDay = rows.reduce((result, row) => { result[row.date] = (result[row.date] || 0) + Number(row.total || 0); return result; }, {});
      const days = Object.entries(byDay).slice(-8);
      const max = Math.max(...days.map(([, value]) => value), 1);
      chart.innerHTML = days.length ? days.map(([date, value]) => `<div class="bar-wrap"><i class="bar ${value === max ? 'current' : ''}" style="--height:${Math.max(12, Math.round(value / max * 100))}%" title="${financeMoney(value)}"></i><span>${new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}</span></div>`).join('') : '<div class="empty-state" style="width:100%">Sem vendas no período selecionado.</div>';
    }

    const products = rows.reduce((result, row) => { result[row.product] = (result[row.product] || 0) + Number(row.quantity || 0); return result; }, {});
    const productList = document.querySelector('[data-top-products]');
    if (productList) {
      const sorted = Object.entries(products).sort((a, b) => b[1] - a[1]).slice(0, 5);
      productList.innerHTML = sorted.length ? sorted.map(([name, quantity], index) => `<div class="activity"><span class="activity-mark">${index + 1}</span><div><p><strong>${escapeHtml(name)}</strong></p><small>${quantity} ${quantity === 1 ? 'unidade vendida' : 'unidades vendidas'}</small></div></div>`).join('') : '<div class="empty-state">Nenhum produto vendido no período.</div>';
    }

    const table = document.querySelector('[data-finance-sales]');
    if (table) table.innerHTML = rows.length ? rows.map(row => `<tr><td>${formatDate(row.date)}</td><td><strong>${escapeHtml(row.order)}</strong></td><td>${escapeHtml(row.product)} · ${row.quantity}</td><td><span class="pill ${row.payment === 'PIX' ? 'green' : 'orange'}">${escapeHtml(row.payment)}</span></td><td>${financeMoney(row.total)}</td></tr>`).join('') : '<tr><td colspan="5"><div class="empty-state">Nenhuma venda encontrada.</div></td></tr>';
  }

  function downloadFinanceReport(format) {
    const rows = selectedFinanceRows();
    if (format === 'json') {
      const blob = new Blob([JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'montai-relatorio-vendas.json'; link.click(); URL.revokeObjectURL(url); showToast('Relatório JSON baixado.'); return;
    }
    const header = ['Data', 'Pedido', 'Produto', 'Quantidade', 'Pagamento', 'Total'];
    const csvRows = rows.map(row => [row.date, row.order, row.product, row.quantity, row.payment, Number(row.total).toFixed(2)]);
    const csv = '\uFEFF' + [header, ...csvRows].map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'montai-relatorio-vendas.csv'; link.click(); URL.revokeObjectURL(url); showToast('Relatório CSV baixado.');
  }

  const today = new Date();
  const monthAgo = new Date(today); monthAgo.setDate(today.getDate() - 30);
  const financeStart = document.querySelector('[data-finance-start]');
  const financeEnd = document.querySelector('[data-finance-end]');
  if (financeStart && financeEnd) { financeStart.value = localDate(monthAgo); financeEnd.value = localDate(today); }
  document.querySelector('[data-finance-apply]')?.addEventListener('click', renderFinance);
  document.querySelectorAll('[data-finance-export]').forEach(button => button.addEventListener('click', () => downloadFinanceReport(button.dataset.financeExport)));
  renderFinance();

  const defaultChatMessages = [
    { id: 'welcome', sender: 'admin', body: 'Olá, Ana! Estamos por aqui para ajudar. Como podemos deixar seu projeto ainda melhor?', createdAt: '10:18' },
    { id: 'question', sender: 'customer', body: 'Oi! Gostaria de confirmar se consigo alterar a medida do Rack Lisboa antes da produção.', createdAt: '10:21' },
    { id: 'answer', sender: 'admin', body: 'Consegue sim. Vou verificar a medida ideal e já te retorno por aqui.', createdAt: '10:24' },
  ];
  let chatMessages = readLocal('montai.chat.messages', defaultChatMessages);

  function renderChat() {
    document.querySelectorAll('[data-chat-messages]').forEach(container => {
      container.innerHTML = chatMessages.map(message => {
        const attachmentUrl = message.image || message.attachments?.find(attachment => attachment?.type === 'image')?.url || '';
        const image = typeof attachmentUrl === 'string' && /^(data:image\/|https?:\/\/)/.test(attachmentUrl)
          ? `<img class="chat-image" src="${escapeHtml(attachmentUrl)}" alt="Foto enviada no atendimento">`
          : '';
        const text = message.body ? `<span>${escapeHtml(message.body)}</span>` : '';
        return `<div class="chat-message ${message.sender === 'customer' ? 'customer' : 'admin'}">${image}${text}<small>${escapeHtml(message.createdAt || '')}</small></div>`;
      }).join('');
      container.scrollTop = container.scrollHeight;
    });
  }

  document.querySelectorAll('[data-chat-image]').forEach(input => {
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        input.dataset.dataUrl = await optimizeImage(file);
        const name = input.closest('form')?.querySelector('[data-chat-file-name]');
        if (name) name.textContent = `${file.name} · foto pronta`;
      } catch (error) {
        input.value = '';
        input.dataset.dataUrl = '';
        showToast(error.message);
      }
    });
  });

  document.querySelectorAll('[data-chat-form]').forEach(form => form.addEventListener('submit', event => {
    event.preventDefault();
    const input = form.elements.message;
    const imageInput = form.querySelector('[data-chat-image]');
    const bodyText = input.value.trim();
    const image = imageInput?.dataset.dataUrl || '';
    if (!bodyText && !image) return;
    chatMessages = [...chatMessages, { id: `local-${Date.now()}`, sender: body.dataset.dashboard === 'admin' ? 'admin' : 'customer', body: bodyText, image, createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }];
    try {
      localStorage.setItem('montai.chat.messages', JSON.stringify(chatMessages));
    } catch (_error) {
      chatMessages = chatMessages.slice(0, -1);
      showToast('A foto ficou grande demais para a prévia local. Tente uma imagem menor.');
      return;
    }
    input.value = '';
    if (imageInput) { imageInput.value = ''; imageInput.dataset.dataUrl = ''; }
    const name = form.querySelector('[data-chat-file-name]');
    if (name) name.textContent = '';
    renderChat();
  }));
  window.addEventListener('storage', event => { if (event.key === 'montai.chat.messages') { chatMessages = readLocal('montai.chat.messages', defaultChatMessages); renderChat(); } });
  renderChat();

  function setFormValues(form, data) {
    Object.entries(data || {}).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value ?? ''; });
  }

  function prepareManagerForm(modal) {
    const form = modal.querySelector('form');
    if (!form) return;
    form.reset();
    if (form.elements.index) form.elements.index.value = '';
    form.querySelectorAll('[data-image-input]').forEach(input => { input.dataset.dataUrl = ''; });
    form.querySelectorAll('[data-image-input]').forEach(input => { input.dataset.existingImage = ''; });
    setPreview(form, '');
    if (modal.id === 'product-modal') modal.querySelector('#product-title').textContent = 'Novo produto';
  }

  function openManager(type, index) {
    if (type === 'product') {
      const modal = document.getElementById('product-modal');
      const form = modal?.querySelector('form');
      const products = readLocal('montai.catalog', defaultProducts);
      const data = products[index];
      if (!modal || !form || !data) return;
      const originalPrice = data.old ? Number(String(data.old).replace(/[^0-9,]/g, '').replace(/\./g, '').replace(',', '.')) : '';
      setFormValues(form, { ...data, index, price: data.price, compare_at_price: originalPrice || '', installments: data.installments || 12, installment_interest: Number(data.installmentInterest || 0) * 100, pix_discount: data.pixDiscount != null ? Number(data.pixDiscount) * 100 : 5 });
      if (form.elements.mdf_manufacturers) form.elements.mdf_manufacturers.value = (data.mdfManufacturers || []).join(', ');
      if (form.elements.guararapes_finishes) form.elements.guararapes_finishes.value = (data.guararapesFinishes || []).join(', ');
      form.elements.image_file.dataset.existingImage = data.image || '';
      setPreview(form, data.image || '');
      modal.querySelector('#product-title').textContent = 'Editar produto';
      modal.classList.add('open');
      return;
    }
    const modal = document.getElementById(type === 'banner' ? 'banner-modal' : 'offer-modal');
    const form = modal?.querySelector('form');
    const data = type === 'banner' ? banners[index] : offers[index];
    if (!modal || !form || !data) return;
    setFormValues(form, { ...data, index });
    setPreview(form, data.image_url || data.image);
    modal.classList.add('open');
  }

  document.querySelector('[data-banner-form]')?.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const index = data.index === '' ? banners.length : Number(data.index);
    delete data.index;
    const imageInput = form.elements.image_file;
    if (imageInput?.dataset.dataUrl) data.image_url = imageInput.dataset.dataUrl;
    delete data.image_file;
    if (!data.image_url) { showToast('Escolha uma foto do computador ou informe uma URL de imagem.'); return; }
    banners[index] = { ...banners[index], ...data, active: true, sort_order: index };
    try { localStorage.setItem('montai.banners', JSON.stringify(banners)); } catch (_error) { showToast('A foto é grande demais para esta prévia. Conecte o Storage do Supabase para salvar imagens.'); return; }
    closeModal(form.closest('.modal-backdrop')); renderManagers();
    showToast('Banner salvo. Atualize a loja para visualizar o carrossel.');
  });

  document.querySelector('[data-offer-form]')?.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const index = data.index === '' ? offers.length : Number(data.index);
    delete data.index;
    offers[index] = { ...offers[index], ...data, active: true, sort_order: Number(data.sort_order || index) };
    localStorage.setItem('montai.offers', JSON.stringify(offers));
    closeModal(form.closest('.modal-backdrop')); renderManagers();
    showToast('Oferta salva. Atualize a loja para visualizar a faixa superior.');
  });

  document.querySelector('[data-update-guararapes]')?.addEventListener('click', () => {
    const catalog = Array.isArray(window.GUARARAPES_CATALOG) ? window.GUARARAPES_CATALOG : [];
    try {
      localStorage.setItem('montai.guararapesCatalog', JSON.stringify({
        updatedAt: new Date().toISOString(),
        version: window.GUARARAPES_CATALOG_META?.version || 'local',
        entries: catalog,
        reviewQueue: window.GUARARAPES_REVIEW_QUEUE || [],
      }));
      const reviewCount = Array.isArray(window.GUARARAPES_REVIEW_QUEUE) ? window.GUARARAPES_REVIEW_QUEUE.length : 0;
      showToast(`Catálogo oficial verificado: ${catalog.length} padrões disponíveis e ${reviewCount} nomes aguardando revisão.`);
    } catch (_error) {
      showToast('Não foi possível salvar a verificação local do catálogo.');
    }
  });

  const guararapesFile = document.querySelector('[data-guararapes-file]');
  document.querySelector('[data-import-guararapes]')?.addEventListener('click', () => guararapesFile?.click());
  guararapesFile?.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const incoming = Array.isArray(payload) ? payload : payload.entries;
      if (!Array.isArray(incoming)) throw new Error('entries');
      const valid = incoming.filter(item => item && item.id && item.name && item.image && item.sourceUrl);
      if (!valid.length) throw new Error('empty');
      const current = readLocal('montai.guararapesCatalog', { entries: [] });
      const merged = new Map([...(current.entries || []), ...valid].map(item => [item.id, item]));
      localStorage.setItem('montai.guararapesCatalog', JSON.stringify({
        updatedAt: new Date().toISOString(),
        version: payload.version || 'manual-import',
        entries: [...merged.values()],
        reviewQueue: payload.reviewQueue || [],
      }));
      showToast(`${valid.length} padrão(ões) importado(s), sem duplicar registros.`);
    } catch (_error) {
      showToast('Arquivo inválido. Use um JSON com uma lista de padrões oficiais.');
    } finally {
      event.target.value = '';
    }
  });

  document.querySelector('[data-product-form]')?.addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const products = readLocal('montai.catalog', defaultProducts);
    const imageInput = event.currentTarget.elements.image_file;
    const price = Number(data.price || 0);
    const compareAt = Number(data.compare_at_price || 0);
    const pixPercent = Math.max(0, Math.min(100, Number(data.pix_discount || 0)));
    const installments = Math.max(1, Math.min(24, Number(data.installments || 12)));
    const interest = Math.max(0, Number(data.installment_interest || 0)) / 100;
    const mdfManufacturers = String(data.mdf_manufacturers || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
    const guararapesFinishes = String(data.guararapes_finishes || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
    const money = value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const existingProduct = data.index === '' ? null : products[Number(data.index)];
    const product = { id: data.index === '' ? `local-${Date.now()}` : existingProduct?.id, sku: data.sku || '', name: data.name, category: data.category, price, old: compareAt > price ? money(compareAt) : '', discount: compareAt > price ? `-${Math.round((1 - price / compareAt) * 100)}%` : '', pix: `${money(price * (1 - pixPercent / 100))} no PIX`, pixDiscount: pixPercent / 100, installments, installmentInterest: interest, image: imageInput?.dataset.dataUrl || imageInput?.dataset.existingImage || 'https://images.unsplash.com/photo-1617104678098-de229db51175?auto=format&fit=crop&w=700&q=80', badge: existingProduct?.badge || 'Novo', description: data.description || '', mdfManufacturers, guararapesFinishes };
    if (data.index === '') products.push(product); else products[Number(data.index)] = product;
    try { localStorage.setItem('montai.catalog', JSON.stringify(products)); } catch (_error) { showToast('A foto é grande demais para esta prévia. Conecte o Storage do Supabase para salvar imagens.'); return; }
    closeModal(event.currentTarget.closest('.modal-backdrop'));
    renderProductManager();
    showToast('Produto salvo. Atualize a loja para refletir a alteração.');
  });

  renderManagers();
  renderProductManager();
  renderManufacturerManager();

  const filterInput = document.querySelector('[data-filter-input]');
  filterInput?.addEventListener('input', () => {
    const term = filterInput.value.toLowerCase().trim();
    document.querySelectorAll('[data-filter-list] tr').forEach(row => {
      row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
    });
  });

  const backendStatus = document.querySelector('[data-backend-status]');
  fetch('/api/health', { headers: { Accept: 'application/json' } })
    .then(response => response.json())
    .then(payload => {
      if (backendStatus) backendStatus.textContent = payload.backend === 'supabase-configured' ? 'API e banco conectados' : 'API online · banco aguardando configuração';
    })
    .catch(() => { if (backendStatus) backendStatus.textContent = 'API indisponível nesta prévia'; });
})();
