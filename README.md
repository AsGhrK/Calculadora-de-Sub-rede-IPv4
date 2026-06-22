# 🌐 Calculadora de Sub-rede IPv4

**Instituição:** IFMS — Campus Nova Andradina · Curso: TADS (Tecnologia em Análise e Desenvolvimento de Sistemas)
**Disciplina:** Redes de Computadores · **Professor:** Fábio
**Alunos:** Davi Casari, Felipe Rioske e Victor Solique

---

Trabalho da disciplina de **Redes de Computadores**. É uma calculadora que, a partir de um
endereço IP e uma máscara, calcula todas as informações de uma **sub-rede** (endereço de rede,
broadcast, faixa de hosts, etc.) e ainda permite **dividir uma rede em várias sub-redes**.

A aplicação roda **100% no navegador**, sem precisar de internet ou instalar nada.

---

## 📁 Arquivos do projeto

| Arquivo | Função |
|---------|--------|
| `index.html` | Estrutura da página (campos, tabelas e botões) |
| `style.css`  | Aparência / estilo visual |
| `script.js`  | Lógica de cálculo das sub-redes |
| `README.md`  | Este documento |

---

## ▶️ Como usar

1. Dê **dois cliques** no arquivo `index.html` (ele abre no navegador).
2. Digite o **endereço IP** (ex.: `192.168.1.10`).
3. Escolha a **máscara** de uma das duas formas:
   - pelo menu **CIDR** (ex.: `/24`); **ou**
   - digitando a **máscara decimal** (ex.: `255.255.255.0`).
4. (Opcional) Em **"Dividir em sub-redes"**, escolha em quantas partes quer dividir a rede.
5. Clique em **"Calcular sub-rede"** (ou aperte **Enter**).
6. Use o botão **"Copiar"** para copiar o resultado e colar no relatório.

---

## ⭐ Funcionalidades

- **Cálculo completo da sub-rede:** rede, broadcast, máscara, wildcard, faixa de hosts.
- **Total de endereços** e **hosts utilizáveis** (já descontando rede e broadcast).
- **Destaque de bits Rede/Host:** o IP e a máscara em binário aparecem com os bits de rede
  em **verde** e os de host em **laranja**, mostrando visualmente onde a máscara "corta".
- **Entrada flexível:** máscara por **CIDR** (`/24`) ou **decimal** (`255.255.255.0`).
- **Tipos de IP reservados:** detecta privado, loopback, APIPA, **CGNAT**, faixas de
  **documentação (TEST-NET)**, **multicast**, **Classe E**, benchmarking, etc. (com a RFC).
- **Divisão em sub-redes iguais:** gera a tabela de N sub-redes do mesmo tamanho.
- **VLSM:** aloca sub-redes de **tamanhos diferentes** conforme a necessidade de hosts de cada
  setor (da maior para a menor), aproveitando melhor os endereços.
- **Calculadora reversa (Hosts → CIDR):** informe quantos hosts precisa e descubra a máscara ideal.
- **Conversão IPv4 → IPv6:** mostra o endereço no formato IPv4 mapeado (`::ffff:a.b.c.d`).
- **Meu IP atual:** detecta seu IPv4 e IPv6 públicos (requer internet).

---

## 📖 Conceitos (a teoria por trás)

### O que é um endereço IP?
O **IP** (*Internet Protocol*) é o "endereço" que identifica um dispositivo (computador, celular,
roteador...) dentro de uma rede. No **IPv4**, ele é formado por **4 números de 0 a 255**
separados por pontos:

```
192 . 168 . 1 . 10
```

Cada um desses números é um **octeto** (8 bits), então o IP inteiro tem **32 bits**. Por dentro,
o computador enxerga tudo em **binário**:

```
192.168.1.10  =  11000000 . 10101000 . 00000001 . 00001010
```

### O que é uma máscara de sub-rede?
A **máscara** define qual parte do IP identifica a **rede** e qual parte identifica o **host**
(o dispositivo). Ela também é de 32 bits: os bits **1** marcam a parte da rede e os bits **0**
marcam a parte do host.

```
Máscara 255.255.255.0  =  11111111 . 11111111 . 11111111 . 00000000
                          └──────── rede ────────┘ └─ hosts ─┘
```

### O que é CIDR (a "/24")?
**CIDR** é só uma forma curta de escrever a máscara: o número depois da barra é a
**quantidade de bits 1** da máscara.

| CIDR | Máscara decimal | Hosts utilizáveis |
|------|-----------------|-------------------|
| /24  | 255.255.255.0   | 254               |
| /25  | 255.255.255.128 | 126               |
| /26  | 255.255.255.192 | 62                |
| /27  | 255.255.255.224 | 30                |
| /28  | 255.255.255.240 | 14                |

### O que é uma sub-rede (subnetting)?
**Sub-rede** é o ato de **dividir uma rede grande em redes menores**. Isso serve para
organizar, dar segurança e usar melhor os endereços (ex.: separar a rede do RH da rede da TI).

Para dividir, "emprestamos" bits da parte de host para a parte de rede. Cada bit emprestado
**dobra** o número de sub-redes:

- 1 bit → 2 sub-redes
- 2 bits → 4 sub-redes
- 3 bits → 8 sub-redes...

**Exemplo:** dividir `192.168.1.0/24` em **4 sub-redes** (emprestando 2 bits → vira `/26`):

| # | Rede | Primeiro Host | Último Host | Broadcast |
|---|------|---------------|-------------|-----------|
| 1 | 192.168.1.0/26   | 192.168.1.1   | 192.168.1.62  | 192.168.1.63  |
| 2 | 192.168.1.64/26  | 192.168.1.65  | 192.168.1.126 | 192.168.1.127 |
| 3 | 192.168.1.128/26 | 192.168.1.129 | 192.168.1.190 | 192.168.1.191 |
| 4 | 192.168.1.192/26 | 192.168.1.193 | 192.168.1.254 | 192.168.1.255 |

### O que é VLSM?
**VLSM** (*Variable Length Subnet Mask* — Máscara de Sub-rede de Tamanho Variável) é dividir uma
rede em sub-redes de **tamanhos diferentes**, de acordo com a necessidade real de cada setor.
Em vez de gastar uma `/26` (62 hosts) para um link que só precisa de 2 endereços, o VLSM dá a
máscara certa para cada caso — **economizando endereços**.

A regra é alocar **da maior sub-rede para a menor**. Ex.: partindo de `192.168.1.0/24`:

| Setor | Hosts | Sub-rede | Máscara |
|-------|-------|----------|---------|
| Vendas    | 50 | 192.168.1.0/26   | /26 (62 hosts) |
| TI        | 25 | 192.168.1.64/27  | /27 (30 hosts) |
| Diretoria | 10 | 192.168.1.96/28  | /28 (14 hosts) |
| Link      | 2  | 192.168.1.112/30 | /30 (2 hosts)  |

### E o IPv6?
O **IPv4** tem apenas ~4,3 bilhões de endereços (32 bits) — que já acabaram. O **IPv6** usa
**128 bits**, em **hexadecimal**, garantindo um número praticamente infinito de endereços
(ex.: `2001:0db8:85a3::8a2e:0370:7334`). Durante a transição, um endereço IPv4 pode ser
representado em IPv6 no formato **mapeado**: `::ffff:192.168.1.10`.

---

## 🔑 O que cada resultado significa

| Campo | Significado |
|-------|-------------|
| **Endereço de Rede** | Identifica a rede inteira. É o primeiro endereço (todos os bits de host em 0). |
| **Broadcast** | Endereço usado para enviar para **todos** os hosts da rede (bits de host em 1). |
| **Máscara de Sub-rede** | Define a divisão entre rede e host. |
| **Wildcard** | A máscara "invertida" (usada em ACLs de roteadores Cisco). |
| **Primeiro / Último Host** | A faixa de endereços que pode ser dada aos dispositivos. |
| **Hosts Utilizáveis** | Quantos dispositivos cabem na rede (`2^bits_de_host − 2`). |
| **Classe do IP** | Classe histórica do endereço (A, B, C, D ou E). |
| **Tipo** | Se o IP é **público**, **privado**, loopback, etc. |

> **Por que "− 2"?** Em cada rede, dois endereços são reservados: o **endereço de rede**
> (primeiro) e o **broadcast** (último). Por isso eles não podem ser usados por dispositivos.

---

## 🧮 Como a calculadora faz as contas (resumo)

Todas as operações usam **lógica binária** (bit a bit):

- **Endereço de rede** = `IP AND máscara`
- **Wildcard** = `NOT máscara`
- **Broadcast** = `rede OR wildcard`
- **Hosts utilizáveis** = `2^(32 − CIDR) − 2`

A lógica completa está comentada no arquivo `script.js`.

---

## 💻 Tecnologias usadas

- **HTML5** — estrutura
- **CSS3** — estilo (layout responsivo, funciona no celular também)
- **JavaScript** — cálculos, sem nenhuma biblioteca externa
