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

- [ ] IndexedDB com três stores: `games` (PGN + metadados), `analyses` (resultado por partida),
      `positions` (cache FEN + profundidade → avaliação).
- [ ] Reabrir partida já analisada = instantâneo.
- [ ] Análise em background com barra de progresso e navegação liberada durante o cálculo (o
      app já tem uma versão disso — overlay de análise da Revisão de partida — mas sem
      persistência: fechar o navegador perde o resultado).
- [ ] Import/export do banco local (JSON) — o usuário não pode perder o histórico ao limpar o
      navegador.

**Pronto quando:** você analisa 10 partidas, fecha o navegador, reabre e tudo está lá sem
recalcular.

## Sprint 2 — Treino de Erros (4–6 dias) — *a feature-âncora*

Já existe um item "Treino de Erros" na sidebar, hoje só um placeholder ("em breve"/manutenção).
Fazer em três etapas separadas, não tudo de uma vez:

- [ ] **2a. Extração** — varrer as análises salvas e gerar candidatos a puzzle (todo lance
      classificado como Erro ou Erro Grave, com FEN, lance jogado, melhor lance, delta de
      avaliação). Depende do Sprint 1 (precisa de análises salvas pra varrer).
- [ ] **2b. Classificação por motivo** — o pedaço mais delicado. Heurísticas puras em cima dos
      dados que já se tem:

  | Motivo | Como detectar |
  |---|---|
  | Peça pendurada | peça sua sem defesa atacada por peça de valor menor ou igual |
  | Garfo não visto | melhor lance do oponente ataca 2+ peças |
  | Cravada/enfiada | linha entre peça e rei/dama na melhor linha do motor |
  | Back-rank | mate ou ganho na última fileira com rei sem escape |
  | Erro de final | ≤ 6 peças + perda de resultado teórico |
  | Tempo | lance ruim com < 15% do relógio restante |
  | Erro de abertura | dentro do banco ECO e desvia da linha principal |

  Comece com 4 motivos bem feitos. Motivo desconhecido cai em "genérico" — melhor isso do que
  classificar errado.
- [ ] **2c. Sessão de treino** — fila com repetição espaçada (FSRS ou SM-2), tabuleiro travado,
      dica progressiva (motivo → peça envolvida → lance), e placar por motivo reaproveitando o
      componente de domínio do Treino de Aberturas (`useOpeningTrainer.ts` já tem esse padrão —
      `bumpMastery`/localStorage — dá pra generalizar em vez de reinventar).

**Pronto quando:** o app diz "você pendura peça em 18% das partidas" e te dá 10 posições reais
suas pra treinar isso.

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
