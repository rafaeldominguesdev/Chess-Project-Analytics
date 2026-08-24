# ♟️ ChessCap

Analisador de partidas de xadrez feito para estudar minhas próprias partidas —
e, principalmente, pra praticar programação no processo. Sou estudante, gosto
muito de xadrez, e esse projeto é onde eu junto as duas coisas: cada
funcionalidade nova aqui é também uma desculpa pra aprender algo novo (React,
TypeScript, Web Workers, WebAssembly, manipulação de SVG, etc.). Roda 100% no
navegador, sem backend — o motor de xadrez (Stockfish) analisa localmente via
WebAssembly, direto na sua máquina.

## Por que existe

Eu jogo xadrez e, depois de cada partida, sempre quis entender *onde* errei —
não só "perdi", mas em qual lance exatamente a vantagem virou desvantagem, e o
que era melhor jogar ali. Ferramentas assim existem (chess.com, lichess), mas
construir a minha própria virou uma forma de estudar duas coisas ao mesmo
tempo: xadrez de verdade, e como um app React de tamanho médio é organizado
por dentro (hooks, componentes, estado, um motor de xadrez rodando num Web
Worker). É um projeto de portfólio, mas antes disso é uma ferramenta que eu
mesmo uso.

## Funcionalidades

- **Buscar Jogador** — painel com perfil e ratings de qualquer usuário do
  chess.com ou do Lichess, via API pública, com as partidas recentes prontas
  pra analisar.
- **Analisar** — importa uma partida (do chess.com/Lichess ou colando um PGN)
  e navega lance a lance, com avaliação em tempo real do Stockfish, barra de
  avaliação, classificação de cada lance (Brilhante, Excelente, Livro, Melhor,
  Ótimo, Bom, Imprecisão, Erro, Chance Perdida, Capivarada), gráfico de
  avaliação da partida inteira, comparação de precisão entre os dois
  jogadores, identificação da abertura (banco ECO) e comentários estilo
  "coach" pra cada lance.
- **Tabuleiro** — tabuleiro de análise livre: posição inicial, joga dos dois
  lados sem precisar importar nada, com avaliação do Stockfish ao vivo,
  classificação de cada lance jogado, até 3 setas de sugestão do motor
  (força indicada por espessura/opacidade) e setas manuais (segura o botão
  direito do mouse e arrasta pra anotar o tabuleiro).
- **Treino** — puzzles táticos reais (banco do Lichess, licença CC0, ~3700
  puzzles cobrindo rating 600–3199, de Iniciante a Mestre), com dica de "qual
  peça mover" ou "mostrar o lance inteiro" quando travar.
- **Configurações** — tema de tabuleiro, conjunto de peças, tema de
  interface, velocidade de animação e sons, tudo personalizável.

## Estrutura do projeto

```
chesslens/
├── public/
│   └── stockfish/        # engine Stockfish (WASM) servido como asset estático
├── scripts/
│   └── setup-stockfish.mjs  # copia o motor completo pro lugar certo após npm install
└── src/
    ├── components/
    │   ├── Home/          # tela inicial (busca de jogador)
    │   ├── PlayerSearch/   # busca + cartões de jogador (chess.com e Lichess)
    │   ├── Board/          # tabuleiro (react-chessboard customizado), barra de
    │   │                   # avaliação, setas, marcadores de qualidade de lance
    │   ├── Review/         # painel de revisão de partida (ficha, coach, ícones)
    │   ├── Analysis/       # tabuleiro de análise livre, gráfico de avaliação,
    │   │                   # lista de lances, comparação entre jogadores
    │   ├── Training/       # treino de táticas (puzzles)
    │   ├── Theater/        # cartões de jogador durante a revisão
    │   ├── Layout/         # sidebar de navegação
    │   └── Settings/       # painel de configurações
    ├── hooks/              # useStockfish, useChessGame, useAnalysisBoard,
    │                       # usePuzzleTrainer, integrações com chess.com/Lichess, etc.
    ├── contexts/           # ThemeContext (tema de tabuleiro/interface)
    ├── utils/              # classificação de lances, banco de aberturas ECO,
    │                       # banco de puzzles, sons, temas de tabuleiro
    ├── types/              # tipos compartilhados
    └── data/               # dados estáticos (aberturas ECO, puzzles)
```

A ideia por trás dessa organização: cada pasta em `components/` corresponde a
uma tela ou bloco visual bem delimitado, `hooks/` concentra a lógica com
estado (a parte que "pensa"), e `utils/` fica só com funções puras — o
motor de xadrez e o parser de PGN não sabem nada sobre React, por exemplo.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS · [chess.js](https://github.com/jhlywa/chess.js) ·
[react-chessboard](https://github.com/Clariity/react-chessboard) · Stockfish 18 (WASM, rodando num Web Worker)

## Rodando localmente

```bash
npm install
npm run dev
```

O `npm install` já copia sozinho o motor Stockfish completo (~108MB) de
`node_modules/stockfish/` pra `public/stockfish/` — esse arquivo não fica
versionado no git (passa do limite de tamanho do GitHub), por isso esse passo
existe (ver `scripts/setup-stockfish.mjs`).

Outros comandos:

```bash
npm run build    # build de produção (tsc + vite build)
npm run lint     # oxlint
npm run preview  # serve o build de produção localmente
```

## Status

🚧 Em desenvolvimento — projeto pessoal, evoluindo aos poucos conforme eu vou
aprendendo/precisando de coisas novas. Esse README é atualizado junto com as
mudanças relevantes no projeto.
