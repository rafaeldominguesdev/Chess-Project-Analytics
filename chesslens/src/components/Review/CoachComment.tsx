import type { CSSProperties } from 'react'
import type { ClassifiedMove } from '../../analysis/types'
import { coachComment } from '../../analysis/coachComments'
import { MoveQualityBadge } from '../Board/MoveQualityBadge'

// Recorte do rosto da capivara a partir da hero image (2560×1440), sem precisar de um asset
// novo — mesmo mascote da Home (`/hero-bg.png`), só que enquadrado como avatar redondo.
const CAPY_IMG = { width: 2560, height: 1440 }
const CAPY_FACE_CROP = { x: 260, y: 80, size: 900 }

function capybaraAvatarStyle(size: number): CSSProperties {
  const scale = size / CAPY_FACE_CROP.size
  return {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    backgroundImage: 'url(/hero-bg.png?v=2)',
    backgroundSize: `${CAPY_IMG.width * scale}px ${CAPY_IMG.height * scale}px`,
    backgroundPosition: `${-CAPY_FACE_CROP.x * scale}px ${-CAPY_FACE_CROP.y * scale}px`,
    border: '2px solid var(--color-blue-bright)',
    boxShadow: '0 2px 8px -2px rgba(0,0,0,0.6)',
  }
}

interface CoachCommentProps {
  /** Lance atualmente exibido no tabuleiro (null = posição inicial, antes do primeiro lance). */
  move: ClassifiedMove | null
  /** Retry inline (Sprint 5): quando presente, esse lance é mistake/miss/blunder e ainda não foi
   *  resolvido — mostra o desafio "ache o lance melhor" em vez do comentário normal. O tabuleiro
   *  (fora deste componente) já está mostrando a posição ANTES do lance e aceitando arrastar
   *  peça; aqui só o texto/botão de revelar. `null` = comentário normal (lance já revelado, ou
   *  não era candidato a retry). */
  retry?: { wrongAttempts: number; onReveal: () => void } | null
}

/** Comentário estilo "coach" do chess.com, mas com a capivara mascote do ChessLens — comenta
 *  o lance atual em uma frase, comparando com o melhor lance quando não foi o jogado. Quando
 *  `retry` está ativo, mostra o desafio "ache o lance melhor" em vez do comentário — pedido do
 *  roadmap (Sprint 5, "retry inline... antes de revelar"), pra tentar achar o lance certo você
 *  mesmo antes do coach simplesmente contar o que era. */
export function CoachComment({ move, retry }: CoachCommentProps) {
  const msg = move ? coachComment(move) : null

  return (
    <div className="cl-card cl-fade-in" style={{ display: 'flex', gap: 10, padding: 12, alignItems: 'flex-start' }}>
      <div style={capybaraAvatarStyle(44)} />
      <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
        {retry ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
              <span className="cl-display" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text-on-dark)' }}>
                Ache o lance melhor
              </span>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--color-gray-muted)', lineHeight: 1.4 }}>
              {retry.wrongAttempts > 0
                ? `Não foi esse — o tabuleiro voltou, tenta de novo (${retry.wrongAttempts} tentativa${retry.wrongAttempts > 1 ? 's' : ''} errada${retry.wrongAttempts > 1 ? 's' : ''}).`
                : 'Antes de eu contar o que rolou, arrasta no tabuleiro o lance que você acha que era melhor que o jogado.'}
            </p>
            <button
              onClick={retry.onReveal}
              className="cl-btn cl-btn-sm"
              style={{ marginTop: 8, width: 'auto', height: 'auto', padding: '6px 12px', fontSize: 11.5 }}
            >
              Revelar
            </button>
          </>
        ) : msg && move?.classification ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
              <span className="cl-display" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--color-text-on-dark)' }}>
                {msg.headline}
              </span>
              <MoveQualityBadge quality={move.classification} size="sm" />
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--color-gray-muted)', lineHeight: 1.4 }}>{msg.body}</p>
          </>
        ) : (
          <p style={{ fontSize: 12.5, color: 'var(--color-gray-muted)', lineHeight: 1.4 }}>
            {move
              ? 'Ainda analisando esse lance — já já eu comento.'
              : 'Navegue pelos lances que eu comento cada jogada.'}
          </p>
        )}
      </div>
    </div>
  )
}
