# CLAUDE.md — ChessCap

Instruções operacionais pra trabalhar neste repositório. Escrito pra guiar o Claude Code (ou
qualquer assistente) — não é o README (esse é voltado pra humanos, veja `chesslens/README.md`
e o `README.md` da raiz, que é o portfólio).

## O que é o projeto

ChessCap é um analisador de partidas de xadrez: importa uma partida (chess.com/Lichess/PGN
colado), roda o motor Stockfish real (WASM, num Web Worker, 100% no navegador — sem backend),
classifica cada lance, mostra gráfico de avaliação, e tem modos de treino (aberturas, puzzles
táticos) e um editor de posição. A mascote — uma capivara com lupa — é a imagem central da Home
e a identidade do produto.

Este é um projeto pessoal de portfólio e aprendizado (não uma empresa/produto comercial) — o
dono é estudante e o objetivo declarado é aprender programação construindo algo que ele mesmo
usa. Peça confirmação em decisões de escopo grandes, mas não trate isso como um contexto
corporativo com processo formal de aprovação.

## Regras invioláveis

- **A capivara é a identidade central do produto — nunca remover, substituir ou descaracterizar.**
  Pode melhorar integração, composição, iluminação, escala, enquadramento, animação sutil — não
  pode trocar a mascote em si sem autorização explícita do usuário. Ver `original.md` (raiz) pro
  "prompt-mestre" completo de regras de preservação — leia antes de qualquer mudança de escopo
  visual grande (redesign, não um ajuste pontual).
- **Não modifique o worker do Stockfish (`chesslens/src/hooks/useStockfish.ts`, os arquivos em
  `chesslens/public/stockfish/`, ou `chesslens/scripts/setup-stockfish.mjs`) sem pedir
  autorização explícita primeiro.** É a peça que mais reintroduz bugs sutis (profundidade,
  multiPv, timing de postMessage/worker) se "otimizada" sem necessidade concreta. Ajustar
  `depth`/`multiPv` como parâmetro de uma função existente é diferente de mexer no wrapper.
- **Não copiar visualmente chess.com, Chessigma ou Lichess.** Princípios de UX podem inspirar
  (densidade de informação do motor, por exemplo), mas a paleta/tipografia/composição são
  próprias do ChessCap — ver skill `chesslens-design`.
- **Preservar dados, integrações e nomes de função existentes** ao refatorar, a menos que o
  usuário peça a mudança especificamente. Isso inclui os hooks de API (chess.com/Lichess), o
  formato dos dados salvos em `localStorage`, e o banco ECO/puzzles em `chesslens/src/data/`.

## Stack e como rodar

React 19 + TypeScript + Vite. `chess.js` (regras/PGN), `react-chessboard` (tabuleiro), Stockfish
18 (WASM, Web Worker). Tailwind está instalado (`@tailwindcss/vite`, importado em
`src/index.css`) mas **não é o padrão do projeto** — a UI inteira é construída com `style={{}}`
inline + um sistema de tokens/classes próprio (`.cl-*`, custom properties CSS), não classes
utilitárias Tailwind. Não introduza Tailwind em massa num componente sem alinhar antes — é uma
mudança de convenção, não um detalhe local.

```bash
cd chesslens
npm install   # roda scripts/setup-stockfish.mjs sozinho (copia o motor de node_modules/stockfish, ~108MB, pra public/stockfish/ — não versionado no git)
npm run dev
npm run build   # tsc -b && vite build — SEMPRE valide com este comando, não só `tsc --noEmit` avulso (noEmit sozinho já deixou passar um import quebrado que só o build completo pegou)
npm run lint     # oxlint
```

**Não há framework de teste configurado** (nem Vitest nem Jest, sem `test` script no
`package.json`). Se for adicionar testes (ver Sprint 0 do `ROADMAP.md`), essa é uma decisão de
setup que vale confirmar com o usuário antes (qual framework, onde ficam os arquivos).

## Estrutura (veja também `chesslens/README.md`)

```
chesslens/src/
├── components/   # uma pasta por tela/bloco visual (Home, PlayerSearch, Board, Review,
│                 # Analysis, Training, PositionEditor, Theater, Layout, Settings)
├── hooks/        # estado com lógica (useStockfish, useChessGame, useOpeningTrainer, etc.)
├── contexts/     # ThemeContext
├── utils/        # funções puras — moveClassifier, openingsDatabase/openingRepertoire,
│                 # puzzles, sounds, boardThemes, pieceLoader — sem dependência de React
├── types/        # tipos compartilhados
└── data/         # eco-openings.json (3810+ linhas nomeadas), puzzles.json (~3700 puzzles)
```

Pontos de entrada úteis pra auditoria futura:
- **Classificação de lance/precisão**: `utils/moveClassifier.ts` (fonte única — `EvalBar.tsx`/
  `EvalGraph.tsx` importam de lá, não duplicam limiares).
- **PGN**: não tem parser próprio — usa `chess.js` (`game.loadPgn()`) direto em
  `hooks/useChessGame.ts`.
- **Motor**: `hooks/useStockfish.ts` (avaliação ao vivo, multiPv) e `hooks/useGameAnalysis.ts`
  (análise da partida inteira, lance a lance, em background).
- **Persistência hoje**: só `localStorage` (placar de domínio do Treino de Aberturas, tema,
  última busca/plataforma) — não há IndexedDB nem cache de análise entre sessões ainda (ver
  Sprint 1 do `ROADMAP.md`).

## Convenções observadas no código

- **Estado**: hooks React puros (`useState`/`useCallback`/`useContext`) — sem Redux/Zustand/
  Context genérico de estado global. `ThemeContext` é o único Context do projeto.
- **Estilo**: `style={{}}` inline é o padrão dominante (não classes utilitárias) + classes
  `.cl-*`/custom properties CSS pra tokens compartilhados (cor, sombra, tipografia, animação).
  Antes de estilizar algo novo, leia a skill `chesslens-design` (`.claude/skills/`) — documenta
  a paleta "Cinza Azulado" atual e onde ficam os tokens de verdade (`index.css`).
- **Naming**: componentes em PascalCase (um por arquivo, mesmo nome do arquivo), hooks
  `useAlgumaCoisa.ts`, utils em camelCase.
- **Comentários**: em português, no código, geralmente explicando o *porquê* de uma decisão não
  óbvia (um bug encontrado, um pedido específico do usuário) — não o *o quê* óbvio pelo nome.
  Muitos comentários citam a motivação real ("pedido direto do usuário: ..."). Mantenha esse
  padrão em vez de comentários genéricos de documentação.
- **Commits**: mensagens em português, subject curto no imperativo + corpo explicando o porquê
  quando relevante, terminando com `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`
  quando gerado por Claude Code.

## Documentos de referência (leia antes de trabalhos maiores)

- **`original.md`** (raiz) — o "prompt-mestre" com as regras de preservação de identidade/escopo
  pra qualquer trabalho de redesign visual.
- **`PROGRESSO_REDESIGN.md`** (raiz) — diário de sessão mantido pelo próprio projeto: todo o
  histórico de fases, decisões, bugs achados/corrigidos e testes executados. Grande (100KB+) —
  leia o `## Estado atual` no topo primeiro, e os headers `## ` pra navegar o resto. Ao terminar
  trabalho relevante, adicione uma entrada nova no mesmo estilo (não é opcional — é a prática já
  estabelecida do projeto).
- **`ROADMAP.md`** (raiz) — plano de sprints pra evoluir o produto além do estado atual
  (persistência, Treino de Erros, Relatório do jogador, Jogar contra bots, polimento, retenção).
- **`.claude/skills/chesslens-design/SKILL.md`** — sistema visual (paleta, tipografia, tokens).

## Como conduzir sprints grandes (do `ROADMAP.md`)

- Um sprint = uma branch; uma sub-etapa = um commit. Não implemente um sprint inteiro de uma vez
  — quebre em sub-etapas (ex: Sprint 2 já vem dividido em 2a/2b/2c no `ROADMAP.md`), confirme
  cada uma antes de seguir pra próxima.
- Use plan mode antes de qualquer tarefa que toque mais de ~2 arquivos ou mude arquitetura.
- Peça teste antes do código nas partes de regra de negócio pura (classificação de motivo de
  erro, agendador de repetição espaçada) — assim que houver framework de teste configurado.
