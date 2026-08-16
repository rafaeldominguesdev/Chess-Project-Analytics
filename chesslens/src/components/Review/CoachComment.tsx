import type { CSSProperties } from 'react'
import type { ClassifiedMove } from '../../types/chess.types'
import { coachComment } from '../../utils/coachComments'
import { MoveQualityBadge } from '../Board/MoveQualityBadge'

// Recorte do rosto da capivara a partir da hero image (2560×1440), sem precisar de um asset
// novo — mesmo mascote da Home (`/hero-capybara.png`), só que enquadrado como avatar redondo.
const CAPY_IMG = { width: 2560, height: 1440 }
const CAPY_FACE_CROP = { x: 294, y: 115, size: 768 }

function capybaraAvatarStyle(size: number): CSSProperties {
  const scale = size / CAPY_FACE_CROP.size
  return {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    backgroundImage: 'url(/hero-capybara.png)',
    backgroundSize: `${CAPY_IMG.width * scale}px ${CAPY_IMG.height * scale}px`,
    backgroundPosition: `${-CAPY_FACE_CROP.x * scale}px ${-CAPY_FACE_CROP.y * scale}px`,
    border: '2px solid var(--color-blue-bright)',
    boxShadow: '0 2px 8px -2px rgba(0,0,0,0.6)',
  }
}

interface CoachCommentProps {
  /** Lance atualmente exibido no tabuleiro (null = posição inicial, antes do primeiro lance). */
  move: ClassifiedMove | null
}

/** Comentário estilo "coach" do chess.com, mas com a capivara mascote do ChessLens — comenta
 *  o lance atual em uma frase, comparando com o melhor lance quando não foi o jogado. */
export function CoachComment({ move }: CoachCommentProps) {
  const msg = move ? coachComment(move) : null

  return (
    <div className="cl-card cl-fade-in" style={{ display: 'flex', gap: 10, padding: 12, alignItems: 'flex-start' }}>
      <div style={capybaraAvatarStyle(44)} />
      <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
        {msg && move?.classification ? (
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
