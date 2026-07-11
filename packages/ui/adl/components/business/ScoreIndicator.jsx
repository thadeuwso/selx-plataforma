import React from 'react';
import { Icon } from '../foundation/Icon.jsx';
import { Popover } from '../overlay/Popover.jsx';
import { ProgressBar } from '../feedback/ProgressBar.jsx';

/** Indicador de score com explicação — nunca um número seco: origem, critérios e confiança. */
export function ScoreIndicator({ value, max = 100, label = 'Match', confidence, criteria = [], size = 'default', style }) {
  const pct = Math.round((value / max) * 100);
  const tone = pct >= 75 ? 'var(--feedback-success)' : pct >= 50 ? 'var(--feedback-warning)' : 'var(--feedback-danger)';
  const compact = size === 'compact';
  const chip = (
    <button aria-label={`${label}: ${pct} de 100 — ver explicação`} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: compact ? '1px 8px' : '3px 10px',
      background: 'var(--ai-surface)', border: '1px solid var(--ai-border)',
      borderRadius: 'var(--radius-full)', cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
    }}>
      <Icon name="sparkles" size={compact ? 11 : 13} style={{ color: 'var(--ai-text)' }} />
      <span style={{ fontSize: compact ? 'var(--type-caption-size)' : 'var(--type-support-size)', fontWeight: 'var(--weight-semibold)', color: tone, fontVariantNumeric: 'tabular-nums' }}>{pct}</span>
      <span style={{ fontSize: 'var(--type-caption-size)', color: 'var(--ai-text)' }}>{label}</span>
      <Icon name="chevron-down" size={11} style={{ color: 'var(--text-subtle)' }} />
    </button>
  );
  return (
    <span style={style}>
      <Popover trigger={chip} width={300}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--type-caption-size)', color: 'var(--ai-text)' }}>
            <Icon name="sparkles" size={12} />
            Avaliação gerada por IA — apoia, não decide
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 24, fontWeight: 'var(--weight-semibold)', color: tone, fontVariantNumeric: 'tabular-nums' }}>{pct}</span>
            <span style={{ fontSize: 'var(--type-support-size)', color: 'var(--text-muted)' }}>/ 100 · {label}</span>
          </div>
          {confidence && (
            <div style={{ fontSize: 'var(--type-caption-size)', color: 'var(--text-muted)' }}>
              Confiança: <strong style={{ color: 'var(--text-body)' }}>{confidence}</strong>
            </div>
          )}
          {criteria.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {criteria.map((c) => (
                <ProgressBar key={c.label} label={c.label} value={c.value} showValue
                  tone={c.value >= 75 ? 'success' : c.value >= 50 ? 'warning' : 'danger'} />
              ))}
            </div>
          )}
        </div>
      </Popover>
    </span>
  );
}
