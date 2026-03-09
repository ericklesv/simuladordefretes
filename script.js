/* =============================================
   CONFIGURAÇÕES
   ============================================= */

const CONFIG = {
  // URL do proxy local (server.js cuida da comunicação com a API SuperFrete)
  API_URL: '/api/calcular-frete',

  // Peso por grupo de 8 miniaturas (kg)
  PESO_POR_GRUPO: 1,
  MINIATURAS_POR_GRUPO: 8,

  // Taxa por miniatura (R$)
  TAXA_POR_MINIATURA: 0.50,

  // Taxa adicional JADLOG (R$)
  TAXA_JADLOG: 5.00,

  // Transportadoras permitidas (nomes normalizados em maiúsculo)
  TRANSPORTADORAS_PERMITIDAS: ['PAC', 'SEDEX', 'JADLOG', '.PACKAGE', '.COM'],

  // Transportadoras bloqueadas
  TRANSPORTADORAS_BLOQUEADAS: ['LOGGI'],

  // Número do WhatsApp (apenas dígitos)
  WHATSAPP_NUMERO: '5581979115041'
};

/* =============================================
   ELEMENTOS DO DOM
   ============================================= */

const dom = {
  form: document.getElementById('freteForm'),
  cepInput: document.getElementById('cep'),
  qtdInput: document.getElementById('quantidade'),
  cepError: document.getElementById('cepError'),
  qtdError: document.getElementById('qtdError'),
  pesoInfo: document.getElementById('pesoInfo'),
  pesoValor: document.getElementById('pesoValor'),
  btnCalcular: document.getElementById('btnCalcular'),
  btnText: document.querySelector('.btn-text'),
  btnIconEl: document.querySelector('.btn-icon'),
  btnLoader: document.querySelector('.btn-loader'),
  resultsSection: document.getElementById('resultsSection'),
  resultsGrid: document.getElementById('resultsGrid'),
  errorSection: document.getElementById('errorSection'),
  errorMessage: document.getElementById('errorMessage'),
  btnRetry: document.getElementById('btnRetry'),
  // Seção de envio
  shippingSection: document.getElementById('shippingSection'),
  shippingForm: document.getElementById('shippingForm'),
  selectedSummary: document.getElementById('selectedSummary'),
  shipCep: document.getElementById('shipCep'),
  shipBairro: document.getElementById('shipBairro'),
  shipEndereco: document.getElementById('shipEndereco'),
  shipNumero: document.getElementById('shipNumero'),
  shipComplemento: document.getElementById('shipComplemento'),
  shipNome: document.getElementById('shipNome'),
  shipCpf: document.getElementById('shipCpf')
};

/* =============================================
   FORMATAÇÃO DO CEP
   ============================================= */

function formatarCEP(valor) {
  const numeros = valor.replace(/\D/g, '').slice(0, 8);
  if (numeros.length > 5) {
    return numeros.slice(0, 5) + '-' + numeros.slice(5);
  }
  return numeros;
}

dom.cepInput.addEventListener('input', function () {
  const posicaoCursor = this.selectionStart;
  const tamanhoAnterior = this.value.length;
  this.value = formatarCEP(this.value);
  const tamanhoDiferenca = this.value.length - tamanhoAnterior;
  this.setSelectionRange(posicaoCursor + tamanhoDiferenca, posicaoCursor + tamanhoDiferenca);
  limparErroCampo('cep');
});

/* =============================================
   CÁLCULO DE PESO
   ============================================= */

function calcularPeso(quantidade) {
  return Math.ceil(quantidade / CONFIG.MINIATURAS_POR_GRUPO) * CONFIG.PESO_POR_GRUPO;
}

dom.qtdInput.addEventListener('input', function () {
  limparErroCampo('qtd');
  const qtd = parseInt(this.value, 10);
  if (qtd > 0) {
    const peso = calcularPeso(qtd);
    dom.pesoValor.textContent = peso + ' kg';
    dom.pesoInfo.style.display = 'flex';
  } else {
    dom.pesoInfo.style.display = 'none';
  }
});

/* =============================================
   VALIDAÇÃO
   ============================================= */

function validarCEP(cep) {
  const numeros = cep.replace(/\D/g, '');
  return numeros.length === 8;
}

function limparErroCampo(campo) {
  if (campo === 'cep') {
    dom.cepError.textContent = '';
    dom.cepInput.classList.remove('input-error-state');
  } else {
    dom.qtdError.textContent = '';
    dom.qtdInput.classList.remove('input-error-state');
  }
}

function mostrarErroCampo(campo, mensagem) {
  if (campo === 'cep') {
    dom.cepError.textContent = mensagem;
    dom.cepInput.classList.add('input-error-state');
  } else {
    dom.qtdError.textContent = mensagem;
    dom.qtdInput.classList.add('input-error-state');
  }
}

function validarFormulario() {
  let valido = true;
  const cep = dom.cepInput.value;
  const qtd = parseInt(dom.qtdInput.value, 10);

  if (!cep || !validarCEP(cep)) {
    mostrarErroCampo('cep', 'Informe um CEP válido com 8 dígitos.');
    valido = false;
  }

  if (!qtd || qtd < 1) {
    mostrarErroCampo('qtd', 'Informe pelo menos 1 miniatura.');
    valido = false;
  } else if (qtd > 200) {
    mostrarErroCampo('qtd', 'Máximo de 200 miniaturas por simulação.');
    valido = false;
  }

  return valido;
}

/* =============================================
   ESTADOS DA INTERFACE
   ============================================= */

function setLoading(loading) {
  dom.btnCalcular.disabled = loading;
  dom.btnText.style.display = loading ? 'none' : 'inline';
  dom.btnIconEl.style.display = loading ? 'none' : 'inline';
  dom.btnLoader.style.display = loading ? 'flex' : 'none';
}

function esconderResultados() {
  dom.resultsSection.style.display = 'none';
  dom.errorSection.style.display = 'none';
  dom.shippingSection.style.display = 'none';
  state.selectedOption = null;
}

function mostrarErro(mensagem) {
  dom.resultsSection.style.display = 'none';
  dom.errorMessage.textContent = mensagem;
  dom.errorSection.style.display = 'block';
  dom.errorSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* =============================================
   ÍCONES DAS TRANSPORTADORAS
   ============================================= */

function getCarrierClass(nome) {
  const upper = nome.toUpperCase();
  if (upper.includes('JADLOG') || upper.includes('.PACKAGE') || upper.includes('.COM')) return 'jadlog';
  if (upper.includes('SEDEX')) return 'sedex';
  if (upper.includes('PAC')) return 'pac';
  return 'pac';
}

function getCarrierLogo(nome) {
  const upper = nome.toUpperCase();
  if (upper.includes('JADLOG') || upper.includes('.PACKAGE') || upper.includes('.COM')) {
    return 'https://logospng.org/download/jadlog/logo-jadlog-icon-1024.png';
  }
  return 'https://e3ba6e8732e83984.cdn.gocache.net/uploads/image/file/404912/regular_correios-logo-2.png';
}

function getCarrierNotice(nome) {
  const upper = nome.toUpperCase();
  if (upper.includes('JADLOG') || upper.includes('.PACKAGE') || upper.includes('.COM')) {
    return 'Envios via Jadlog são realizados às quintas-feiras. Peça com antecedência';
  }
  return 'Prazo para envio: Em 2 dias úteis';
}

function getCarrierDisplayName(nome) {
  const upper = nome.toUpperCase();
  if (upper.includes('JADLOG') || upper.includes('.PACKAGE') || upper.includes('.COM')) return 'JADLOG';
  if (upper.includes('SEDEX')) return 'SEDEX';
  if (upper.includes('PAC')) return 'PAC';
  return nome;
}

/* =============================================
   CONSULTA À API
   ============================================= */

async function consultarFrete(cepDestino, peso) {
  const cepLimpo = cepDestino.replace(/\D/g, '');

  const body = {
    cep_destino: cepLimpo,
    peso: peso
  };

  const response = await fetch(CONFIG.API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || 'Erro ao calcular o frete (código ' + response.status + ').'
    );
  }

  const data = await response.json();
  return data;
}

/* =============================================
   PROCESSAMENTO DOS RESULTADOS
   ============================================= */

function isTransportadoraPermitida(nome) {
  const upper = (nome || '').toUpperCase();

  // Bloquear transportadoras da lista negra
  for (const bloqueada of CONFIG.TRANSPORTADORAS_BLOQUEADAS) {
    if (upper.includes(bloqueada)) return false;
  }

  // Permitir apenas transportadoras da lista permitida
  for (const permitida of CONFIG.TRANSPORTADORAS_PERMITIDAS) {
    if (upper.includes(permitida)) return true;
  }

  return false;
}

function isJadlog(nome) {
  const upper = (nome || '').toUpperCase();
  return upper.includes('JADLOG') || upper.includes('.PACKAGE') || upper.includes('.COM');
}

function processarResultados(dados, quantidade) {
  const taxaMiniaturas = quantidade * CONFIG.TAXA_POR_MINIATURA;
  const resultados = [];

  // A API pode retornar um array diretamente ou dentro de uma propriedade
  const lista = Array.isArray(dados) ? dados : (dados.dispatchers || dados.services || dados.data || []);

  for (const item of lista) {
    // Extrair informações — adaptar conforme estrutura real da API
    const nome = item.name || item.company?.name || item.service || '';
    const preco = parseFloat(item.price || item.custom_price || item.value || 0);
    const prazo = parseInt(item.delivery_time || item.deadline || item.days || item.delivery_range?.max || 0, 10);

    if (!isTransportadoraPermitida(nome)) continue;
    if (preco <= 0) continue;

    let valorFinal = preco + taxaMiniaturas;

    // Taxa adicional para JADLOG
    if (isJadlog(nome)) {
      valorFinal += CONFIG.TAXA_JADLOG;
    }

    resultados.push({
      nome: getCarrierDisplayName(nome),
      nomeOriginal: nome,
      valor: valorFinal,
      prazo: prazo
    });
  }

  // Ordenar por valor (menor primeiro)
  resultados.sort((a, b) => a.valor - b.valor);

  return resultados;
}

/* =============================================
   RENDERIZAÇÃO DOS RESULTADOS
   ============================================= */

function formatarMoeda(valor) {
  return 'R$ ' + valor.toFixed(2).replace('.', ',');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderizarResultados(resultados) {
  dom.resultsGrid.innerHTML = '';

  for (let i = 0; i < resultados.length; i++) {
    const item = resultados[i];
    const card = document.createElement('div');
    card.className = 'result-card';
    card.setAttribute('data-index', i);

    const classeCor = getCarrierClass(item.nomeOriginal);
    const logoUrl = getCarrierLogo(item.nomeOriginal);
    const notice = getCarrierNotice(item.nomeOriginal);

    card.innerHTML =
      '<div class="carrier-icon ' + classeCor + '"><img src="' + logoUrl + '" alt="' + escapeHtml(item.nome) + '" class="carrier-logo-img"></div>' +
      '<div class="carrier-info">' +
        '<div class="carrier-name">' + escapeHtml(item.nome) + '</div>' +
        '<div class="carrier-prazo">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<circle cx="12" cy="12" r="10"/>' +
            '<polyline points="12 6 12 12 16 14"/>' +
          '</svg>' +
          'Entrega em até <strong>' + item.prazo + ' dias úteis</strong>' +
        '</div>' +
        '<div class="carrier-notice">' + escapeHtml(notice) + '</div>' +
      '</div>' +
      '<div class="carrier-price">' +
        '<div class="price-label">Valor do frete</div>' +
        '<div class="price-value">' + formatarMoeda(item.valor) + '</div>' +
      '</div>' +
      '<div class="card-bottom">' +
        '<span style="font-size:0.8rem;color:var(--gray-400)">Clique para selecionar</span>' +
        '<button type="button" class="btn-escolher" data-index="' + i + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' +
          'Escolher esta opção' +
        '</button>' +
      '</div>';

    dom.resultsGrid.appendChild(card);
  }

  // Evento de seleção nos cards
  dom.resultsGrid.addEventListener('click', function (e) {
    const btn = e.target.closest('.btn-escolher') || e.target.closest('.result-card');
    if (!btn) return;
    const card = e.target.closest('.result-card');
    if (!card) return;
    const index = parseInt(card.getAttribute('data-index'), 10);
    selecionarOpcao(index, resultados);
  });

  dom.resultsSection.style.display = 'block';
  dom.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* =============================================
   SELEÇÃO DE OPÇÃO DE FRETE
   ============================================= */

// Estado global da seleção
const state = {
  selectedOption: null,
  resultados: [],
  cep: '',
  quantidade: 0
};

function selecionarOpcao(index, resultados) {
  state.selectedOption = resultados[index];
  state.resultados = resultados;

  // Destacar card selecionado
  const cards = dom.resultsGrid.querySelectorAll('.result-card');
  cards.forEach(function (card, i) {
    const btn = card.querySelector('.btn-escolher');
    if (i === index) {
      card.classList.add('selected');
      btn.classList.add('chosen');
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' +
        'Selecionado';
    } else {
      card.classList.remove('selected');
      btn.classList.remove('chosen');
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' +
        'Escolher esta opção';
    }
  });

  // Mostrar resumo e formulário de envio
  mostrarFormularioEnvio(state.selectedOption);
}

function mostrarFormularioEnvio(opcao) {
  const logoUrl = getCarrierLogo(opcao.nomeOriginal);

  dom.selectedSummary.innerHTML =
    '<div class="summary-icon"><img src="' + logoUrl + '" alt="' + escapeHtml(opcao.nome) + '" class="carrier-logo-img"></div>' +
    '<div class="summary-details">' +
      '<div class="summary-name">' + escapeHtml(opcao.nome) + '</div>' +
      '<div class="summary-meta">Entrega em até ' + opcao.prazo + ' dias úteis</div>' +
    '</div>' +
    '<div class="summary-price">' + formatarMoeda(opcao.valor) + '</div>';

  // Preencher CEP de envio com o CEP da simulação
  dom.shipCep.value = state.cep;

  dom.shippingSection.style.display = 'block';
  dom.shippingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* =============================================
   FORMATAÇÃO CPF
   ============================================= */

function formatarCPF(valor) {
  const numeros = valor.replace(/\D/g, '').slice(0, 11);
  if (numeros.length > 9) {
    return numeros.slice(0, 3) + '.' + numeros.slice(3, 6) + '.' + numeros.slice(6, 9) + '-' + numeros.slice(9);
  }
  if (numeros.length > 6) {
    return numeros.slice(0, 3) + '.' + numeros.slice(3, 6) + '.' + numeros.slice(6);
  }
  if (numeros.length > 3) {
    return numeros.slice(0, 3) + '.' + numeros.slice(3);
  }
  return numeros;
}

function validarCPF(cpf) {
  const numeros = cpf.replace(/\D/g, '');
  if (numeros.length !== 11) return false;

  // Rejeitar sequências iguais
  if (/^(\d)\1{10}$/.test(numeros)) return false;

  // Validar dígitos verificadores
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(numeros[i], 10) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(numeros[9], 10)) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(numeros[i], 10) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(numeros[10], 10)) return false;

  return true;
}

// Listeners de formatação para campos do formulário de envio
dom.shipCep.addEventListener('input', function () {
  this.value = formatarCEP(this.value);
  limparErroEnvio('shipCep');
});

dom.shipCpf.addEventListener('input', function () {
  const pos = this.selectionStart;
  const lenAntes = this.value.length;
  this.value = formatarCPF(this.value);
  const diff = this.value.length - lenAntes;
  this.setSelectionRange(pos + diff, pos + diff);
  limparErroEnvio('shipCpf');
});

// Limpar erros ao digitar
['shipBairro', 'shipEndereco', 'shipNumero', 'shipNome'].forEach(function (id) {
  document.getElementById(id).addEventListener('input', function () {
    limparErroEnvio(id);
  });
});

function limparErroEnvio(id) {
  var el = document.getElementById(id + 'Error');
  if (el) el.textContent = '';
  document.getElementById(id).classList.remove('input-error-state');
}

function mostrarErroEnvio(id, msg) {
  var el = document.getElementById(id + 'Error');
  if (el) el.textContent = msg;
  document.getElementById(id).classList.add('input-error-state');
}

/* =============================================
   VALIDAÇÃO DO FORMULÁRIO DE ENVIO
   ============================================= */

function validarFormularioEnvio() {
  let valido = true;

  var cep = dom.shipCep.value;
  if (!cep || !validarCEP(cep)) {
    mostrarErroEnvio('shipCep', 'Informe um CEP válido.');
    valido = false;
  }

  if (!dom.shipBairro.value.trim()) {
    mostrarErroEnvio('shipBairro', 'Informe o bairro.');
    valido = false;
  }

  if (!dom.shipEndereco.value.trim()) {
    mostrarErroEnvio('shipEndereco', 'Informe o endereço.');
    valido = false;
  }

  if (!dom.shipNumero.value.trim()) {
    mostrarErroEnvio('shipNumero', 'Informe o número.');
    valido = false;
  }

  if (!dom.shipNome.value.trim()) {
    mostrarErroEnvio('shipNome', 'Informe o nome do destinatário.');
    valido = false;
  }

  var cpf = dom.shipCpf.value;
  if (!cpf || !validarCPF(cpf)) {
    mostrarErroEnvio('shipCpf', 'Informe um CPF válido.');
    valido = false;
  }

  return valido;
}

/* =============================================
   WHATSAPP — MENSAGEM COMPLETA
   ============================================= */

function gerarMensagemWhatsApp() {
  var opcao = state.selectedOption;
  var complemento = dom.shipComplemento.value.trim();

  var msg = 'Olá! Tudo bem?\n\n';
  msg += 'Quero enviar minha garagem de miniaturas.\n\n';
  msg += '📦 Quantidade: ' + state.quantidade + ' miniaturas\n\n';
  msg += '🚚 Método de envio escolhido:\n';
  msg += opcao.nome + '\n\n';
  msg += '💰 Valor da simulação:\n';
  msg += formatarMoeda(opcao.valor) + '\n\n';
  msg += '⏱ Prazo estimado:\n';
  msg += opcao.prazo + ' dias úteis\n\n';
  msg += '📍 Endereço de entrega:\n\n';
  msg += 'CEP: ' + dom.shipCep.value + '\n';
  msg += 'Bairro: ' + dom.shipBairro.value.trim() + '\n';
  msg += 'Endereço: ' + dom.shipEndereco.value.trim() + '\n';
  msg += 'Número: ' + dom.shipNumero.value.trim() + '\n';
  msg += 'Complemento: ' + (complemento || '—') + '\n\n';
  msg += '👤 Destinatário:\n';
  msg += 'Nome: ' + dom.shipNome.value.trim() + '\n';
  msg += 'CPF: ' + dom.shipCpf.value + '\n\n';
  msg += 'Pode confirmar o envio para mim?';

  return msg;
}

function enviarWhatsApp() {
  var mensagem = gerarMensagemWhatsApp();
  var url = 'https://wa.me/' + CONFIG.WHATSAPP_NUMERO + '?text=' + encodeURIComponent(mensagem);
  window.open(url, '_blank', 'noopener,noreferrer');
}

/* =============================================
   EVENTO — FORMULÁRIO DE ENVIO
   ============================================= */

dom.shippingForm.addEventListener('submit', function (e) {
  e.preventDefault();

  if (!state.selectedOption) return;
  if (!validarFormularioEnvio()) return;

  enviarWhatsApp();
});

/* =============================================
   EVENTO PRINCIPAL — CALCULAR FRETE
   ============================================= */

dom.form.addEventListener('submit', async function (e) {
  e.preventDefault();

  // Limpar estados anteriores
  esconderResultados();

  // Validar formulário
  if (!validarFormulario()) return;

  const cep = dom.cepInput.value;
  const quantidade = parseInt(dom.qtdInput.value, 10);
  const peso = calcularPeso(quantidade);

  // Ativar loading
  setLoading(true);

  try {
    // Consultar API
    const dados = await consultarFrete(cep, peso);

    // Processar resultados
    const resultados = processarResultados(dados, quantidade);

    if (resultados.length === 0) {
      mostrarErro('Nenhuma opção de frete disponível para o CEP informado. Verifique o CEP e tente novamente.');
      return;
    }

    // Renderizar resultados
    renderizarResultados(resultados);

    // Salvar estado para uso posterior
    state.cep = cep;
    state.quantidade = quantidade;
    state.resultados = resultados;

  } catch (erro) {
    console.error('Erro ao calcular frete:', erro);
    mostrarErro(
      erro.message || 'Não foi possível calcular o frete. Verifique sua conexão e tente novamente.'
    );
  } finally {
    setLoading(false);
  }
});

/* =============================================
   BOTÃO TENTAR NOVAMENTE
   ============================================= */

dom.btnRetry.addEventListener('click', function () {
  esconderResultados();
  dom.cepInput.focus();
});

/* =============================================
   INICIALIZAÇÃO
   ============================================= */

dom.cepInput.focus();
