import { WrenchIcon } from './icons'

interface MaintenanceNoticeProps {
  /** Nome da função que o usuário clicou (ex: "Woodpecker") — null = fechado. */
  feature: string | null
  onClose: () => void
}

/** Aviso curto pra itens de menu que existem só como "placeholder" (ainda não construídos) —
 *  em vez de não fazer nada ou dar erro ao clicar, deixa claro que é uma função planejada. */
export function MaintenanceNotice({ feature, onClose }: MaintenanceNoticeProps) {
  if (!feature) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(5,4,12,0.6)', backdropFilter: 'blur(8px)', zIndex: 59 }}
      />
      <div
        className="cl-modal-in"
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 340, maxWidth: '90vw', zIndex: 60,
          background: 'var(--color-bg-panel)', border: '1px solid var(--color-gray-border)',
          borderRadius: 'var(--radius-lg)', padding: 24,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center',
          boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 1px 0 0 rgba(0,0,0,0.5), 0 24px 48px -12px rgba(0,0,0,0.7)',
        }}
      >
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
          background: 'color-mix(in srgb, var(--color-blue-bright) 16%, var(--color-bg-main))', color: 'var(--color-blue-bright)',
        }}>
          <WrenchIcon width={22} height={22} />
        </span>
        <h2 className="cl-display" style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--color-text-on-dark)' }}>
          {feature} — em manutenção
        </h2>
        <p style={{ fontSize: 12.5, color: 'var(--color-gray-muted)', lineHeight: 1.5 }}>
          Essa função ainda tá sendo construída. Volta aqui daqui a pouco!
        </p>
        <button onClick={onClose} className="cl-btn cl-btn-sm" style={{ width: 'auto', height: 'auto', padding: '8px 20px', fontSize: 12, marginTop: 4 }}>
          Entendi
        </button>
      </div>
    </>
  )
}
