import React from 'react';
import { Icon } from '../foundation/Icon.jsx';
import { Checkbox } from '../inputs/Checkbox.jsx';

/** Tabela de dados — o componente mais crítico da família AION.
 * Densidade compacta por padrão de tela; algarismos tabulares; seleção em lote; ordenação. */
export function DataTable({ columns = [], rows = [], compact = false, selectable = false, onRowClick, sortKey, sortDir, onSort, rowKey = 'id', selected, onSelectionChange, emptyState }) {
  const [internalSel, setInternalSel] = React.useState([]);
  const sel = selected !== undefined ? selected : internalSel;
  const setSel = (v) => { if (selected === undefined) setInternalSel(v); onSelectionChange && onSelectionChange(v); };
  const keyOf = (row, i) => row[rowKey] !== undefined ? row[rowKey] : i;
  const allSelected = rows.length > 0 && sel.length === rows.length;
  const rowH = compact ? 'var(--row-height-compact)' : 'var(--row-height)';
  const cellPad = compact ? '0 var(--space-3)' : '0 var(--space-4)';

  const thStyle = (col) => ({
    height: rowH, padding: cellPad, textAlign: col.align || 'left',
    fontSize: 'var(--type-caption-size)', fontWeight: 'var(--weight-medium)', color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--border-default)', background: 'var(--surface-default)',
    position: 'sticky', top: 0, cursor: col.sortable ? 'pointer' : undefined, userSelect: 'none',
  });

  return (
    <div style={{ overflow: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', background: 'var(--surface-default)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: compact ? 'var(--type-data-size)' : 'var(--type-body-size)' }}>
        <thead>
          <tr>
            {selectable && (
              <th style={{ ...thStyle({}), width: 40, padding: '0 0 0 var(--space-4)' }}>
                <Checkbox checked={allSelected} indeterminate={sel.length > 0 && !allSelected}
                  onChange={(c) => setSel(c ? rows.map(keyOf) : [])} label="" />
              </th>
            )}
            {columns.map((col) => (
              <th key={col.key} style={thStyle(col)} aria-sort={sortKey === col.key ? (sortDir === 'desc' ? 'descending' : 'ascending') : undefined}
                onClick={col.sortable && onSort ? () => onSort(col.key, sortKey === col.key && sortDir === 'asc' ? 'desc' : 'asc') : undefined}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {col.label}
                  {col.sortable && <Icon name={sortKey === col.key ? (sortDir === 'desc' ? 'arrow-down' : 'arrow-up') : 'chevrons-up-down'} size={12} style={{ opacity: sortKey === col.key ? 1 : 0.5 }} />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={columns.length + (selectable ? 1 : 0)} style={{ padding: 'var(--space-8)' }}>{emptyState || <span style={{ color: 'var(--text-subtle)' }}>Nenhum registro.</span>}</td></tr>
          )}
          {rows.map((row, i) => {
            const k = keyOf(row, i);
            const isSel = sel.includes(k);
            return (
              <tr key={k}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{ cursor: onRowClick ? 'pointer' : undefined, background: isSel ? 'var(--surface-selected)' : 'transparent', transition: 'background var(--duration-instant) var(--ease-standard)' }}
                onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = 'var(--surface-hover)'; }}
                onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}>
                {selectable && (
                  <td style={{ height: rowH, padding: '0 0 0 var(--space-4)', borderBottom: '1px solid var(--border-subtle)' }} onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={isSel} onChange={(c) => setSel(c ? [...sel, k] : sel.filter(s => s !== k))} label="" />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className={col.numeric ? 'numeric' : undefined} style={{
                    height: rowH, padding: cellPad, textAlign: col.align || (col.numeric ? 'right' : 'left'),
                    borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-body)', whiteSpace: 'nowrap',
                    fontVariantNumeric: col.numeric ? 'tabular-nums' : undefined,
                  }}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
