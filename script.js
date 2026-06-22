"use strict";

/* ===================================================================
   Funções utilitárias de conversão IPv4
   =================================================================== */

// Converte um número de 32 bits para string "a.b.c.d"
function intParaIp(n) {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

// Converte "a.b.c.d" para número de 32 bits (ou null se inválido)
function ipParaInt(ip) {
  const p = ip.trim().split('.');
  if (p.length !== 4) return null;
  let n = 0;
  for (const o of p) {
    if (!/^\d+$/.test(o)) return null;
    const v = parseInt(o, 10);
    if (v < 0 || v > 255) return null;
    n = (n << 8) | v;
  }
  return n >>> 0;
}

// Gera a máscara (32 bits) a partir do prefixo CIDR
function cidrParaMascaraInt(cidr) {
  return cidr === 0 ? 0 : (0xFFFFFFFF << (32 - cidr)) >>> 0;
}

// Gera a máscara decimal a partir do prefixo CIDR
function cidrParaMascara(cidr) {
  return intParaIp(cidrParaMascaraInt(cidr));
}

// Converte uma máscara decimal válida para CIDR (ou null se não for contígua)
function mascaraParaCidr(mask) {
  const n = ipParaInt(mask);
  if (n === null) return null;
  const inv = (~n) >>> 0;            // bits de host
  if (((inv + 1) & inv) !== 0) return null; // os 0s precisam ser contíguos
  let cidr = 0, x = n;
  while (x & 0x80000000) { cidr++; x = (x << 1) >>> 0; }
  return cidr;
}

/* ===================================================================
   Classe, tipo e faixas reservadas
   =================================================================== */

function classeDoIp(primeiroOcteto) {
  if (primeiroOcteto < 128) return 'A';
  if (primeiroOcteto < 192) return 'B';
  if (primeiroOcteto < 224) return 'C';
  if (primeiroOcteto < 240) return 'D (Multicast)';
  return 'E (Experimental)';
}

// Verifica se "ipInt" pertence à faixa rede/cidr
function dentroDaFaixa(ipInt, redeStr, cidr) {
  const rede = ipParaInt(redeStr);
  const mask = cidrParaMascaraInt(cidr);
  return (ipInt & mask) >>> 0 === (rede & mask) >>> 0;
}

// Identifica o tipo do IP, incluindo faixas reservadas avançadas (RFCs)
function tipoDoIp(ipInt) {
  const faixas = [
    ['0.0.0.0',         8,  'Este host / rede atual (RFC 1122)'],
    ['10.0.0.0',        8,  'Privado (RFC 1918)'],
    ['100.64.0.0',     10,  'CGNAT — NAT de operadora (RFC 6598)'],
    ['127.0.0.0',       8,  'Loopback (RFC 1122)'],
    ['169.254.0.0',    16,  'Link-local / APIPA (RFC 3927)'],
    ['172.16.0.0',     12,  'Privado (RFC 1918)'],
    ['192.0.0.0',      24,  'IETF — uso de protocolo (RFC 6890)'],
    ['192.0.2.0',      24,  'Documentação TEST-NET-1 (RFC 5737)'],
    ['192.88.99.0',    24,  'Anycast 6to4 (RFC 3068)'],
    ['192.168.0.0',    16,  'Privado (RFC 1918)'],
    ['198.18.0.0',     15,  'Benchmarking de rede (RFC 2544)'],
    ['198.51.100.0',   24,  'Documentação TEST-NET-2 (RFC 5737)'],
    ['203.0.113.0',    24,  'Documentação TEST-NET-3 (RFC 5737)'],
    ['224.0.0.0',       4,  'Multicast (RFC 5771)'],
    ['240.0.0.0',       4,  'Reservado — Classe E (RFC 1112)'],
    ['255.255.255.255',32, 'Broadcast limitado'],
  ];
  for (const [rede, cidr, desc] of faixas) {
    if (dentroDaFaixa(ipInt, rede, cidr)) return desc;
  }
  return 'Público';
}

/* ===================================================================
   Binário com destaque rede/host
   =================================================================== */

// Monta HTML do binário de 32 bits: primeiros "cidr" bits = rede, resto = host
function binarioHtml(n, cidr) {
  const bits = (n >>> 0).toString(2).padStart(32, '0');
  let html = '';
  for (let i = 0; i < 32; i++) {
    const classe = i < cidr ? 'bit-net' : 'bit-host';
    html += '<span class="' + classe + '">' + bits[i] + '</span>';
    if (i % 8 === 7 && i !== 31) html += '<span class="sep"> . </span>';
  }
  return html;
}

/* ===================================================================
   IPv6: representação do IPv4 mapeado (::ffff:a.b.c.d)
   =================================================================== */

function ipv4MapeadoEmIpv6(ipInt) {
  const hi = ((ipInt >>> 16) & 0xFFFF).toString(16);
  const lo = (ipInt & 0xFFFF).toString(16);
  return '::ffff:' + hi + ':' + lo + '  (::ffff:' + intParaIp(ipInt) + ')';
}

/* ===================================================================
   Cálculo de faixa de hosts
   =================================================================== */

function faixaDeHosts(redeInt, broadcastInt, cidr) {
  if (cidr >= 31) {
    // /31 (ponto-a-ponto, RFC 3021) e /32 (host único) são casos especiais
    return {
      primeiro: intParaIp(redeInt),
      ultimo: intParaIp(broadcastInt),
      hosts: cidr === 32 ? 1 : 2
    };
  }
  return {
    primeiro: intParaIp(redeInt + 1),
    ultimo: intParaIp(broadcastInt - 1),
    hosts: Math.pow(2, 32 - cidr) - 2
  };
}

// Menor número de bits de host para comportar "qtdHosts" dispositivos
function bitsParaHosts(qtdHosts) {
  let bits = 1;
  while (Math.pow(2, bits) - 2 < qtdHosts) bits++;
  return bits;
}

/* ===================================================================
   Referências e preenchimento dos seletores
   =================================================================== */

const $ = (id) => document.getElementById(id);

// Preenche um <select> de CIDR (/0 a /32)
function preencherCidr(selectEl, selecionado) {
  for (let i = 0; i <= 32; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = '/' + i + '  (' + cidrParaMascara(i) + ')';
    if (i === selecionado) opt.selected = true;
    selectEl.appendChild(opt);
  }
}
preencherCidr($('cidr'), 24);
preencherCidr($('vlsmCidr'), 24);

// Sincroniza máscara decimal digitada -> seletor CIDR
$('maskInput').addEventListener('input', (e) => {
  const c = mascaraParaCidr(e.target.value);
  if (c !== null) $('cidr').value = c;
});

/* ===================================================================
   Cálculo principal da sub-rede
   =================================================================== */

function calcular() {
  const erro = $('erro');
  const res = $('resultado');
  const tab = $('tabelaSub');
  erro.textContent = '';

  const ipInt = ipParaInt($('ip').value);
  if (ipInt === null) {
    erro.textContent = '❌ Endereço IP inválido. Use o formato a.b.c.d (0–255).';
    res.classList.add('hide');
    tab.classList.add('hide');
    return;
  }

  // Máscara decimal digitada tem prioridade, se válida
  let cidr = parseInt($('cidr').value, 10);
  const maskTexto = $('maskInput').value.trim();
  if (maskTexto !== '') {
    const c = mascaraParaCidr(maskTexto);
    if (c === null) {
      erro.textContent = '❌ Máscara decimal inválida (ex: 255.255.255.0).';
      res.classList.add('hide');
      tab.classList.add('hide');
      return;
    }
    cidr = c;
  }

  const mascaraInt = cidrParaMascaraInt(cidr);
  const redeInt = (ipInt & mascaraInt) >>> 0;
  const wildcardInt = (~mascaraInt) >>> 0;
  const broadcastInt = (redeInt | wildcardInt) >>> 0;
  const faixa = faixaDeHosts(redeInt, broadcastInt, cidr);

  const set = (id, txt) => $(id).textContent = txt;
  set('rede', intParaIp(redeInt) + ' /' + cidr);
  set('broadcast', intParaIp(broadcastInt));
  set('mascara', intParaIp(mascaraInt));
  set('wildcard', intParaIp(wildcardInt));
  set('primeiro', faixa.primeiro);
  set('ultimo', faixa.ultimo);
  set('hosts', faixa.hosts.toLocaleString('pt-BR'));
  set('total', Math.pow(2, 32 - cidr).toLocaleString('pt-BR'));
  set('classe', classeDoIp((ipInt >>> 24) & 255));
  set('tipo', tipoDoIp(ipInt));
  set('ipv6map', ipv4MapeadoEmIpv6(ipInt));

  $('ipbin').innerHTML = binarioHtml(ipInt, cidr);
  $('maskbin').innerHTML = binarioHtml(mascaraInt, cidr);

  res.classList.remove('hide');
  gerarSubRedes(redeInt, cidr);
}

/* ===================================================================
   Divisão em sub-redes de tamanho igual
   =================================================================== */

function gerarSubRedes(redeBaseInt, cidrBase) {
  const tab = $('tabelaSub');
  const bitsExtra = parseInt($('divisao').value, 10);

  if (bitsExtra === 0 || cidrBase + bitsExtra > 32) {
    tab.classList.add('hide');
    if (bitsExtra > 0 && cidrBase + bitsExtra > 32) {
      $('erro').textContent = '⚠️ Não há bits suficientes para essa divisão nesse CIDR.';
    }
    return;
  }

  const novoCidr = cidrBase + bitsExtra;
  const quantidade = Math.pow(2, bitsExtra);
  const tamanho = Math.pow(2, 32 - novoCidr);
  const tbody = $('subTable').querySelector('tbody');
  tbody.innerHTML = '';

  for (let i = 0; i < quantidade; i++) {
    const redeInt = (redeBaseInt + i * tamanho) >>> 0;
    const broadcastInt = (redeInt + tamanho - 1) >>> 0;
    const faixa = faixaDeHosts(redeInt, broadcastInt, novoCidr);
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + (i + 1) + '</td>' +
      '<td>' + intParaIp(redeInt) + '/' + novoCidr + '</td>' +
      '<td>' + faixa.primeiro + '</td>' +
      '<td>' + faixa.ultimo + '</td>' +
      '<td>' + intParaIp(broadcastInt) + '</td>';
    tbody.appendChild(tr);
  }
  tab.classList.remove('hide');
}

/* ===================================================================
   VLSM — sub-redes de tamanhos diferentes
   =================================================================== */

function calcularVlsm() {
  const erro = $('vlsmErro');
  const box = $('vlsmResultado');
  erro.textContent = '';

  const redeInt = ipParaInt($('vlsmRede').value);
  if (redeInt === null) {
    erro.textContent = '❌ Rede base inválida.';
    box.classList.add('hide');
    return;
  }
  const cidrBase = parseInt($('vlsmCidr').value, 10);
  const maskBase = cidrParaMascaraInt(cidrBase);
  const redeAlinhada = (redeInt & maskBase) >>> 0;
  const fimExclusivo = redeAlinhada + Math.pow(2, 32 - cidrBase); // 1º endereço após a rede base

  // Lê as necessidades (uma por linha): "Nome = 50" ou só "50"
  const linhas = $('vlsmReqs').value.split('\n').map(l => l.trim()).filter(Boolean);
  if (linhas.length === 0) {
    erro.textContent = '❌ Informe pelo menos uma necessidade de hosts.';
    box.classList.add('hide');
    return;
  }

  const reqs = [];
  for (let i = 0; i < linhas.length; i++) {
    const m = linhas[i].match(/(\d+)\s*$/);
    if (!m) { erro.textContent = '❌ Linha sem número: "' + linhas[i] + '"'; box.classList.add('hide'); return; }
    const qtd = parseInt(m[1], 10);
    if (qtd < 1) { erro.textContent = '❌ Quantidade inválida em "' + linhas[i] + '"'; box.classList.add('hide'); return; }
    let nome = linhas[i].replace(/[=:\-]?\s*\d+\s*$/, '').trim();
    if (!nome) nome = 'Sub-rede ' + (i + 1);
    reqs.push({ nome, qtd });
  }

  // Aloca da maior para a menor (regra do VLSM)
  reqs.sort((a, b) => b.qtd - a.qtd);

  const tbody = $('vlsmTable').querySelector('tbody');
  tbody.innerHTML = '';
  let ponteiro = redeAlinhada;
  let usados = 0;

  for (const r of reqs) {
    const bits = bitsParaHosts(r.qtd);
    const subCidr = 32 - bits;
    const tamanho = Math.pow(2, bits);
    // Alinha o ponteiro ao tamanho do bloco
    const inicio = Math.ceil(ponteiro / tamanho) * tamanho;

    if (inicio + tamanho > fimExclusivo) {
      erro.textContent = '❌ A rede base ' + intParaIp(redeAlinhada) + '/' + cidrBase +
        ' não comporta a sub-rede "' + r.nome + '" (' + r.qtd + ' hosts). Use um CIDR base menor.';
      box.classList.add('hide');
      return;
    }

    const broadcastInt = inicio + tamanho - 1;
    const faixa = faixaDeHosts(inicio, broadcastInt, subCidr);
    const capacidade = subCidr >= 31 ? (subCidr === 32 ? 1 : 2) : (tamanho - 2);

    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + r.nome + '</td>' +
      '<td>' + r.qtd + '</td>' +
      '<td>' + intParaIp(inicio) + '/' + subCidr + '</td>' +
      '<td>' + faixa.primeiro + ' – ' + faixa.ultimo + '</td>' +
      '<td>' + intParaIp(broadcastInt) + '</td>' +
      '<td>' + capacidade + ' hosts</td>';
    tbody.appendChild(tr);

    ponteiro = inicio + tamanho;
    usados += tamanho;
  }

  const totalBase = Math.pow(2, 32 - cidrBase);
  $('vlsmResumo').textContent =
    'Rede base: ' + intParaIp(redeAlinhada) + '/' + cidrBase +
    ' · Endereços usados: ' + usados.toLocaleString('pt-BR') +
    ' de ' + totalBase.toLocaleString('pt-BR') +
    ' (' + (totalBase - usados).toLocaleString('pt-BR') + ' livres).';
  box.classList.remove('hide');
}

/* ===================================================================
   Calculadora reversa — Hosts -> CIDR
   =================================================================== */

function calcularReverso() {
  const erro = $('reversoErro');
  const box = $('reversoResultado');
  erro.textContent = '';

  const qtd = parseInt($('qtdHosts').value, 10);
  if (!Number.isFinite(qtd) || qtd < 1) {
    erro.textContent = '❌ Informe um número de hosts maior que zero.';
    box.classList.add('hide');
    return;
  }
  const bits = bitsParaHosts(qtd);
  if (bits > 32) {
    erro.textContent = '❌ Quantidade de hosts grande demais para IPv4.';
    box.classList.add('hide');
    return;
  }
  const cidr = 32 - bits;
  $('rCidr').textContent = '/' + cidr;
  $('rMascara').textContent = cidrParaMascara(cidr);
  $('rHosts').textContent = (Math.pow(2, bits) - 2).toLocaleString('pt-BR') + ' utilizáveis';
  $('rTotal').textContent = Math.pow(2, bits).toLocaleString('pt-BR');
  box.classList.remove('hide');
}

/* ===================================================================
   Meu IP atual (IPv4 e IPv6) — requer internet
   =================================================================== */

async function detectarMeuIp() {
  const erro = $('meuIpErro');
  const box = $('meuIpResultado');
  erro.textContent = '';
  box.classList.remove('hide');
  $('meuIpv4').textContent = '...';
  $('meuIpv6').textContent = '...';

  // ipify: endpoint v4 força IPv4; endpoint v64 retorna IPv6 quando disponível
  async function buscar(url) {
    const r = await fetch(url);
    const j = await r.json();
    return j.ip;
  }

  try {
    const v4 = await buscar('https://api.ipify.org?format=json');
    $('meuIpv4').textContent = v4;
  } catch {
    $('meuIpv4').textContent = 'indisponível';
  }
  try {
    const v6 = await buscar('https://api64.ipify.org?format=json');
    // api64 pode devolver IPv4 se não houver IPv6 na conexão
    $('meuIpv6').textContent = v6.includes(':') ? v6 : 'sem IPv6 nesta conexão';
  } catch {
    $('meuIpv6').textContent = 'indisponível';
  }
}

/* ===================================================================
   Copiar resultado
   =================================================================== */

function copiarResultado() {
  const linhas = [];
  document.querySelectorAll('#resultado .result-item').forEach(item => {
    const k = item.querySelector('.ri-label').textContent;
    const v = item.querySelector('.ri-value').textContent;
    linhas.push(k + ': ' + v);
  });
  const btn = $('btnCopiar');
  navigator.clipboard.writeText(linhas.join('\n')).then(() => {
    btn.textContent = '✅ Copiado!';
    setTimeout(() => btn.textContent = 'Copiar', 1500);
  }).catch(() => {
    btn.textContent = '❌ Erro';
    setTimeout(() => btn.textContent = 'Copiar', 1500);
  });
}

/* ===================================================================
   Eventos
   =================================================================== */

$('btnCalcular').addEventListener('click', calcular);
$('btnCopiar').addEventListener('click', copiarResultado);
$('btnVlsm').addEventListener('click', calcularVlsm);
$('btnReverso').addEventListener('click', calcularReverso);
$('btnMeuIp').addEventListener('click', detectarMeuIp);

['ip', 'maskInput'].forEach(id => {
  $(id).addEventListener('keydown', e => { if (e.key === 'Enter') calcular(); });
});

// Calcula uma vez ao abrir, com os valores de exemplo
calcular();
