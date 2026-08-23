# Roadmap — ChessLens

Plano de evolução em sprints curtos, cada um entregando algo funcional. A ordem importa: os
dois primeiros sprints criam a base de dados que todo o resto consome — pular direto pro Treino
de Erros significa refazer trabalho depois.

> Movido de `CLAUDE.MD` pra `ROADMAP.md` (2026-08-23) — esse conteúdo é um plano/roteiro, não as
> instruções operacionais do projeto. O `CLAUDE.md` de verdade (stack, estrutura, convenções,
> regras invioláveis) foi escrito à parte, seguindo exatamente o que o Sprint 0 abaixo pede.

## Sprint 0 — Preparar o terreno (1–2 dias)

Antes de qualquer feature nova, porque isso define a qualidade de tudo que o Claude Code vai
gerar depois.

- [x] `CLAUDE.md` na raiz com: stack, estrutura de pastas, como rodar/testar, convenções
      (naming, estado, estilo), e uma seção "regras invioláveis" (capivara é identidade
      protegida, não mexer no worker do Stockfish sem pedir, etc.) — **feito em 2026-08-23**.
- [x] Mapear o que já existe em mais detalhe: auditoria formal de onde mora a lógica de
      classificação de lance, o wrapper do Stockfish, o parser de PGN, o banco ECO — **feito em
      2026-08-23** (2 agentes Explore mapearam consumidores/imports arquivo por arquivo antes da
      extração abaixo).
- [x] Extrair o "core de análise" pra um módulo isolado (`src/analysis/`), sem dependência de UI
      — **feito em 2026-08-23**. `moveClassifier.ts`, `openingsDatabase.ts`,
      `openingRepertoire.ts`, `puzzles.ts`, `coachComments.ts` movidos de `utils/` pra
      `analysis/` (confirmados sem import de React); `ClassifiedMove` movido de
      `types/chess.types.ts` pra `analysis/types.ts`, eliminando um import circular
      `utils/`↔`types/` que existia antes. `flags.ts`/`boardThemes.ts`/`pieceLoader.ts`/
      `sounds.ts` ficaram em `utils/` (não são lógica de análise). `useStockfish.ts` e
      `useGameAnalysis.ts` continuam em `hooks/` — são hooks React de verdade (estado + Worker),
      não lógica pura, então não migraram. 17 arquivos consumidores tiveram o caminho de import
      atualizado (sem shim de compatibilidade — decisão consciente, ver `CLAUDE.md`).
- [x] Testes no que é regra de negócio: classificação de lance e cálculo de precisão — **feito
      em 2026-08-23**. Adicionado Vitest (zero antes) + `src/analysis/moveClassifier.test.ts`
      (27 testes: `classifyMove`, `calcAccuracy`, `winningChances`, `toWhiteCp`), todos verdes.

> No Claude Code: `Audite este repositório e escreva um CLAUDE.md. Não altere nenhum outro
> arquivo.` Depois revise à mão — esse arquivo é o que mais economiza tempo no resto do projeto.

## Sprint 1 — Camada de persistência (2–3 dias)

Sem isso, Treino de Erros e Relatório não existem.

- [x] IndexedDB com três stores: `games` (PGN + metadados), `analyses` (resultado por partida),
      `positions` (cache FEN + profundidade → avaliação) — **feito em 2026-08-23**
      (`src/persistence/`, banco `chesslens-db`, sem lib nova — wrapper próprio pequeno, mesma
      filosofia "nunca quebra o app" do padrão de `localStorage` já usado no projeto).
- [x] Reabrir partida já analisada = instantâneo — **feito em 2026-08-23**. Só os números brutos
      do motor (`whiteEvals`/`bestMoves`) são cacheados, nunca a classificação em si — ela é
      recalculada na hora com a lógica ATUAL de `classifyMove`/`isBookMove`, então um cache
      antigo nunca fica preso a uma regra de classificação desatualizada. Testado ao vivo:
      reabrir a mesma partida pula o Stockfish inteiramente, sem overlay de análise.
- [x] Análise em background com barra de progresso e navegação liberada durante o cálculo —
      **resolvido em 2026-08-23** como efeito colateral do cache de `positions` (cruzado entre
      partidas): se o navegador fechar no meio de uma análise, cada posição já avaliada virou um
      cache HIT, então reabrir é um resume quase instantâneo, não um recálculo do zero — sem
      precisar de trabalho extra além do já feito nos 2 itens acima.
- [x] Import/export do banco local (JSON) — **feito em 2026-08-23**, nova categoria "Dados" em
      Configurações. `positions` fica de fora do arquivo de propósito (cache de performance, não
      histórico do usuário).

**Pronto quando:** você analisa 10 partidas, fecha o navegador, reabre e tudo está lá sem
recalcular.

## Sprint 2 — Treino de Erros (4–6 dias) — *a feature-âncora*

Já existe um item "Treino de Erros" na sidebar, hoje só um placeholder ("em breve"/manutenção).
Fazer em três etapas separadas, não tudo de uma vez:

- [x] **2a. Extração** — `src/analysis/errorExtraction.ts`, `extractErrorCandidates()` — varre
      TODAS as partidas salvas+analisadas (`persistence/`), reparseia o PGN e recalcula a
      classificação lance a lance (mesma composição de `App.tsx`), filtra mistake/blunder —
      **feito em 2026-08-23**. Fica sem corte/agrupamento de propósito (Sprint 3 vai precisar da
      lista completa).
- [x] **2b. Classificação por motivo** — `src/analysis/mistakeReasons.ts`,
      `classifyMistakeReason()` — **feito em 2026-08-23**. 4 heurísticas com chess.js puro (sem
      lib nova): peça pendurada, garfo não visto, cravada/enfiada, back-rank. Ordem fixa de
      prioridade, cai em `'generic'` quando nenhuma bate. 8 testes (`mistakeReasons.test.ts`),
      cada FEN validada contra o chess.js real antes de travar no teste. `masteryStats.ts`
      extraído de `useOpeningTrainer.ts` nessa mesma etapa (mastery genérico por chave, reusado
      no Treino de Erros com chave própria).
- [x] **2c. Sessão de treino** — `useErrorTrainer.ts` + `ErrorTrainerView.tsx` — **feito em
      2026-08-23**. Fila priorizada pelo mastery do motivo (mais baixo primeiro, mesma
      aproximação recency-weighted do Treino de Aberturas — não é FSRS/SM-2 de verdade, decisão
      de escopo consciente), corte de 5 candidatos por partida, dica em 3 estágios (motivo →
      peça → lance). Virou `NavItem` de verdade na sidebar (saiu de `TRAIN_PLACEHOLDERS`).

**Pronto quando:** o app diz "você pendura peça em 18% das partidas" e te dá 10 posições reais
suas pra treinar isso. *(A estatística agregada em si — "18% das partidas" — é o Sprint 3, que
consome `extractErrorCandidates()` sem filtro de sessão; aqui o treino já funciona ponta a ponta
com posições reais.)*

## Sprint 3 — Relatório do jogador (3–4 dias)

Tudo agregado sobre as análises salvas — quase nada de motor novo:

- [ ] Precisão por fase (abertura/meio-jogo/final).
- [ ] Taxa de erro grave × tempo restante no relógio.
- [ ] Desempenho por abertura cruzado com ECO, com link direto pro Treino de Aberturas daquela
      linha.
- [ ] Evolução de precisão nas últimas N partidas.
- [ ] "Top 3 vazamentos" no topo, com botão "treinar isso agora" → puxa Sprint 2.

Esse é o sprint que dá o print que a pessoa compartilha. Vale caprichar no visual e deixar a
capivara comentar o resultado.

## Sprint 4 — Jogar (4–5 dias)

- [ ] Bots de força limitada: `UCI_LimitStrength` + `UCI_Elo`, faixas de ~800 a 2200, cada uma
      com uma capivara. Cuidado: Stockfish com Elo baixo joga "estranho", não "fraco humano" —
      considerar adicionar ruído na escolha entre as top-N linhas.
- [ ] "Jogar a partir daqui" em qualquer posição da Revisão. Tecnicamente é o item mais barato
      aqui e o de maior valor percebido — o Tabuleiro de análise livre já existe e cobre parte
      do caminho (falta só o atalho a partir de uma posição específica da Revisão).
- [ ] Treino de finais com tablebase (API da Lichess, ou Syzygy 3-4-5 se quiser 100% offline).

## Sprint 5 — Polimento (contínuo, 1 item por vez)

Um item por sessão do Claude Code, cada um em seu próprio commit:

- [ ] Atalhos de teclado (setas, `F`, `Espaço`, `Esc`) — parte disso já existe (`useKeyboard.ts`
      cobre navegação de lance); revisar o que falta (F pra flip, Espaço, Esc por tela).
- [ ] Setas/círculos com botão direito + seta do melhor lance e da ameaça — setas desenhadas à
      mão já existem (`ChessBoard.tsx`); confirmar se "seta da ameaça" (não só do melhor lance)
      já está coberta.
- [ ] Ícone + rótulo textual nas classificações (acessibilidade — hoje é só cor) — conferir
      `QualityIcons.tsx`/`MoveQualityBadge.tsx`, já parecem ter ícone por classificação; validar
      se falta rótulo textual em algum lugar específico.
- [ ] Retry inline na Revisão ("ache o lance melhor" antes de revelar).
- [ ] Explicação em linguagem natural do erro, gerada a partir do motivo do Sprint 2b.
- [ ] Export: PGN anotado com NAG + imagem da posição crítica.
- [ ] PWA offline — coerente com o motor rodar no navegador.

## Sprint 6 — Retenção

- [ ] Streak diária, XP, puzzle diário.
- [ ] Acessórios da capivara desbloqueáveis.
- [ ] Onboarding: conectar conta → analisar última partida sozinho → "olha o que eu achei" →
      sugerir o primeiro treino.

---

## Como conduzir isso no Claude Code

- **Um sprint = uma branch. Uma sub-etapa = um commit.** Não peça "implemente o Treino de
  Erros" de uma vez — peça 2a, revise, commit, `/clear`, depois 2b.
- **Use plan mode** (Shift+Tab duas vezes) antes de qualquer tarefa com mais de 2 arquivos. Leia
  o plano, corrija, só então aprove.
- **`/clear` entre tarefas.** Contexto acumulado de outra feature é a principal causa de código
  inconsistente.
- **Peça teste antes do código** nas partes de regra de negócio (classificação de motivo,
  agendador de repetição espaçada). São puras e determinísticas — testam bem.
- **Deixe o motor fora do escopo dele por padrão.** Já está no `CLAUDE.md`: "não modifique o
  worker do Stockfish sem autorização explícita." É o pedaço que dá mais dor de cabeça se for
  "otimizado" sem querer.
