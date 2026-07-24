# ♟️ ChessLens

Analisador de partidas de xadrez feito para estudar minhas próprias partidas —
e para praticar programação no processo. Roda 100% no navegador, sem backend:
o motor de xadrez (Stockfish) analisa localmente via WebAssembly.

## Funcionalidades

- **Importar e revisar partidas** — cole um PGN e navegue lance a lance, com
  avaliação em tempo real do Stockfish e classificação de cada lance
  (Brilhante, Excelente, Melhor, Ótimo, Bom, Imprecisão, Erro, Chance Perdida,
  Capivarada, Livro), gráfico de avaliação e comparação de precisão entre os
  dois jogadores.
- **Modo Teatro** — revisão em tela cheia, para acompanhar a partida com mais foco.
- **Treinar** — tenta adivinhar o próximo lance de uma partida real antes de revelar.
- **Jogar** — partida contra o Stockfish (com nível de dificuldade ajustável),
  relógio de xadrez funcional e som a cada lance.
- **Buscar Jogador** — painel com perfil e ratings (bullet/blitz/rápida/diária)
  de qualquer usuário do chess.com, via API pública.
- **Editor de posição** — monta uma posição customizada e manda pra análise ou pra jogar.
- Temas de tabuleiro, conjuntos de peças e tema de interface personalizáveis.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS · [chess.js](https://github.com/jhlywa/chess.js) ·
[react-chessboard](https://github.com/Clariity/react-chessboard) · Stockfish (WASM, rodando num Web Worker)

## Rodando localmente

```bash
npm install
npm run dev
```

Outros comandos:

```bash
npm run build   # build de produção (tsc + vite build)
npm run lint     # oxlint
npm run preview  # serve o build de produção localmente
```

## Status

🚧 Em desenvolvimento — projeto pessoal, começando agora e evoluindo aos poucos.
