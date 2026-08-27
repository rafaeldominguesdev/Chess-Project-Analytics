import { CloseIcon } from './icons'

interface UpdatesPanelProps {
  open: boolean
  onClose: () => void
}

// Lista curada à mão — atualizada conforme funções novas de verdade entram no site. Não é
// gerada automaticamente a partir do histórico de commits (que é técnico demais pro usuário
// final); cada item aqui é uma melhoria com impacto visível pra quem usa o app.
const UPDATES: { title: string; description: string }[] = [
  {
    title: 'Tabuleiro se ajusta sozinho a qualquer tela',
    description: 'Celular, tablet ou PC — o tamanho do tabuleiro é recalculado automaticamente conforme o espaço disponível, sem precisar configurar nada.',
  },
  {
    title: 'Configurações num painel centralizado',
    description: 'Saiu da gaveta lateral e virou um painel no centro da tela, mais fácil de navegar e com os botões maiores.',
  },
  {
    title: 'Novo visual padrão: tabuleiro verde + peças Dubrovny Noir',
    description: 'Casas no estilo clássico do Chess.com e um conjunto de peças com mais contraste e acabamento glossy.',
  },
  {
    title: 'Painel do motor com as 3 melhores linhas',
    description: 'Além das setas no tabuleiro, o Tabuleiro de análise livre mostra as variantes do Stockfish em texto, com avaliação e sequência de lances.',
  },
  {
    title: 'Relógio por lance na revisão de partida',
    description: 'Partidas importadas do chess.com ou Lichess agora mostram o tempo restante de cada jogador a cada lance, com aviso quando cai abaixo de 30 segundos.',
  },
  {
    title: 'Editor de posição livre',
    description: '"Definir Posição" monta qualquer posição peça por peça e manda direto pro motor analisar.',
  },
  {
    title: 'Navegação 100% por teclado',
    description: 'Dá pra mover peça sem usar o mouse: Tab até a peça, Espaço pra pegar, setas pra mover, Espaço de novo pra soltar.',
  },
]

/** Painel "Atualizações" — lista curta de melhorias recentes do site, acessível pela sidebar. */
export function UpdatesPanel({ open, onClose }: UpdatesPanelProps) {
  if (!open) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(5,4,12,0.65)', backdropFilter: 'blur(8px)', zIndex: 49 }}
      />
      {/* Mesmo padrão de centralização do SettingsPanel/MaintenanceNotice: wrapper de posição
          separado da animação de entrada, senão a keyframe de cl-modal-in sobrescreve o
          translate de centralização assim que termina. */}
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 50 }}>
        {/* Acabamento "liso"/em camadas (pedido direto: "estilo claude system smoth e liso") —
            sem trocar a paleta escura do site (continuam só os tokens de sempre): borda dura vira
            sombra em ANEL (`0 0 0 1px`, a mesma técnica que dá profundidade sem precisar de um
            traço visível), cantos mais generosos, divisores viram hairlines suaves em vez de
            linhas grossas, e cada atualização vira um cartão com camada própria
            (`--color-bg-raised`, um degrau mais claro que o painel) em vez de bullet + texto solto. */}
        <div
          className="cl-modal-in"
          role="dialog"
          aria-modal="true"
          aria-label="Updates"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: 520, maxWidth: '92vw', height: 'min(600px, 86vh)',
            background: 'var(--color-bg-panel)',
            borderRadius: 18,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 0 0 1px var(--color-gray-border), inset 0 1px 0 0 rgba(255,255,255,0.05), 0 32px 64px -16px rgba(0,0,0,0.75)',
          }}
        >
          <div style={{
            padding: '20px 24px 16px',
            boxShadow: '0 1px 0 0 color-mix(in srgb, var(--color-gray-border) 65%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Ícone oficial do painel (pedido direto do usuário): megafone 3D skeumórfico,
                  mesma família das artes PNG do site (`public/icon-*.png`) — sem o círculo
                  tintado que o ícone genérico usava antes. */}
              <img src="/icon-updates.png" alt="" width={28} height={28} style={{ flexShrink: 0, display: 'block', aspectRatio: '1' }} />
              <h2 className="cl-display" style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-text-on-dark)', letterSpacing: '-0.01em' }}>Updates</h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar atualizações"
              className="cl-updates-close"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 30, height: 30, flexShrink: 0, padding: 0,
                borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: 'var(--color-bg-raised)', color: 'var(--color-gray-muted)',
                boxShadow: '0 0 0 1px var(--color-gray-border)',
              }}
            >
              <CloseIcon width={15} height={15} />
            </button>
          </div>

          <div className="settings-scroll" style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 12.5, color: 'var(--color-gray-muted)', lineHeight: 1.6, margin: '0 0 4px' }}>
              O que mudou recentemente no Chess Noir — mais novo primeiro.
            </p>
            {UPDATES.map((item, i) => (
              <div
                key={item.title}
                className="cl-row-in"
                style={{
                  display: 'flex', flexDirection: 'column', gap: 4,
                  padding: '14px 16px', borderRadius: 12,
                  background: 'var(--color-bg-raised)',
                  boxShadow: '0 0 0 1px color-mix(in srgb, var(--color-gray-border) 55%, transparent)',
                  animationDelay: `${i * 30}ms`,
                }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text-on-dark)', lineHeight: 1.3 }}>{item.title}</span>
                <span style={{ fontSize: 12, color: 'var(--color-gray-muted)', lineHeight: 1.6 }}>{item.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
