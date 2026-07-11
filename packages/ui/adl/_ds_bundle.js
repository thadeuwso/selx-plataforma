/* @ds-bundle: {"format":4,"namespace":"AIONDesignLanguageADL_e674b3","components":[{"name":"ActionMenu","sourcePath":"components/actions/ActionMenu.jsx"},{"name":"Button","sourcePath":"components/actions/Button.jsx"},{"name":"ButtonGroup","sourcePath":"components/actions/ButtonGroup.jsx"},{"name":"KpiCard","sourcePath":"components/business/KpiCard.jsx"},{"name":"PersonCard","sourcePath":"components/business/PersonCard.jsx"},{"name":"PipelineBoard","sourcePath":"components/business/PipelineBoard.jsx"},{"name":"ScoreIndicator","sourcePath":"components/business/ScoreIndicator.jsx"},{"name":"Avatar","sourcePath":"components/display/Avatar.jsx"},{"name":"DataTable","sourcePath":"components/display/DataTable.jsx"},{"name":"ListView","sourcePath":"components/display/ListView.jsx"},{"name":"Stat","sourcePath":"components/display/Stat.jsx"},{"name":"StatusBadge","sourcePath":"components/display/StatusBadge.jsx"},{"name":"Tag","sourcePath":"components/display/Tag.jsx"},{"name":"Tooltip","sourcePath":"components/display/Tooltip.jsx"},{"name":"Alert","sourcePath":"components/feedback/Alert.jsx"},{"name":"ConfirmDialog","sourcePath":"components/feedback/ConfirmDialog.jsx"},{"name":"EmptyState","sourcePath":"components/feedback/EmptyState.jsx"},{"name":"ProgressBar","sourcePath":"components/feedback/ProgressBar.jsx"},{"name":"Skeleton","sourcePath":"components/feedback/Skeleton.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"AppShell","sourcePath":"components/foundation/AppShell.jsx"},{"name":"Card","sourcePath":"components/foundation/Card.jsx"},{"name":"Divider","sourcePath":"components/foundation/Divider.jsx"},{"name":"Icon","sourcePath":"components/foundation/Icon.jsx"},{"name":"Page","sourcePath":"components/foundation/Page.jsx"},{"name":"Checkbox","sourcePath":"components/inputs/Checkbox.jsx"},{"name":"Combobox","sourcePath":"components/inputs/Combobox.jsx"},{"name":"DateField","sourcePath":"components/inputs/DateField.jsx"},{"name":"FileUpload","sourcePath":"components/inputs/FileUpload.jsx"},{"name":"Radio","sourcePath":"components/inputs/Radio.jsx"},{"name":"Select","sourcePath":"components/inputs/Select.jsx"},{"name":"Switch","sourcePath":"components/inputs/Switch.jsx"},{"name":"TextArea","sourcePath":"components/inputs/TextArea.jsx"},{"name":"TextField","sourcePath":"components/inputs/TextField.jsx"},{"name":"Breadcrumb","sourcePath":"components/navigation/Breadcrumb.jsx"},{"name":"GlobalSearch","sourcePath":"components/navigation/GlobalSearch.jsx"},{"name":"Pagination","sourcePath":"components/navigation/Pagination.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"Drawer","sourcePath":"components/overlay/Drawer.jsx"},{"name":"Modal","sourcePath":"components/overlay/Modal.jsx"},{"name":"Popover","sourcePath":"components/overlay/Popover.jsx"}],"sourceHashes":{"components/actions/ActionMenu.jsx":"4ff02f228094","components/actions/Button.jsx":"7d7efb770046","components/actions/ButtonGroup.jsx":"c39b90e5c0ac","components/business/KpiCard.jsx":"f6ec50244d43","components/business/PersonCard.jsx":"1fce76370620","components/business/PipelineBoard.jsx":"78f84cf586a3","components/business/ScoreIndicator.jsx":"d30053d38102","components/display/Avatar.jsx":"e2a80e74e577","components/display/DataTable.jsx":"db780b2826a7","components/display/ListView.jsx":"e585749a6bd9","components/display/Stat.jsx":"2aa75b2cd70d","components/display/StatusBadge.jsx":"b8dbd14101b0","components/display/Tag.jsx":"18a6964c8c9e","components/display/Tooltip.jsx":"ed7e8e4e037c","components/feedback/Alert.jsx":"f92d130c116b","components/feedback/ConfirmDialog.jsx":"d2cd64cd61da","components/feedback/EmptyState.jsx":"443a840f8088","components/feedback/ProgressBar.jsx":"bb7574240b42","components/feedback/Skeleton.jsx":"c12a06fb6ef2","components/feedback/Toast.jsx":"73317ab217d4","components/foundation/AppShell.jsx":"f241c36c6a51","components/foundation/Card.jsx":"e9e87b0c776d","components/foundation/Divider.jsx":"a65be2f16bb3","components/foundation/Icon.jsx":"16644c8bb737","components/foundation/Page.jsx":"5593712e340a","components/inputs/Checkbox.jsx":"6447d32c0995","components/inputs/Combobox.jsx":"5f5cbd10dfc7","components/inputs/DateField.jsx":"9a233716c28a","components/inputs/FileUpload.jsx":"25d4aedc269d","components/inputs/Radio.jsx":"0a2550e9ecd6","components/inputs/Select.jsx":"3cdf97b22311","components/inputs/Switch.jsx":"28e055f54d2d","components/inputs/TextArea.jsx":"81841cfdcbca","components/inputs/TextField.jsx":"b7237e2b15cc","components/inputs/fieldBase.jsx":"6ba00e02d7c6","components/navigation/Breadcrumb.jsx":"d0490964690c","components/navigation/GlobalSearch.jsx":"6e5b63590be2","components/navigation/Pagination.jsx":"b4df217c7aa7","components/navigation/Tabs.jsx":"becc8cb98b76","components/overlay/Drawer.jsx":"c178303045b3","components/overlay/Modal.jsx":"a14e635a5062","components/overlay/Popover.jsx":"96d8433ba3e1","ui_kits/selx/CandidatoDrawer.jsx":"c6690471d04c","ui_kits/selx/ScreenCandidatos.jsx":"720ca8ac9df5","ui_kits/selx/ScreenDashboard.jsx":"9e1996a42222","ui_kits/selx/ScreenPipeline.jsx":"f781f6904bb6","ui_kits/selx/ScreenVagas.jsx":"15272a9bf77d","ui_kits/selx/data.js":"057cac07e777"},"inlinedExternals":[],"unexposedExports":[{"name":"controlStyle","sourcePath":"components/inputs/fieldBase.jsx"},{"name":"fieldHelp","sourcePath":"components/inputs/fieldBase.jsx"},{"name":"fieldLabel","sourcePath":"components/inputs/fieldBase.jsx"},{"name":"useFieldId","sourcePath":"components/inputs/fieldBase.jsx"}]} */

(() => {

const __ds_ns = (window.AIONDesignLanguageADL_e674b3 = window.AIONDesignLanguageADL_e674b3 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/actions/ButtonGroup.jsx
try { (() => {
/** Grupo de ações — alinha botões relacionados com espaçamento padrão. Ação primária à direita. */
function ButtonGroup({
  align = 'end',
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "group",
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      justifyContent: align === 'end' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
      alignItems: 'center',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { ButtonGroup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/ButtonGroup.jsx", error: String((e && e.message) || e) }); }

// components/display/Avatar.jsx
try { (() => {
const avatarSizes = {
  sm: 24,
  md: 32,
  lg: 40,
  xl: 56
};

/** Avatar — círculo com foto ou iniciais; a exceção de imagem nos produtos ADL. */
function Avatar({
  name = '',
  src,
  size = 'md',
  style
}) {
  const px = avatarSizes[size] || size;
  const initials = name.split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase();
  return /*#__PURE__*/React.createElement("span", {
    role: "img",
    "aria-label": name,
    style: {
      width: px,
      height: px,
      borderRadius: 'var(--radius-full)',
      flexShrink: 0,
      background: src ? 'var(--surface-sunken)' : 'var(--brand-100)',
      color: 'var(--brand-700)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: Math.round(px * 0.38),
      fontWeight: 'var(--weight-semibold)',
      fontFamily: 'var(--font-sans)',
      overflow: 'hidden',
      ...style
    }
  }, src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : initials);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/display/ListView.jsx
try { (() => {
/** Lista — itens verticais com conteúdo à esquerda e meta/ações à direita. */
function ListView({
  items = [],
  onItemClick,
  renderItem,
  style
}) {
  return /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      ...style
    }
  }, items.map((item, i) => /*#__PURE__*/React.createElement("li", {
    key: item.id !== undefined ? item.id : i,
    onClick: onItemClick ? () => onItemClick(item) : undefined,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      padding: 'var(--space-3) var(--space-2)',
      borderBottom: i < items.length - 1 ? '1px solid var(--border-subtle)' : 'none',
      cursor: onItemClick ? 'pointer' : undefined,
      borderRadius: 'var(--radius-sm)',
      transition: 'background var(--duration-instant) var(--ease-standard)'
    },
    onMouseEnter: e => {
      if (onItemClick) e.currentTarget.style.background = 'var(--surface-hover)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = 'transparent';
    }
  }, renderItem ? renderItem(item) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-body-size)',
      color: 'var(--text-body)',
      fontWeight: 'var(--weight-medium)'
    }
  }, item.title), item.description && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-support-size)',
      color: 'var(--text-muted)'
    }
  }, item.description)), item.meta && /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0,
      fontSize: 'var(--type-support-size)',
      color: 'var(--text-subtle)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, item.meta)))));
}
Object.assign(__ds_scope, { ListView });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/ListView.jsx", error: String((e && e.message) || e) }); }

// components/display/StatusBadge.jsx
try { (() => {
const statusTones = {
  neutral: {
    bg: 'var(--surface-sunken)',
    fg: 'var(--text-muted)',
    dot: 'var(--neutral-400)'
  },
  success: {
    bg: 'var(--feedback-success-surface)',
    fg: 'var(--feedback-success)',
    dot: 'var(--feedback-success)'
  },
  danger: {
    bg: 'var(--feedback-danger-surface)',
    fg: 'var(--feedback-danger)',
    dot: 'var(--feedback-danger)'
  },
  warning: {
    bg: 'var(--feedback-warning-surface)',
    fg: 'var(--feedback-warning)',
    dot: 'var(--feedback-warning)'
  },
  info: {
    bg: 'var(--feedback-info-surface)',
    fg: 'var(--feedback-info)',
    dot: 'var(--feedback-info)'
  },
  brand: {
    bg: 'var(--tenant-accent-surface)',
    fg: 'var(--tenant-accent)',
    dot: 'var(--tenant-accent)'
  }
};

/** Badge de status — cor com significado fixo + ponto (cor nunca é o único canal). */
function StatusBadge({
  tone = 'neutral',
  children,
  dot = true,
  style
}) {
  const t = statusTones[tone] || statusTones.neutral;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '2px 10px',
      borderRadius: 'var(--radius-full)',
      background: t.bg,
      color: t.fg,
      fontSize: 'var(--type-caption-size)',
      fontWeight: 'var(--weight-medium)',
      lineHeight: '16px',
      whiteSpace: 'nowrap',
      ...style
    }
  }, dot && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 6,
      height: 6,
      borderRadius: 'var(--radius-full)',
      background: t.dot
    }
  }), children);
}
Object.assign(__ds_scope, { StatusBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/StatusBadge.jsx", error: String((e && e.message) || e) }); }

// components/business/PersonCard.jsx
try { (() => {
/** Card de pessoa — a representação canônica de um humano nos produtos AION, em três densidades. */
function PersonCard({
  name,
  role,
  status,
  statusTone = 'neutral',
  meta,
  density = 'default',
  onClick,
  actions,
  style
}) {
  const compact = density === 'compact';
  const rich = density === 'rich';
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      display: 'flex',
      alignItems: rich ? 'flex-start' : 'center',
      gap: 'var(--space-3)',
      padding: compact ? 'var(--space-2) var(--space-3)' : 'var(--space-4)',
      background: 'var(--surface-default)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      cursor: onClick ? 'pointer' : undefined,
      transition: 'background var(--duration-instant) var(--ease-standard)',
      ...style
    },
    onMouseEnter: e => {
      if (onClick) e.currentTarget.style.background = 'var(--surface-hover)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = 'var(--surface-default)';
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
    name: name,
    size: compact ? 'sm' : rich ? 'lg' : 'md'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-body-size)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-strong)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, name), status && /*#__PURE__*/React.createElement(__ds_scope.StatusBadge, {
    tone: statusTone
  }, status)), role && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-support-size)',
      color: 'var(--text-muted)'
    }
  }, role), rich && meta && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-4)',
      marginTop: 'var(--space-2)',
      fontSize: 'var(--type-caption-size)',
      color: 'var(--text-subtle)',
      flexWrap: 'wrap'
    }
  }, meta.map((m, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      fontVariantNumeric: 'tabular-nums'
    }
  }, m)))), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      flexShrink: 0
    },
    onClick: e => e.stopPropagation()
  }, actions));
}
Object.assign(__ds_scope, { PersonCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/business/PersonCard.jsx", error: String((e && e.message) || e) }); }

// components/display/Tooltip.jsx
try { (() => {
/** Tooltip — complemento breve; se o design precisa dele para ser compreendido, o design falhou. */
function Tooltip({
  content,
  position = 'top',
  children
}) {
  const [show, setShow] = React.useState(false);
  const pos = {
    top: {
      bottom: '100%',
      left: '50%',
      transform: 'translate(-50%, -6px)'
    },
    bottom: {
      top: '100%',
      left: '50%',
      transform: 'translate(-50%, 6px)'
    },
    right: {
      left: '100%',
      top: '50%',
      transform: 'translate(6px, -50%)'
    },
    left: {
      right: '100%',
      top: '50%',
      transform: 'translate(-6px, -50%)'
    }
  }[position];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex'
    },
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false),
    onFocus: () => setShow(true),
    onBlur: () => setShow(false)
  }, children, show && /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: 'absolute',
      zIndex: 40,
      ...pos,
      background: 'var(--surface-inverse)',
      color: 'var(--text-inverse)',
      fontSize: 'var(--type-caption-size)',
      lineHeight: '16px',
      fontFamily: 'var(--font-sans)',
      padding: '4px 8px',
      borderRadius: 'var(--radius-md)',
      whiteSpace: 'nowrap',
      boxShadow: 'var(--elevation-floating)'
    }
  }, content));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ProgressBar.jsx
try { (() => {
/** Barra de progresso — determinada, com rótulo e valor visíveis. */
function ProgressBar({
  value = 0,
  max = 100,
  label,
  showValue = true,
  tone = 'brand',
  style
}) {
  const pct = Math.max(0, Math.min(100, value / max * 100));
  const color = tone === 'success' ? 'var(--feedback-success)' : tone === 'danger' ? 'var(--feedback-danger)' : tone === 'warning' ? 'var(--feedback-warning)' : 'var(--action-primary)';
  return /*#__PURE__*/React.createElement("div", {
    style: style
  }, (label || showValue) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      marginBottom: 'var(--space-1)',
      fontSize: 'var(--type-support-size)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-body)'
    }
  }, label), showValue && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, Math.round(pct), "%")), /*#__PURE__*/React.createElement("div", {
    role: "progressbar",
    "aria-valuenow": value,
    "aria-valuemin": 0,
    "aria-valuemax": max,
    "aria-label": label,
    style: {
      height: 6,
      borderRadius: 'var(--radius-full)',
      background: 'var(--surface-sunken)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${pct}%`,
      height: '100%',
      borderRadius: 'var(--radius-full)',
      background: color,
      transition: 'width var(--duration-base) var(--ease-standard)'
    }
  })));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Skeleton.jsx
try { (() => {
/** Skeleton — a espera parece preparação, não bloqueio. Usar onde a estrutura da tela é conhecida. */
function Skeleton({
  width = '100%',
  height = 16,
  circle = false,
  lines = 1,
  style
}) {
  const bar = (w, key) => /*#__PURE__*/React.createElement("span", {
    key: key,
    "aria-hidden": "true",
    style: {
      display: 'block',
      width: w,
      height,
      borderRadius: circle ? 'var(--radius-full)' : 'var(--radius-sm)',
      background: 'linear-gradient(90deg, var(--surface-sunken) 25%, var(--surface-hover) 50%, var(--surface-sunken) 75%)',
      backgroundSize: '200% 100%',
      animation: 'adl-shimmer 1.4s ease infinite',
      ...style
    }
  });
  return /*#__PURE__*/React.createElement("span", {
    role: "status",
    "aria-label": "Carregando",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes adl-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }'), Array.from({
    length: lines
  }, (_, i) => bar(circle ? height : i === lines - 1 && lines > 1 ? '60%' : width, i)));
}
Object.assign(__ds_scope, { Skeleton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Skeleton.jsx", error: String((e && e.message) || e) }); }

// components/foundation/Card.jsx
try { (() => {
/** Cartão/seção: fundo default, borda sutil 1px, raio 8px. */
function Card({
  title,
  actions,
  children,
  padding = 'var(--space-6)',
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: 'var(--surface-default)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--elevation-raised)',
      ...style
    }
  }, (title || actions) && /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      padding: `var(--space-4) ${padding} 0`
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 'var(--type-subtitle-size)',
      lineHeight: 'var(--type-subtitle-line)',
      fontWeight: 'var(--type-subtitle-weight)',
      color: 'var(--text-strong)'
    }
  }, title), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)'
    }
  }, actions)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding
    }
  }, children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/foundation/Card.jsx", error: String((e && e.message) || e) }); }

// components/foundation/Divider.jsx
try { (() => {
/** Divisor horizontal sutil — usar apenas quando o espaço não basta. */
function Divider({
  spacing = 'var(--space-4)',
  vertical = false,
  style
}) {
  if (vertical) {
    return /*#__PURE__*/React.createElement("span", {
      role: "separator",
      "aria-orientation": "vertical",
      style: {
        alignSelf: 'stretch',
        width: 1,
        background: 'var(--border-subtle)',
        margin: `0 ${spacing}`,
        ...style
      }
    });
  }
  return /*#__PURE__*/React.createElement("hr", {
    style: {
      border: 'none',
      borderTop: '1px solid var(--border-subtle)',
      margin: `${spacing} 0`,
      ...style
    }
  });
}
Object.assign(__ds_scope, { Divider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/foundation/Divider.jsx", error: String((e && e.message) || e) }); }

// components/foundation/Icon.jsx
try { (() => {
const cache = {};
const LUCIDE_BASE = 'https://unpkg.com/lucide-static@0.462.0/icons/';

/** Ícone Lucide — família única do ADL. Busca o SVG do CDN e herda currentColor. */
function Icon({
  name,
  size = 16,
  label,
  style
}) {
  const [svg, setSvg] = React.useState(cache[name] || null);
  React.useEffect(() => {
    let alive = true;
    if (!name) return;
    if (cache[name]) {
      setSvg(cache[name]);
      return;
    }
    fetch(LUCIDE_BASE + name + '.svg').then(r => r.ok ? r.text() : Promise.reject()).then(text => {
      // extrai o conteúdo interno do <svg>
      const inner = text.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
      cache[name] = inner;
      if (alive) setSvg(inner);
    }).catch(() => {});
    return () => {
      alive = false;
    };
  }, [name]);
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    role: label ? 'img' : 'presentation',
    "aria-label": label,
    "aria-hidden": label ? undefined : true,
    style: {
      flexShrink: 0,
      verticalAlign: 'middle',
      ...style
    },
    dangerouslySetInnerHTML: svg ? {
      __html: svg
    } : undefined
  });
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/foundation/Icon.jsx", error: String((e && e.message) || e) }); }

// components/actions/ActionMenu.jsx
try { (() => {
/** Menu de ações — ações secundárias/contextuais atrás de um gatilho "…". */
function ActionMenu({
  items = [],
  label = 'Mais ações',
  icon = 'ellipsis',
  compact = false
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const close = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    const esc = e => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    style: {
      position: 'relative',
      display: 'inline-block'
    }
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": label,
    "aria-haspopup": "menu",
    "aria-expanded": open,
    onClick: () => setOpen(o => !o),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: compact ? 'var(--control-height-compact)' : 'var(--control-height)',
      height: compact ? 'var(--control-height-compact)' : 'var(--control-height)',
      border: '1px solid transparent',
      borderRadius: 'var(--radius-md)',
      background: open ? 'var(--surface-pressed)' : 'transparent',
      color: 'var(--text-muted)',
      cursor: 'pointer',
      transition: 'background var(--duration-instant) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16
  })), open && /*#__PURE__*/React.createElement("div", {
    role: "menu",
    style: {
      position: 'absolute',
      right: 0,
      top: 'calc(100% + 4px)',
      zIndex: 30,
      minWidth: 180,
      background: 'var(--surface-default)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--elevation-floating)',
      padding: 'var(--space-1)'
    }
  }, items.map((item, i) => item === '-' ? /*#__PURE__*/React.createElement("hr", {
    key: i,
    style: {
      border: 'none',
      borderTop: '1px solid var(--border-subtle)',
      margin: 'var(--space-1) 0'
    }
  }) : /*#__PURE__*/React.createElement("button", {
    key: item.label,
    role: "menuitem",
    onClick: () => {
      setOpen(false);
      item.onSelect && item.onSelect();
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      width: '100%',
      padding: '7px var(--space-3)',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      background: 'transparent',
      color: item.destructive ? 'var(--feedback-danger)' : 'var(--text-body)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-body-size)',
      textAlign: 'left',
      cursor: 'pointer'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'var(--surface-hover)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent'
  }, item.icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: item.icon,
    size: 16
  }), item.label))));
}
Object.assign(__ds_scope, { ActionMenu });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/ActionMenu.jsx", error: String((e && e.message) || e) }); }

// components/actions/Button.jsx
try { (() => {
const btnVariants = {
  primary: {
    background: 'var(--action-primary)',
    color: 'var(--text-on-brand)',
    border: '1px solid transparent',
    hover: 'var(--action-primary-hover)',
    pressed: 'var(--action-primary-pressed)'
  },
  secondary: {
    background: 'var(--surface-default)',
    color: 'var(--text-body)',
    border: '1px solid var(--action-secondary-border)',
    hover: 'var(--action-secondary-hover)',
    pressed: 'var(--surface-pressed)'
  },
  subtle: {
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid transparent',
    hover: 'var(--surface-hover)',
    pressed: 'var(--surface-pressed)'
  },
  destructive: {
    background: 'var(--action-destructive)',
    color: 'var(--text-on-brand)',
    border: '1px solid transparent',
    hover: 'var(--action-destructive-hover)',
    pressed: 'var(--action-destructive-hover)'
  }
};

/** Botão ADL — o rótulo diz o que ele faz ("Publicar vaga", nunca "OK"). */
function Button({
  variant = 'primary',
  size = 'default',
  icon,
  loading = false,
  disabled = false,
  children,
  onClick,
  type = 'button',
  style
}) {
  const [state, setState] = React.useState('rest');
  const v = btnVariants[variant] || btnVariants.primary;
  const compact = size === 'compact';
  const isDisabled = disabled || loading;
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    disabled: isDisabled,
    onClick: onClick,
    onMouseEnter: () => setState('hover'),
    onMouseLeave: () => setState('rest'),
    onMouseDown: () => setState('pressed'),
    onMouseUp: () => setState('hover'),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-2)',
      height: compact ? 'var(--control-height-compact)' : 'var(--control-height)',
      padding: compact ? '0 var(--space-3)' : '0 var(--space-4)',
      borderRadius: 'var(--radius-md)',
      fontFamily: 'var(--font-sans)',
      fontSize: compact ? 'var(--type-support-size)' : 'var(--type-body-size)',
      fontWeight: 'var(--weight-medium)',
      whiteSpace: 'nowrap',
      border: v.border,
      background: isDisabled ? v.background : state === 'pressed' ? v.pressed : state === 'hover' ? v.hover : v.background,
      color: v.color,
      opacity: isDisabled ? 0.45 : 1,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      transition: 'background var(--duration-instant) var(--ease-standard)',
      ...style
    }
  }, loading ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "loader-circle",
    size: compact ? 14 : 16,
    style: {
      animation: 'adl-spin 0.9s linear infinite'
    }
  }) : icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: compact ? 14 : 16
  }), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Button.jsx", error: String((e && e.message) || e) }); }

// components/display/Stat.jsx
try { (() => {
/** KPI/estatística — valor com algarismos tabulares, variação e período (sempre com contexto). */
function Stat({
  label,
  value,
  delta,
  deltaDirection,
  period,
  style
}) {
  const dir = deltaDirection || (typeof delta === 'string' && delta.trim().startsWith('-') ? 'down' : 'up');
  const good = dir === 'up';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-1)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-support-size)',
      color: 'var(--text-muted)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 24,
      lineHeight: '32px',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--text-strong)',
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: '-0.01em'
    }
  }, value), (delta || period) && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-1)',
      fontSize: 'var(--type-caption-size)'
    }
  }, delta && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 2,
      color: good ? 'var(--feedback-success)' : 'var(--feedback-danger)',
      fontWeight: 'var(--weight-medium)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: dir === 'up' ? 'arrow-up-right' : 'arrow-down-right',
    size: 12
  }), delta), period && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-subtle)'
    }
  }, period)));
}
Object.assign(__ds_scope, { Stat });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Stat.jsx", error: String((e && e.message) || e) }); }

// components/business/KpiCard.jsx
try { (() => {
/** Card de KPI de RH — valor com variação e período, em cartão. */
function KpiCard({
  label,
  value,
  delta,
  deltaDirection,
  period,
  footer,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-default)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-5)',
      boxShadow: 'var(--elevation-raised)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Stat, {
    label: label,
    value: value,
    delta: delta,
    deltaDirection: deltaDirection,
    period: period
  }), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-caption-size)',
      color: 'var(--text-subtle)',
      borderTop: '1px solid var(--border-subtle)',
      paddingTop: 'var(--space-2)',
      marginTop: 'auto'
    }
  }, footer));
}
Object.assign(__ds_scope, { KpiCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/business/KpiCard.jsx", error: String((e && e.message) || e) }); }

// components/display/Tag.jsx
try { (() => {
/** Tag — rotulagem removível de conteúdo (habilidades, filtros ativos). Sem significado de estado. */
function Tag({
  children,
  onRemove,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--surface-sunken)',
      border: '1px solid var(--border-subtle)',
      color: 'var(--text-muted)',
      fontSize: 'var(--type-caption-size)',
      lineHeight: '16px',
      whiteSpace: 'nowrap',
      ...style
    }
  }, children, onRemove && /*#__PURE__*/React.createElement("button", {
    onClick: onRemove,
    "aria-label": `Remover ${typeof children === 'string' ? children : ''}`,
    style: {
      display: 'inline-flex',
      border: 'none',
      background: 'none',
      padding: 0,
      margin: 0,
      color: 'var(--text-subtle)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 12
  })));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Alert.jsx
try { (() => {
const alertTones = {
  info: {
    icon: 'info',
    fg: 'var(--feedback-info)',
    bg: 'var(--feedback-info-surface)',
    border: 'var(--feedback-info-border)'
  },
  success: {
    icon: 'circle-check',
    fg: 'var(--feedback-success)',
    bg: 'var(--feedback-success-surface)',
    border: 'var(--feedback-success-border)'
  },
  warning: {
    icon: 'triangle-alert',
    fg: 'var(--feedback-warning)',
    bg: 'var(--feedback-warning-surface)',
    border: 'var(--feedback-warning-border)'
  },
  danger: {
    icon: 'circle-alert',
    fg: 'var(--feedback-danger)',
    bg: 'var(--feedback-danger-surface)',
    border: 'var(--feedback-danger-border)'
  }
};

/** Alerta embutido — o que houve + o que fazer, no contexto da tela. */
function Alert({
  tone = 'info',
  title,
  children,
  action,
  onDismiss,
  style
}) {
  const t = alertTones[tone] || alertTones.info;
  return /*#__PURE__*/React.createElement("div", {
    role: tone === 'danger' ? 'alert' : 'status',
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      alignItems: 'flex-start',
      padding: 'var(--space-3) var(--space-4)',
      background: t.bg,
      border: `1px solid ${t.border}`,
      borderRadius: 'var(--radius-lg)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: t.fg,
      display: 'inline-flex',
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: t.icon,
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-body-size)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-strong)'
    }
  }, title), children && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-support-size)',
      color: 'var(--text-muted)',
      marginTop: title ? 2 : 0
    }
  }, children), action && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-2)'
    }
  }, action)), onDismiss && /*#__PURE__*/React.createElement("button", {
    onClick: onDismiss,
    "aria-label": "Dispensar aviso",
    style: {
      border: 'none',
      background: 'none',
      padding: 2,
      color: 'var(--text-subtle)',
      cursor: 'pointer',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 14
  })));
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Alert.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EmptyState.jsx
try { (() => {
/** Estado vazio que ensina: o que é, por que está vazio, qual o próximo passo. */
function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      gap: 'var(--space-2)',
      padding: 'var(--space-10) var(--space-6)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      borderRadius: 'var(--radius-full)',
      background: 'var(--surface-sunken)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-subtle)',
      marginBottom: 'var(--space-1)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-body-size)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-strong)'
    }
  }, title), description && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--type-support-size)',
      color: 'var(--text-muted)',
      maxWidth: 360
    }
  }, description), action && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-3)'
    }
  }, action));
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
const toastTones = {
  success: {
    icon: 'circle-check',
    color: 'var(--feedback-success)'
  },
  danger: {
    icon: 'circle-alert',
    color: 'var(--feedback-danger)'
  },
  info: {
    icon: 'info',
    color: 'var(--feedback-info)'
  }
};

/** Toast — confirmação passageira de ação concluída; nunca para erros que exigem decisão. */
function Toast({
  tone = 'success',
  message,
  actionLabel,
  onAction,
  onDismiss,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "status",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-3) var(--space-4)',
      background: 'var(--surface-inverse)',
      color: 'var(--text-inverse)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--elevation-overlay)',
      fontSize: 'var(--type-support-size)',
      maxWidth: 420,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: (toastTones[tone] || toastTones.info).color,
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: (toastTones[tone] || toastTones.info).icon,
    size: 16
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, message), actionLabel && /*#__PURE__*/React.createElement("button", {
    onClick: onAction,
    style: {
      border: 'none',
      background: 'none',
      color: 'var(--brand-300)',
      fontWeight: 'var(--weight-medium)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-support-size)',
      cursor: 'pointer',
      padding: 0,
      whiteSpace: 'nowrap'
    }
  }, actionLabel), onDismiss && /*#__PURE__*/React.createElement("button", {
    onClick: onDismiss,
    "aria-label": "Fechar notifica\xE7\xE3o",
    style: {
      border: 'none',
      background: 'none',
      padding: 2,
      color: 'var(--neutral-400)',
      cursor: 'pointer',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 14
  })));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/foundation/AppShell.jsx
try { (() => {
/** Estrutura-mestre de aplicação AION: nav lateral fixa + cabeçalho de contexto + área de trabalho. */
function AppShell({
  product = 'SelX',
  tenant,
  nav = [],
  activeItem,
  onNavigate,
  headerContent,
  user,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--surface-page)'
    }
  }, /*#__PURE__*/React.createElement("nav", {
    "aria-label": "Navega\xE7\xE3o principal",
    style: {
      width: 'var(--sidebar-width)',
      flexShrink: 0,
      background: 'var(--surface-default)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
      height: '100vh'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 'var(--header-height)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      padding: '0 var(--space-4)',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 'var(--weight-semibold)',
      fontSize: 16,
      color: 'var(--text-strong)',
      letterSpacing: '-0.01em'
    }
  }, product), tenant && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-caption-size)',
      color: 'var(--text-subtle)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-full)',
      padding: '1px 8px'
    }
  }, tenant)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: 'var(--space-3) var(--space-2)',
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, nav.map(item => item.section ? /*#__PURE__*/React.createElement("div", {
    key: item.section,
    style: {
      padding: 'var(--space-4) var(--space-3) var(--space-1)',
      fontSize: 'var(--type-caption-size)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-subtle)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em'
    }
  }, item.section) : /*#__PURE__*/React.createElement("button", {
    key: item.id,
    onClick: () => onNavigate && onNavigate(item.id),
    "aria-current": activeItem === item.id ? 'page' : undefined,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      width: '100%',
      padding: '7px var(--space-3)',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      background: activeItem === item.id ? 'var(--surface-selected)' : 'transparent',
      color: activeItem === item.id ? 'var(--action-primary)' : 'var(--text-muted)',
      fontWeight: activeItem === item.id ? 'var(--weight-medium)' : 'var(--weight-regular)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-body-size)',
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'background var(--duration-instant) var(--ease-standard)'
    }
  }, item.icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: item.icon,
    size: 16
  }), item.label))), user && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-3) var(--space-4)',
      borderTop: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 28,
      height: 28,
      borderRadius: 'var(--radius-full)',
      background: 'var(--brand-100)',
      color: 'var(--brand-700)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 'var(--weight-semibold)'
    }
  }, (user.name || '?').split(' ').map(p => p[0]).slice(0, 2).join('')), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-support-size)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-body)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, user.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-caption-size)',
      color: 'var(--text-subtle)'
    }
  }, user.role)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column'
    }
  }, headerContent, /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, children)));
}
Object.assign(__ds_scope, { AppShell });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/foundation/AppShell.jsx", error: String((e && e.message) || e) }); }

// components/foundation/Page.jsx
try { (() => {
/** Página: cabeçalho de contexto (título, descrição, ações) + área de conteúdo. */
function Page({
  title,
  description,
  breadcrumb,
  actions,
  children,
  maxWidth = 'var(--container-max)'
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-6) var(--space-8)',
      maxWidth,
      margin: '0 auto',
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      marginBottom: 'var(--space-6)'
    }
  }, breadcrumb, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      marginTop: breadcrumb ? 'var(--space-2)' : 0
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 'var(--type-display-size)',
      lineHeight: 'var(--type-display-line)',
      fontWeight: 'var(--type-display-weight)',
      color: 'var(--text-strong)',
      letterSpacing: '-0.01em'
    }
  }, title), description && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 'var(--space-1) 0 0',
      color: 'var(--text-muted)',
      maxWidth: 'var(--measure-reading)'
    }
  }, description)), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      flexShrink: 0
    }
  }, actions))), children);
}
Object.assign(__ds_scope, { Page });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/foundation/Page.jsx", error: String((e && e.message) || e) }); }

// components/inputs/fieldBase.jsx
try { (() => {
/* Base compartilhada dos campos de formulário ADL (não é componente público). */

function fieldLabel(label, htmlFor, required) {
  if (!label) return null;
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: htmlFor,
    style: {
      display: 'block',
      fontSize: 'var(--type-support-size)',
      lineHeight: 'var(--type-support-line)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-body)',
      marginBottom: 'var(--space-1)'
    }
  }, label, required && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: 'var(--feedback-danger)'
    }
  }, " *"));
}
function fieldHelp(error, help, id) {
  if (error) return /*#__PURE__*/React.createElement("p", {
    id: id,
    role: "alert",
    style: {
      margin: 'var(--space-1) 0 0',
      fontSize: 'var(--type-caption-size)',
      lineHeight: 'var(--type-caption-line, 16px)',
      color: 'var(--feedback-danger)'
    }
  }, error);
  if (help) return /*#__PURE__*/React.createElement("p", {
    id: id,
    style: {
      margin: 'var(--space-1) 0 0',
      fontSize: 'var(--type-caption-size)',
      color: 'var(--text-subtle)'
    }
  }, help);
  return null;
}
function controlStyle({
  error,
  disabled,
  compact,
  focus
}) {
  return {
    width: '100%',
    height: compact ? 'var(--control-height-compact)' : 'var(--control-height)',
    padding: '0 var(--space-3)',
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--type-body-size)',
    color: 'var(--text-body)',
    background: disabled ? 'var(--surface-sunken)' : 'var(--surface-default)',
    border: `1px solid ${error ? 'var(--feedback-danger)' : focus ? 'var(--border-selected)' : 'var(--border-default)'}`,
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    boxShadow: focus ? 'var(--focus-ring)' : 'none',
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : undefined,
    transition: 'border-color var(--duration-instant) var(--ease-standard)',
    boxSizing: 'border-box'
  };
}
let fieldSeq = 0;
function useFieldId(id) {
  const [auto] = React.useState(() => `adl-field-${++fieldSeq}`);
  return id || auto;
}
Object.assign(__ds_scope, { fieldLabel, fieldHelp, controlStyle, useFieldId });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/inputs/fieldBase.jsx", error: String((e && e.message) || e) }); }

// components/inputs/Checkbox.jsx
try { (() => {
/** Checkbox — seleção múltipla ou aceite individual. */
function Checkbox({
  label,
  checked,
  defaultChecked,
  onChange,
  disabled,
  indeterminate,
  help,
  id,
  style
}) {
  const fid = __ds_scope.useFieldId(id);
  const [internal, setInternal] = React.useState(defaultChecked || false);
  const isChecked = checked !== undefined ? checked : internal;
  const toggle = e => {
    if (checked === undefined) setInternal(e.target.checked);
    onChange && onChange(e.target.checked, e);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: style
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: fid,
    style: {
      display: 'inline-flex',
      alignItems: 'flex-start',
      gap: 'var(--space-2)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex',
      marginTop: 3
    }
  }, /*#__PURE__*/React.createElement("input", {
    id: fid,
    type: "checkbox",
    checked: isChecked,
    disabled: disabled,
    onChange: toggle,
    style: {
      position: 'absolute',
      inset: 0,
      opacity: 0,
      margin: 0,
      cursor: 'inherit'
    }
  }), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 16,
      height: 16,
      borderRadius: 'var(--radius-sm)',
      border: `1px solid ${isChecked || indeterminate ? 'var(--action-primary)' : 'var(--border-default)'}`,
      background: isChecked || indeterminate ? 'var(--action-primary)' : 'var(--surface-default)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--text-on-brand)',
      transition: 'background var(--duration-instant) var(--ease-standard)'
    }
  }, indeterminate ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "minus",
    size: 12
  }) : isChecked ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 12
  }) : null)), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-body-size)',
      color: 'var(--text-body)'
    }
  }, label), help && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 'var(--type-caption-size)',
      color: 'var(--text-subtle)'
    }
  }, help))));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/inputs/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/display/DataTable.jsx
try { (() => {
/** Tabela de dados — o componente mais crítico da família AION.
 * Densidade compacta por padrão de tela; algarismos tabulares; seleção em lote; ordenação. */
function DataTable({
  columns = [],
  rows = [],
  compact = false,
  selectable = false,
  onRowClick,
  sortKey,
  sortDir,
  onSort,
  rowKey = 'id',
  selected,
  onSelectionChange,
  emptyState
}) {
  const [internalSel, setInternalSel] = React.useState([]);
  const sel = selected !== undefined ? selected : internalSel;
  const setSel = v => {
    if (selected === undefined) setInternalSel(v);
    onSelectionChange && onSelectionChange(v);
  };
  const keyOf = (row, i) => row[rowKey] !== undefined ? row[rowKey] : i;
  const allSelected = rows.length > 0 && sel.length === rows.length;
  const rowH = compact ? 'var(--row-height-compact)' : 'var(--row-height)';
  const cellPad = compact ? '0 var(--space-3)' : '0 var(--space-4)';
  const thStyle = col => ({
    height: rowH,
    padding: cellPad,
    textAlign: col.align || 'left',
    fontSize: 'var(--type-caption-size)',
    fontWeight: 'var(--weight-medium)',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--border-default)',
    background: 'var(--surface-default)',
    position: 'sticky',
    top: 0,
    cursor: col.sortable ? 'pointer' : undefined,
    userSelect: 'none'
  });
  return /*#__PURE__*/React.createElement("div", {
    style: {
      overflow: 'auto',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--surface-default)'
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: compact ? 'var(--type-data-size)' : 'var(--type-body-size)'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, selectable && /*#__PURE__*/React.createElement("th", {
    style: {
      ...thStyle({}),
      width: 40,
      padding: '0 0 0 var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Checkbox, {
    checked: allSelected,
    indeterminate: sel.length > 0 && !allSelected,
    onChange: c => setSel(c ? rows.map(keyOf) : []),
    label: ""
  })), columns.map(col => /*#__PURE__*/React.createElement("th", {
    key: col.key,
    style: thStyle(col),
    "aria-sort": sortKey === col.key ? sortDir === 'desc' ? 'descending' : 'ascending' : undefined,
    onClick: col.sortable && onSort ? () => onSort(col.key, sortKey === col.key && sortDir === 'asc' ? 'desc' : 'asc') : undefined
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4
    }
  }, col.label, col.sortable && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: sortKey === col.key ? sortDir === 'desc' ? 'arrow-down' : 'arrow-up' : 'chevrons-up-down',
    size: 12,
    style: {
      opacity: sortKey === col.key ? 1 : 0.5
    }
  })))))), /*#__PURE__*/React.createElement("tbody", null, rows.length === 0 && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: columns.length + (selectable ? 1 : 0),
    style: {
      padding: 'var(--space-8)'
    }
  }, emptyState || /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-subtle)'
    }
  }, "Nenhum registro."))), rows.map((row, i) => {
    const k = keyOf(row, i);
    const isSel = sel.includes(k);
    return /*#__PURE__*/React.createElement("tr", {
      key: k,
      onClick: onRowClick ? () => onRowClick(row) : undefined,
      style: {
        cursor: onRowClick ? 'pointer' : undefined,
        background: isSel ? 'var(--surface-selected)' : 'transparent',
        transition: 'background var(--duration-instant) var(--ease-standard)'
      },
      onMouseEnter: e => {
        if (!isSel) e.currentTarget.style.background = 'var(--surface-hover)';
      },
      onMouseLeave: e => {
        if (!isSel) e.currentTarget.style.background = 'transparent';
      }
    }, selectable && /*#__PURE__*/React.createElement("td", {
      style: {
        height: rowH,
        padding: '0 0 0 var(--space-4)',
        borderBottom: '1px solid var(--border-subtle)'
      },
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement(__ds_scope.Checkbox, {
      checked: isSel,
      onChange: c => setSel(c ? [...sel, k] : sel.filter(s => s !== k)),
      label: ""
    })), columns.map(col => /*#__PURE__*/React.createElement("td", {
      key: col.key,
      className: col.numeric ? 'numeric' : undefined,
      style: {
        height: rowH,
        padding: cellPad,
        textAlign: col.align || (col.numeric ? 'right' : 'left'),
        borderBottom: '1px solid var(--border-subtle)',
        color: 'var(--text-body)',
        whiteSpace: 'nowrap',
        fontVariantNumeric: col.numeric ? 'tabular-nums' : undefined
      }
    }, col.render ? col.render(row) : row[col.key])));
  }))));
}
Object.assign(__ds_scope, { DataTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/DataTable.jsx", error: String((e && e.message) || e) }); }

// components/inputs/Combobox.jsx
try { (() => {
/** Combobox com busca — escolha única em lista longa, filtrada por digitação. */
function Combobox({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Buscar…',
  help,
  error,
  required,
  disabled,
  compact,
  emptyText = 'Nenhum resultado para esta busca.',
  id,
  style
}) {
  const [focus, setFocus] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [active, setActive] = React.useState(0);
  const fid = __ds_scope.useFieldId(id);
  const ref = React.useRef(null);
  const norm = s => (s || '').toLowerCase();
  const opts = options.map(o => typeof o === 'string' ? {
    value: o,
    label: o
  } : o);
  const filtered = query ? opts.filter(o => norm(o.label).includes(norm(query))) : opts;
  const selected = opts.find(o => o.value === value);
  React.useEffect(() => {
    if (!open) return;
    const close = e => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const pick = o => {
    onChange && onChange(o.value);
    setOpen(false);
    setQuery('');
  };
  const onKey = e => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive(a => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(a => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && open && filtered[active]) {
      e.preventDefault();
      pick(filtered[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    style: {
      position: 'relative',
      ...style
    }
  }, __ds_scope.fieldLabel(label, fid, required), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("input", {
    id: fid,
    role: "combobox",
    "aria-expanded": open,
    "aria-autocomplete": "list",
    value: open ? query : selected ? selected.label : '',
    placeholder: selected ? selected.label : placeholder,
    disabled: disabled,
    "aria-invalid": error ? true : undefined,
    onChange: e => {
      setQuery(e.target.value);
      setOpen(true);
      setActive(0);
    },
    onFocus: () => {
      setFocus(true);
      setOpen(true);
    },
    onBlur: () => setFocus(false),
    onKeyDown: onKey,
    style: {
      ...__ds_scope.controlStyle({
        error,
        disabled,
        compact,
        focus
      }),
      paddingRight: 32
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 10,
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      color: 'var(--text-subtle)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: open ? 'search' : 'chevrons-up-down',
    size: 16
  }))), open && !disabled && /*#__PURE__*/React.createElement("div", {
    role: "listbox",
    style: {
      position: 'absolute',
      zIndex: 30,
      left: 0,
      right: 0,
      top: '100%',
      marginTop: 4,
      maxHeight: 240,
      overflowY: 'auto',
      background: 'var(--surface-default)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--elevation-floating)',
      padding: 'var(--space-1)'
    }
  }, filtered.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-3)',
      color: 'var(--text-subtle)',
      fontSize: 'var(--type-support-size)'
    }
  }, emptyText), filtered.map((o, i) => /*#__PURE__*/React.createElement("div", {
    key: o.value,
    role: "option",
    "aria-selected": o.value === value,
    onMouseDown: e => {
      e.preventDefault();
      pick(o);
    },
    onMouseEnter: () => setActive(i),
    style: {
      padding: '7px var(--space-3)',
      borderRadius: 'var(--radius-md)',
      cursor: 'pointer',
      background: i === active ? 'var(--surface-hover)' : o.value === value ? 'var(--surface-selected)' : 'transparent',
      fontSize: 'var(--type-body-size)',
      color: 'var(--text-body)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, o.label, o.value === value && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "check",
    size: 14,
    style: {
      color: 'var(--action-primary)'
    }
  })))), __ds_scope.fieldHelp(error, help, fid + '-help'));
}
Object.assign(__ds_scope, { Combobox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/inputs/Combobox.jsx", error: String((e && e.message) || e) }); }

// components/inputs/DateField.jsx
try { (() => {
/** Campo de data — padrão brasileiro (dd/mm/aaaa), input nativo. */
function DateField({
  label,
  value,
  defaultValue,
  onChange,
  help,
  error,
  required,
  disabled,
  compact,
  min,
  max,
  id,
  style
}) {
  const [focus, setFocus] = React.useState(false);
  const fid = __ds_scope.useFieldId(id);
  return /*#__PURE__*/React.createElement("div", {
    style: style
  }, __ds_scope.fieldLabel(label, fid, required), /*#__PURE__*/React.createElement("input", {
    id: fid,
    type: "date",
    value: value,
    defaultValue: defaultValue,
    min: min,
    max: max,
    required: required,
    disabled: disabled,
    lang: "pt-BR",
    "aria-invalid": error ? true : undefined,
    onChange: e => onChange && onChange(e.target.value, e),
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      ...__ds_scope.controlStyle({
        error,
        disabled,
        compact,
        focus
      }),
      fontVariantNumeric: 'tabular-nums'
    }
  }), __ds_scope.fieldHelp(error, help, fid + '-help'));
}
Object.assign(__ds_scope, { DateField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/inputs/DateField.jsx", error: String((e && e.message) || e) }); }

// components/inputs/FileUpload.jsx
try { (() => {
/** Upload de arquivo — área de soltar + botão, com lista dos arquivos escolhidos. */
function FileUpload({
  label,
  accept,
  multiple,
  onChange,
  help,
  error,
  disabled,
  hint = 'Arraste arquivos ou clique para escolher',
  id,
  style
}) {
  const fid = __ds_scope.useFieldId(id);
  const [files, setFiles] = React.useState([]);
  const [over, setOver] = React.useState(false);
  const inputRef = React.useRef(null);
  const setList = list => {
    const arr = Array.from(list || []);
    setFiles(arr);
    onChange && onChange(arr);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: style
  }, __ds_scope.fieldLabel(label, fid), /*#__PURE__*/React.createElement("div", {
    onDragOver: e => {
      e.preventDefault();
      if (!disabled) setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: e => {
      e.preventDefault();
      setOver(false);
      if (!disabled) setList(e.dataTransfer.files);
    },
    onClick: () => !disabled && inputRef.current && inputRef.current.click(),
    style: {
      border: `1px dashed ${over ? 'var(--border-selected)' : error ? 'var(--feedback-danger)' : 'var(--border-default)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-6)',
      background: over ? 'var(--surface-selected)' : 'var(--surface-default)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--space-2)',
      color: 'var(--text-muted)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      transition: 'border-color var(--duration-instant) var(--ease-standard)',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "upload",
    size: 20
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-support-size)'
    }
  }, hint), /*#__PURE__*/React.createElement("input", {
    ref: inputRef,
    id: fid,
    type: "file",
    accept: accept,
    multiple: multiple,
    disabled: disabled,
    onChange: e => setList(e.target.files),
    style: {
      display: 'none'
    }
  })), files.length > 0 && /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 'var(--space-2) 0 0',
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-1)'
    }
  }, files.map(f => /*#__PURE__*/React.createElement("li", {
    key: f.name,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      fontSize: 'var(--type-support-size)',
      color: 'var(--text-body)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "file-text",
    size: 14,
    style: {
      color: 'var(--text-subtle)'
    }
  }), f.name, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-subtle)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, (f.size / 1024).toFixed(0), " KB")))), __ds_scope.fieldHelp(error, help, fid + '-help'));
}
Object.assign(__ds_scope, { FileUpload });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/inputs/FileUpload.jsx", error: String((e && e.message) || e) }); }

// components/inputs/Radio.jsx
try { (() => {
/** Grupo de radio — escolha única entre poucas opções visíveis. */
function Radio({
  label,
  options = [],
  value,
  defaultValue,
  onChange,
  disabled,
  name,
  style
}) {
  const fid = __ds_scope.useFieldId(name);
  const [internal, setInternal] = React.useState(defaultValue);
  const current = value !== undefined ? value : internal;
  const pick = v => {
    if (value === undefined) setInternal(v);
    onChange && onChange(v);
  };
  return /*#__PURE__*/React.createElement("fieldset", {
    style: {
      border: 'none',
      margin: 0,
      padding: 0,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("legend", {
    style: {
      padding: 0,
      fontSize: 'var(--type-support-size)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--text-body)',
      marginBottom: 'var(--space-2)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)'
    }
  }, options.map(o => {
    const opt = typeof o === 'string' ? {
      value: o,
      label: o
    } : o;
    const sel = current === opt.value;
    return /*#__PURE__*/React.createElement("label", {
      key: opt.value,
      style: {
        display: 'inline-flex',
        alignItems: 'flex-start',
        gap: 'var(--space-2)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'relative',
        display: 'inline-flex',
        marginTop: 3
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "radio",
      name: fid,
      value: opt.value,
      checked: sel,
      disabled: disabled,
      onChange: () => pick(opt.value),
      style: {
        position: 'absolute',
        inset: 0,
        opacity: 0,
        margin: 0,
        cursor: 'inherit'
      }
    }), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        width: 16,
        height: 16,
        borderRadius: 'var(--radius-full)',
        border: `1px solid ${sel ? 'var(--action-primary)' : 'var(--border-default)'}`,
        background: 'var(--surface-default)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }, sel && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: 'var(--radius-full)',
        background: 'var(--action-primary)'
      }
    }))), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 'var(--type-body-size)',
        color: 'var(--text-body)'
      }
    }, opt.label), opt.help && /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 'var(--type-caption-size)',
        color: 'var(--text-subtle)'
      }
    }, opt.help)));
  })));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/inputs/Radio.jsx", error: String((e && e.message) || e) }); }

// components/inputs/Select.jsx
try { (() => {
/** Seleção — escolha única em lista curta e conhecida. Para listas longas, usar Combobox. */
function Select({
  label,
  value,
  defaultValue,
  onChange,
  options = [],
  placeholder,
  help,
  error,
  required,
  disabled,
  compact,
  id,
  style
}) {
  const [focus, setFocus] = React.useState(false);
  const fid = __ds_scope.useFieldId(id);
  return /*#__PURE__*/React.createElement("div", {
    style: style
  }, __ds_scope.fieldLabel(label, fid, required), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("select", {
    id: fid,
    value: value,
    defaultValue: defaultValue,
    required: required,
    disabled: disabled,
    "aria-invalid": error ? true : undefined,
    onChange: e => onChange && onChange(e.target.value, e),
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      ...__ds_scope.controlStyle({
        error,
        disabled,
        compact,
        focus
      }),
      appearance: 'none',
      paddingRight: 32,
      color: value ?? defaultValue ? 'var(--text-body)' : 'var(--text-subtle)'
    }
  }, placeholder && /*#__PURE__*/React.createElement("option", {
    value: ""
  }, placeholder), options.map(o => {
    const opt = typeof o === 'string' ? {
      value: o,
      label: o
    } : o;
    return /*#__PURE__*/React.createElement("option", {
      key: opt.value,
      value: opt.value
    }, opt.label);
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 10,
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      color: 'var(--text-subtle)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 16
  }))), __ds_scope.fieldHelp(error, help, fid + '-help'));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/inputs/Select.jsx", error: String((e && e.message) || e) }); }

// components/inputs/Switch.jsx
try { (() => {
/** Switch — liga/desliga com efeito imediato (sem botão salvar). */
function Switch({
  label,
  checked,
  defaultChecked,
  onChange,
  disabled,
  help,
  id,
  style
}) {
  const fid = __ds_scope.useFieldId(id);
  const [internal, setInternal] = React.useState(defaultChecked || false);
  const isOn = checked !== undefined ? checked : internal;
  const toggle = () => {
    if (disabled) return;
    const v = !isOn;
    if (checked === undefined) setInternal(v);
    onChange && onChange(v);
  };
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: fid,
    style: {
      display: 'inline-flex',
      alignItems: 'flex-start',
      gap: 'var(--space-3)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex',
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement("input", {
    id: fid,
    type: "checkbox",
    role: "switch",
    checked: isOn,
    disabled: disabled,
    onChange: toggle,
    style: {
      position: 'absolute',
      inset: 0,
      opacity: 0,
      margin: 0,
      cursor: 'inherit'
    }
  }), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 34,
      height: 20,
      borderRadius: 'var(--radius-full)',
      background: isOn ? 'var(--action-primary)' : 'var(--neutral-300)',
      display: 'inline-flex',
      alignItems: 'center',
      padding: 2,
      boxSizing: 'border-box',
      transition: 'background var(--duration-fast) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      borderRadius: 'var(--radius-full)',
      background: '#fff',
      boxShadow: 'var(--elevation-raised)',
      transform: isOn ? 'translateX(14px)' : 'translateX(0)',
      transition: 'transform var(--duration-fast) var(--ease-standard)'
    }
  }))), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-body-size)',
      color: 'var(--text-body)'
    }
  }, label), help && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 'var(--type-caption-size)',
      color: 'var(--text-subtle)'
    }
  }, help)));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/inputs/Switch.jsx", error: String((e && e.message) || e) }); }

// components/inputs/TextArea.jsx
try { (() => {
/** Área de texto — entrada multilinha. */
function TextArea({
  label,
  value,
  defaultValue,
  onChange,
  placeholder,
  rows = 4,
  help,
  error,
  required,
  disabled,
  id,
  style
}) {
  const [focus, setFocus] = React.useState(false);
  const fid = __ds_scope.useFieldId(id);
  const base = __ds_scope.controlStyle({
    error,
    disabled,
    focus
  });
  return /*#__PURE__*/React.createElement("div", {
    style: style
  }, __ds_scope.fieldLabel(label, fid, required), /*#__PURE__*/React.createElement("textarea", {
    id: fid,
    value: value,
    defaultValue: defaultValue,
    placeholder: placeholder,
    rows: rows,
    required: required,
    disabled: disabled,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error || help ? fid + '-help' : undefined,
    onChange: e => onChange && onChange(e.target.value, e),
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      ...base,
      height: 'auto',
      padding: 'var(--space-2) var(--space-3)',
      lineHeight: 'var(--type-body-line)',
      resize: 'vertical'
    }
  }), __ds_scope.fieldHelp(error, help, fid + '-help'));
}
Object.assign(__ds_scope, { TextArea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/inputs/TextArea.jsx", error: String((e && e.message) || e) }); }

// components/inputs/TextField.jsx
try { (() => {
/** Campo de texto — rótulo, ajuda, erro ("o que houve + o que fazer"). */
function TextField({
  label,
  value,
  defaultValue,
  onChange,
  placeholder,
  type = 'text',
  help,
  error,
  required,
  disabled,
  compact,
  icon,
  id,
  style
}) {
  const [focus, setFocus] = React.useState(false);
  const fid = __ds_scope.useFieldId(id);
  return /*#__PURE__*/React.createElement("div", {
    style: style
  }, __ds_scope.fieldLabel(label, fid, required), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 10,
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'var(--text-subtle)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16
  })), /*#__PURE__*/React.createElement("input", {
    id: fid,
    type: type,
    value: value,
    defaultValue: defaultValue,
    placeholder: placeholder,
    required: required,
    disabled: disabled,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error || help ? fid + '-help' : undefined,
    onChange: e => onChange && onChange(e.target.value, e),
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      ...__ds_scope.controlStyle({
        error,
        disabled,
        compact,
        focus
      }),
      paddingLeft: icon ? 34 : undefined
    }
  })), __ds_scope.fieldHelp(error, help, fid + '-help'));
}
Object.assign(__ds_scope, { TextField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/inputs/TextField.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Breadcrumb.jsx
try { (() => {
/** Breadcrumb — trilha de contexto acima do título da página. */
function Breadcrumb({
  items = [],
  style
}) {
  return /*#__PURE__*/React.createElement("nav", {
    "aria-label": "Trilha de navega\xE7\xE3o",
    style: style
  }, /*#__PURE__*/React.createElement("ol", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-1)',
      fontSize: 'var(--type-support-size)'
    }
  }, items.map((item, i) => {
    const last = i === items.length - 1;
    return /*#__PURE__*/React.createElement("li", {
      key: i,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)'
      }
    }, i > 0 && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: "chevron-right",
      size: 12,
      style: {
        color: 'var(--text-disabled)'
      }
    }), last || !item.onClick ? /*#__PURE__*/React.createElement("span", {
      "aria-current": last ? 'page' : undefined,
      style: {
        color: last ? 'var(--text-body)' : 'var(--text-subtle)'
      }
    }, item.label) : /*#__PURE__*/React.createElement("button", {
      onClick: item.onClick,
      style: {
        border: 'none',
        background: 'none',
        padding: 0,
        fontFamily: 'var(--font-sans)',
        fontSize: 'inherit',
        color: 'var(--text-subtle)',
        cursor: 'pointer'
      },
      onMouseEnter: e => e.currentTarget.style.color = 'var(--text-body)',
      onMouseLeave: e => e.currentTarget.style.color = 'var(--text-subtle)'
    }, item.label));
  })));
}
Object.assign(__ds_scope, { Breadcrumb });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Breadcrumb.jsx", error: String((e && e.message) || e) }); }

// components/navigation/GlobalSearch.jsx
try { (() => {
/** Busca global — campo de busca do cabeçalho com atalho de teclado. */
function GlobalSearch({
  placeholder = 'Buscar em tudo…',
  shortcut = 'Ctrl K',
  onSearch,
  width = 320,
  style
}) {
  const [value, setValue] = React.useState('');
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    role: "search",
    style: {
      position: 'relative',
      width,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 10,
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'var(--text-subtle)',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 15
  })), /*#__PURE__*/React.createElement("input", {
    type: "search",
    value: value,
    placeholder: placeholder,
    "aria-label": placeholder,
    onChange: e => setValue(e.target.value),
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    onKeyDown: e => {
      if (e.key === 'Enter' && onSearch) onSearch(value);
    },
    style: {
      width: '100%',
      height: 'var(--control-height)',
      boxSizing: 'border-box',
      padding: '0 64px 0 32px',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-support-size)',
      color: 'var(--text-body)',
      background: focus ? 'var(--surface-default)' : 'var(--surface-sunken)',
      border: `1px solid ${focus ? 'var(--border-selected)' : 'transparent'}`,
      borderRadius: 'var(--radius-md)',
      outline: 'none',
      boxShadow: focus ? 'var(--focus-ring)' : 'none',
      transition: 'background var(--duration-instant) var(--ease-standard)'
    }
  }), !focus && !value && /*#__PURE__*/React.createElement("kbd", {
    style: {
      position: 'absolute',
      right: 8,
      top: '50%',
      transform: 'translateY(-50%)',
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-subtle)',
      background: 'var(--surface-default)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-sm)',
      padding: '1px 6px'
    }
  }, shortcut));
}
Object.assign(__ds_scope, { GlobalSearch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/GlobalSearch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Pagination.jsx
try { (() => {
/** Paginação — navegação de páginas com contexto do total. */
function Pagination({
  page = 1,
  pageCount = 1,
  total,
  pageSize,
  onChange,
  style
}) {
  const btn = disabled => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 'var(--control-height-compact)',
    height: 'var(--control-height-compact)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--surface-default)',
    color: disabled ? 'var(--text-disabled)' : 'var(--text-muted)',
    cursor: disabled ? 'not-allowed' : 'pointer'
  });
  const from = total !== undefined && pageSize ? (page - 1) * pageSize + 1 : null;
  const to = total !== undefined && pageSize ? Math.min(page * pageSize, total) : null;
  return /*#__PURE__*/React.createElement("nav", {
    "aria-label": "Pagina\xE7\xE3o",
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-support-size)',
      color: 'var(--text-muted)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, from !== null ? `${from}–${to} de ${total.toLocaleString('pt-BR')}` : `Página ${page} de ${pageCount}`), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": "P\xE1gina anterior",
    disabled: page <= 1,
    onClick: () => onChange && onChange(page - 1),
    style: btn(page <= 1)
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-left",
    size: 14
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-support-size)',
      color: 'var(--text-body)',
      fontVariantNumeric: 'tabular-nums',
      minWidth: 52,
      textAlign: 'center'
    }
  }, page, " / ", pageCount), /*#__PURE__*/React.createElement("button", {
    "aria-label": "Pr\xF3xima p\xE1gina",
    disabled: page >= pageCount,
    onClick: () => onChange && onChange(page + 1),
    style: btn(page >= pageCount)
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-right",
    size: 14
  }))));
}
Object.assign(__ds_scope, { Pagination });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Pagination.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
/** Abas — alternância entre visões do mesmo contexto. Sublinhado indica a ativa. */
function Tabs({
  tabs = [],
  active,
  onChange,
  compact = false,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: 'flex',
      gap: 'var(--space-1)',
      borderBottom: '1px solid var(--border-subtle)',
      ...style
    }
  }, tabs.map(t => {
    const tab = typeof t === 'string' ? {
      id: t,
      label: t
    } : t;
    const sel = active === tab.id;
    return /*#__PURE__*/React.createElement("button", {
      key: tab.id,
      role: "tab",
      "aria-selected": sel,
      onClick: () => onChange && onChange(tab.id),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: compact ? '6px var(--space-3)' : '10px var(--space-4)',
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--type-body-size)',
        fontWeight: sel ? 'var(--weight-medium)' : 'var(--weight-regular)',
        color: sel ? 'var(--text-strong)' : 'var(--text-muted)',
        boxShadow: sel ? 'inset 0 -2px 0 var(--action-primary)' : 'none',
        marginBottom: -1,
        transition: 'color var(--duration-instant) var(--ease-standard)'
      }
    }, tab.label, tab.count !== undefined && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 'var(--type-caption-size)',
        fontVariantNumeric: 'tabular-nums',
        background: 'var(--surface-sunken)',
        color: 'var(--text-muted)',
        borderRadius: 'var(--radius-full)',
        padding: '0 7px',
        lineHeight: '16px'
      }
    }, tab.count));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/overlay/Drawer.jsx
try { (() => {
/** Painel lateral (drawer) — detalhe/edição em contexto sem sair da tela. */
function Drawer({
  open,
  title,
  children,
  footer,
  onClose,
  width = 420
}) {
  React.useEffect(() => {
    if (!open) return;
    const esc = e => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onMouseDown: e => {
      if (e.target === e.currentTarget && onClose) onClose();
    },
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'var(--surface-overlay)',
      animation: 'adl-fade-in var(--duration-base) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes adl-fade-in { from { opacity: 0; } } @keyframes adl-slide-in { from { transform: translateX(24px); opacity: 0; } }'), /*#__PURE__*/React.createElement("aside", {
    role: "dialog",
    "aria-modal": "true",
    "aria-label": title,
    style: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      maxWidth: width,
      background: 'var(--surface-default)',
      boxShadow: 'var(--elevation-overlay)',
      display: 'flex',
      flexDirection: 'column',
      animation: 'adl-slide-in var(--duration-base) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      padding: 'var(--space-4) var(--space-6)',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 'var(--type-subtitle-size)',
      lineHeight: 'var(--type-subtitle-line)',
      fontWeight: 'var(--type-subtitle-weight)',
      color: 'var(--text-strong)'
    }
  }, title), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Fechar painel",
    style: {
      border: 'none',
      background: 'none',
      padding: 4,
      color: 'var(--text-subtle)',
      cursor: 'pointer',
      display: 'inline-flex'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: 'var(--space-6)'
    }
  }, children), footer && /*#__PURE__*/React.createElement("footer", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 'var(--space-2)',
      padding: 'var(--space-4) var(--space-6)',
      borderTop: '1px solid var(--border-subtle)'
    }
  }, footer)));
}
Object.assign(__ds_scope, { Drawer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/Drawer.jsx", error: String((e && e.message) || e) }); }

// components/overlay/Modal.jsx
try { (() => {
/** Modal — sobreposição para decisão ou tarefa curta; scrim escuro, entrada 200ms. */
function Modal({
  open,
  title,
  children,
  footer,
  onClose,
  width = 480
}) {
  React.useEffect(() => {
    if (!open) return;
    const esc = e => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onMouseDown: e => {
      if (e.target === e.currentTarget && onClose) onClose();
    },
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'var(--surface-overlay)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-6)',
      animation: 'adl-fade-in var(--duration-base) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes adl-fade-in { from { opacity: 0; } } @keyframes adl-rise-in { from { opacity: 0; transform: translateY(8px); } }'), /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    "aria-label": title,
    style: {
      width: '100%',
      maxWidth: width,
      maxHeight: '85vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-default)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--elevation-overlay)',
      animation: 'adl-rise-in var(--duration-base) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-4)',
      padding: 'var(--space-5) var(--space-6) 0'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 'var(--type-title-size)',
      lineHeight: 'var(--type-title-line)',
      fontWeight: 'var(--type-title-weight)',
      color: 'var(--text-strong)'
    }
  }, title), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Fechar",
    style: {
      border: 'none',
      background: 'none',
      padding: 4,
      color: 'var(--text-subtle)',
      cursor: 'pointer',
      display: 'inline-flex',
      borderRadius: 'var(--radius-sm)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "x",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-4) var(--space-6)',
      overflowY: 'auto',
      color: 'var(--text-body)'
    }
  }, children), footer && /*#__PURE__*/React.createElement("footer", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 'var(--space-2)',
      padding: '0 var(--space-6) var(--space-5)'
    }
  }, footer)));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/Modal.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ConfirmDialog.jsx
try { (() => {
/** Confirmação proporcional ao risco: destrutiva pede confirmação explícita;
 * irreversível em massa exige digitar para confirmar. */
function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  typeToConfirm,
  onConfirm,
  onCancel
}) {
  const [typed, setTyped] = React.useState('');
  React.useEffect(() => {
    if (!open) setTyped('');
  }, [open]);
  const blocked = typeToConfirm && typed !== typeToConfirm;
  return /*#__PURE__*/React.createElement(__ds_scope.Modal, {
    open: open,
    title: title,
    onClose: onCancel,
    width: 440,
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(__ds_scope.Button, {
      variant: "secondary",
      onClick: onCancel
    }, cancelLabel), /*#__PURE__*/React.createElement(__ds_scope.Button, {
      variant: destructive ? 'destructive' : 'primary',
      disabled: blocked,
      onClick: onConfirm
    }, confirmLabel))
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: 'var(--text-muted)',
      maxWidth: 'var(--measure-reading)'
    }
  }, description), typeToConfirm && /*#__PURE__*/React.createElement(__ds_scope.TextField, {
    label: `Digite "${typeToConfirm}" para confirmar`,
    value: typed,
    onChange: setTyped,
    style: {
      marginTop: 'var(--space-4)'
    }
  }));
}
Object.assign(__ds_scope, { ConfirmDialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ConfirmDialog.jsx", error: String((e && e.message) || e) }); }

// components/overlay/Popover.jsx
try { (() => {
/** Popover — conteúdo leve ancorado a um gatilho (filtros, detalhes rápidos). */
function Popover({
  trigger,
  children,
  position = 'bottom',
  width = 280
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const close = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const esc = e => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  const pos = position === 'top' ? {
    bottom: 'calc(100% + 6px)',
    left: 0
  } : {
    top: 'calc(100% + 6px)',
    left: 0
  };
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    style: {
      position: 'relative',
      display: 'inline-block'
    }
  }, /*#__PURE__*/React.createElement("span", {
    onClick: () => setOpen(o => !o)
  }, trigger), open && /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    style: {
      position: 'absolute',
      zIndex: 40,
      ...pos,
      width,
      background: 'var(--surface-default)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--elevation-floating)',
      padding: 'var(--space-4)'
    }
  }, children));
}
Object.assign(__ds_scope, { Popover });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/Popover.jsx", error: String((e && e.message) || e) }); }

// components/business/ScoreIndicator.jsx
try { (() => {
/** Indicador de score com explicação — nunca um número seco: origem, critérios e confiança. */
function ScoreIndicator({
  value,
  max = 100,
  label = 'Match',
  confidence,
  criteria = [],
  size = 'default',
  style
}) {
  const pct = Math.round(value / max * 100);
  const tone = pct >= 75 ? 'var(--feedback-success)' : pct >= 50 ? 'var(--feedback-warning)' : 'var(--feedback-danger)';
  const compact = size === 'compact';
  const chip = /*#__PURE__*/React.createElement("button", {
    "aria-label": `${label}: ${pct} de 100 — ver explicação`,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: compact ? '1px 8px' : '3px 10px',
      background: 'var(--ai-surface)',
      border: '1px solid var(--ai-border)',
      borderRadius: 'var(--radius-full)',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "sparkles",
    size: compact ? 11 : 13,
    style: {
      color: 'var(--ai-text)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: compact ? 'var(--type-caption-size)' : 'var(--type-support-size)',
      fontWeight: 'var(--weight-semibold)',
      color: tone,
      fontVariantNumeric: 'tabular-nums'
    }
  }, pct), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-caption-size)',
      color: 'var(--ai-text)'
    }
  }, label), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 11,
    style: {
      color: 'var(--text-subtle)'
    }
  }));
  return /*#__PURE__*/React.createElement("span", {
    style: style
  }, /*#__PURE__*/React.createElement(__ds_scope.Popover, {
    trigger: chip,
    width: 300
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      fontSize: 'var(--type-caption-size)',
      color: 'var(--ai-text)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "sparkles",
    size: 12
  }), "Avalia\xE7\xE3o gerada por IA \u2014 apoia, n\xE3o decide"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 24,
      fontWeight: 'var(--weight-semibold)',
      color: tone,
      fontVariantNumeric: 'tabular-nums'
    }
  }, pct), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-support-size)',
      color: 'var(--text-muted)'
    }
  }, "/ 100 \xB7 ", label)), confidence && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-caption-size)',
      color: 'var(--text-muted)'
    }
  }, "Confian\xE7a: ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text-body)'
    }
  }, confidence)), criteria.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)'
    }
  }, criteria.map(c => /*#__PURE__*/React.createElement(__ds_scope.ProgressBar, {
    key: c.label,
    label: c.label,
    value: c.value,
    showValue: true,
    tone: c.value >= 75 ? 'success' : c.value >= 50 ? 'warning' : 'danger'
  }))))));
}
Object.assign(__ds_scope, { ScoreIndicator });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/business/ScoreIndicator.jsx", error: String((e && e.message) || e) }); }

// components/business/PipelineBoard.jsx
try { (() => {
/** Quadro kanban de pipeline — estágios configuráveis, cartões de candidato, herdeiro do pipeline do SelX 1.0. */
function PipelineBoard({
  stages = [],
  onCardClick,
  onMoveCard,
  style
}) {
  const [dragging, setDragging] = React.useState(null);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-4)',
      alignItems: 'flex-start',
      overflowX: 'auto',
      paddingBottom: 'var(--space-2)',
      ...style
    }
  }, stages.map(stage => /*#__PURE__*/React.createElement("div", {
    key: stage.id,
    onDragOver: e => e.preventDefault(),
    onDrop: () => {
      if (dragging && onMoveCard) onMoveCard(dragging, stage.id);
      setDragging(null);
    },
    style: {
      width: 280,
      flexShrink: 0,
      background: 'var(--surface-sunken)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 'var(--space-2) var(--space-2) var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-support-size)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--text-body)'
    }
  }, stage.label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-caption-size)',
      color: 'var(--text-subtle)',
      fontVariantNumeric: 'tabular-nums',
      background: 'var(--surface-default)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-full)',
      padding: '0 7px',
      lineHeight: '16px'
    }
  }, (stage.cards || []).length)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)',
      minHeight: 40
    }
  }, (stage.cards || []).map(card => /*#__PURE__*/React.createElement("div", {
    key: card.id,
    draggable: !!onMoveCard,
    onDragStart: () => setDragging(card.id),
    style: {
      cursor: onMoveCard ? 'grab' : undefined,
      opacity: dragging === card.id ? 0.5 : 1
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.PersonCard, {
    name: card.name,
    role: card.role,
    density: "compact",
    onClick: onCardClick ? () => onCardClick(card, stage) : undefined,
    actions: card.score !== undefined ? /*#__PURE__*/React.createElement(__ds_scope.ScoreIndicator, {
      value: card.score,
      size: "compact",
      confidence: card.confidence,
      criteria: card.criteria
    }) : undefined
  }))), (stage.cards || []).length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--space-4)',
      textAlign: 'center',
      fontSize: 'var(--type-caption-size)',
      color: 'var(--text-subtle)',
      border: '1px dashed var(--border-default)',
      borderRadius: 'var(--radius-md)'
    }
  }, "Nenhum candidato neste est\xE1gio")))));
}
Object.assign(__ds_scope, { PipelineBoard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/business/PipelineBoard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/selx/CandidatoDrawer.jsx
try { (() => {
const DS4 = window.AIONDesignLanguageADL_e674b3;
const {
  Drawer: DR4,
  Tabs: TB4,
  Avatar: AV4,
  StatusBadge: SB4,
  ScoreIndicator: SI4,
  ListView: LV4,
  Tag: TG4,
  Button: B4,
  ButtonGroup: BG4,
  Divider: DV4,
  ProgressBar: PR4,
  Icon: IC4
} = DS4;
const DC = window.selxData;

/** Detalhe do candidato — padrão "detalhe de entidade" em drawer. */
function CandidatoDrawer({
  candidatoId,
  onClose
}) {
  const [tab, setTab] = React.useState('perfil');
  const c = DC.candidatos.find(x => x.id === candidatoId);
  if (!c) return null;
  return /*#__PURE__*/React.createElement(DR4, {
    open: !!candidatoId,
    title: "Detalhe do candidato",
    onClose: onClose,
    width: 480,
    footer: /*#__PURE__*/React.createElement(BG4, null, /*#__PURE__*/React.createElement(B4, {
      variant: "secondary",
      onClick: onClose
    }, "Fechar"), /*#__PURE__*/React.createElement(B4, {
      icon: "calendar"
    }, "Agendar entrevista"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-4)',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement(AV4, {
    name: c.nome,
    size: "xl"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-title-size)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--text-strong)'
    }
  }, c.nome), /*#__PURE__*/React.createElement(SB4, {
    tone: c.tone
  }, c.etapa)), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-muted)',
      fontSize: 'var(--type-support-size)',
      marginTop: 2
    }
  }, c.vaga, " \xB7 ", c.cidade), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement(SI4, {
    value: c.score,
    confidence: c.confidence,
    criteria: c.criteria
  })))), /*#__PURE__*/React.createElement(TB4, {
    active: tab,
    onChange: setTab,
    style: {
      margin: 'var(--space-5) 0 var(--space-4)'
    },
    tabs: [{
      id: 'perfil',
      label: 'Perfil'
    }, {
      id: 'historico',
      label: 'Histórico',
      count: DC.timeline.length
    }]
  }), tab === 'perfil' ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-caption-size)',
      color: 'var(--text-subtle)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      marginBottom: 'var(--space-2)'
    }
  }, "Resumo"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--space-2) var(--space-4)',
      fontSize: 'var(--type-support-size)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)'
    }
  }, "Pretens\xE3o salarial"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-body)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, c.pretensao), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)'
    }
  }, "Atualizado"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-body)'
    }
  }, c.atualizado), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-muted)'
    }
  }, "Origem"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-body)'
    }
  }, "P\xE1gina de carreiras"))), /*#__PURE__*/React.createElement(DV4, {
    spacing: "0px"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-caption-size)',
      color: 'var(--text-subtle)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      marginBottom: 'var(--space-2)'
    }
  }, "Habilidades"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-1)',
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(TG4, null, "SQL"), /*#__PURE__*/React.createElement(TG4, null, "Python"), /*#__PURE__*/React.createElement(TG4, null, "Power BI"), /*#__PURE__*/React.createElement(TG4, null, "dbt"), /*#__PURE__*/React.createElement(TG4, null, "Ingl\xEAs intermedi\xE1rio"))), /*#__PURE__*/React.createElement(DV4, {
    spacing: "0px"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--ai-surface)',
      border: '1px solid var(--ai-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 'var(--type-caption-size)',
      color: 'var(--ai-text)',
      marginBottom: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(IC4, {
    name: "sparkles",
    size: 12
  }), " An\xE1lise gerada por IA \xB7 confian\xE7a ", c.confidence), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)'
    }
  }, c.criteria.map(cr => /*#__PURE__*/React.createElement(PR4, {
    key: cr.label,
    label: cr.label,
    value: cr.value,
    tone: cr.value >= 75 ? 'success' : cr.value >= 50 ? 'warning' : 'danger'
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-caption-size)',
      color: 'var(--text-muted)',
      marginTop: 'var(--space-3)'
    }
  }, "A IA sugere \u2014 a decis\xE3o \xE9 sua e fica registrada no hist\xF3rico."))) : /*#__PURE__*/React.createElement(LV4, {
    items: DC.timeline
  }));
}
window.CandidatoDrawer = CandidatoDrawer;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/selx/CandidatoDrawer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/selx/ScreenCandidatos.jsx
try { (() => {
const DS5 = window.AIONDesignLanguageADL_e674b3;
const {
  Page: P5,
  PersonCard: PC5,
  TextField: TF5,
  Select: S5,
  ScoreIndicator: SI5,
  ActionMenu: AM5
} = DS5;
const D5 = window.selxData;
function ScreenCandidatos({
  abrirCandidato
}) {
  const [busca, setBusca] = React.useState('');
  const list = D5.candidatos.filter(c => !busca || c.nome.toLowerCase().includes(busca.toLowerCase()));
  return /*#__PURE__*/React.createElement(P5, {
    title: "Candidatos",
    description: `${D5.candidatos.length} candidatos ativos na vaga Analista de dados`
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      marginBottom: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(TF5, {
    icon: "search",
    placeholder: "Buscar por nome\u2026",
    value: busca,
    onChange: setBusca,
    style: {
      width: 280
    }
  }), /*#__PURE__*/React.createElement(S5, {
    placeholder: "Todas as etapas",
    options: ['Triagem', 'Entrevista', 'Proposta', 'Não aprovado'],
    style: {
      width: 180
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--space-3)'
    }
  }, list.map(c => /*#__PURE__*/React.createElement(PC5, {
    key: c.id,
    density: "rich",
    name: c.nome,
    role: c.vaga,
    status: c.etapa,
    statusTone: c.tone,
    meta: [c.cidade, `Pretensão ${c.pretensao}`, `Atualizado ${c.atualizado}`],
    onClick: () => abrirCandidato(c.id),
    actions: /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 'var(--space-2)',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement(SI5, {
      value: c.score,
      size: "compact",
      confidence: c.confidence,
      criteria: c.criteria
    }), /*#__PURE__*/React.createElement(AM5, {
      compact: true,
      items: [{
        label: 'Ver perfil',
        icon: 'user'
      }, {
        label: 'Agendar entrevista',
        icon: 'calendar'
      }, '-', {
        label: 'Encerrar candidatura',
        icon: 'x',
        destructive: true
      }]
    }))
  }))));
}
window.ScreenCandidatos = ScreenCandidatos;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/selx/ScreenCandidatos.jsx", error: String((e && e.message) || e) }); }

// ui_kits/selx/ScreenDashboard.jsx
try { (() => {
// Telas do SelX 2.0 — compõem os componentes ADL via window.AIONDesignLanguageADL_e674b3
const DS = window.AIONDesignLanguageADL_e674b3;
const {
  Page,
  Card,
  Button,
  ButtonGroup,
  ActionMenu,
  TextField,
  Select,
  DataTable,
  StatusBadge,
  Stat,
  KpiCard,
  Tag,
  Tabs,
  Breadcrumb,
  Pagination,
  GlobalSearch,
  EmptyState,
  Alert,
  ListView,
  PersonCard,
  PipelineBoard,
  ScoreIndicator,
  Drawer,
  ConfirmDialog,
  Avatar,
  ProgressBar,
  Divider,
  Icon
} = DS;
const D = window.selxData;
function ScreenDashboard({
  go
}) {
  return /*#__PURE__*/React.createElement(Page, {
    title: "Bom dia, Marina",
    description: "Resumo do recrutamento da Empresa Exemplo \u2014 atualizado h\xE1 5 minutos."
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(KpiCard, {
    label: "Vagas abertas",
    value: "14",
    delta: "+2",
    period: "no m\xEAs"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    label: "Candidaturas no m\xEAs",
    value: "1.284",
    delta: "+12%",
    period: "vs. m\xEAs anterior"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    label: "Tempo m\xE9dio de contrata\xE7\xE3o",
    value: "23 dias",
    delta: "-4 dias",
    deltaDirection: "up",
    period: "vs. trimestre anterior"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    label: "Entrevistas esta semana",
    value: "9",
    period: "3 hoje"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: 'var(--space-4)',
      marginTop: 'var(--space-4)',
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    title: "Pend\xEAncias",
    actions: /*#__PURE__*/React.createElement(Button, {
      variant: "subtle",
      size: "compact",
      onClick: () => go('candidatos')
    }, "Ver todas")
  }, /*#__PURE__*/React.createElement(Alert, {
    tone: "warning",
    title: "12 candidaturas aguardam triagem h\xE1 mais de 5 dias",
    action: /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "compact",
      onClick: () => go('pipeline')
    }, "Ir para o pipeline"),
    style: {
      marginBottom: 'var(--space-4)'
    }
  }), /*#__PURE__*/React.createElement(ListView, {
    items: [{
      id: 1,
      title: 'Entrevista com Ana Souza',
      description: 'Analista de dados · com você e Paulo Reis',
      meta: 'hoje, 14h'
    }, {
      id: 2,
      title: 'Proposta de Carla Mendes expira',
      description: 'Analista de dados · enviada há 5 dias',
      meta: 'em 2 dias'
    }, {
      id: 3,
      title: 'Feedback de entrevista pendente',
      description: 'Elisa Rocha · entrevistada há 2 dias',
      meta: 'atrasado'
    }],
    onItemClick: () => go('candidatos')
  })), /*#__PURE__*/React.createElement(Card, {
    title: "Funil do m\xEAs"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(ProgressBar, {
    label: "Candidaturas",
    value: 100,
    showValue: false
  }), /*#__PURE__*/React.createElement(ProgressBar, {
    label: "Triagem",
    value: 46,
    showValue: false
  }), /*#__PURE__*/React.createElement(ProgressBar, {
    label: "Entrevista",
    value: 18,
    showValue: false
  }), /*#__PURE__*/React.createElement(ProgressBar, {
    label: "Proposta",
    value: 6,
    showValue: false,
    tone: "success"
  }), /*#__PURE__*/React.createElement(Divider, {
    spacing: "var(--space-2)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-caption-size)',
      color: 'var(--text-subtle)'
    }
  }, "1.284 candidaturas \u2192 77 propostas \xB7 convers\xE3o de 6%")))));
}
window.ScreenDashboard = ScreenDashboard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/selx/ScreenDashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/selx/ScreenPipeline.jsx
try { (() => {
const DS3 = window.AIONDesignLanguageADL_e674b3;
const {
  Page: P3,
  PipelineBoard: PB3,
  Select: S3,
  Button: B3,
  Toast: T3
} = DS3;
const DP = window.selxData;
function ScreenPipeline({
  abrirCandidato
}) {
  const build = () => {
    const stages = [{
      id: 'triagem',
      label: 'Triagem',
      cards: []
    }, {
      id: 'entrevista',
      label: 'Entrevista',
      cards: []
    }, {
      id: 'proposta',
      label: 'Proposta',
      cards: []
    }, {
      id: 'nao-aprovado',
      label: 'Não aprovado',
      cards: []
    }];
    const map = {
      'Triagem': 'triagem',
      'Entrevista': 'entrevista',
      'Proposta': 'proposta',
      'Não aprovado': 'nao-aprovado'
    };
    DP.candidatos.forEach(c => {
      const st = stages.find(s => s.id === map[c.etapa]);
      if (st) st.cards.push({
        id: c.id,
        name: c.nome,
        role: c.cidade,
        score: c.score,
        confidence: c.confidence,
        criteria: c.criteria
      });
    });
    return stages;
  };
  const [stages, setStages] = React.useState(build);
  const [toast, setToast] = React.useState(null);
  const mover = (cardId, toStageId) => {
    setStages(prev => {
      let card = null;
      const sem = prev.map(s => {
        const found = (s.cards || []).find(c => c.id === cardId);
        if (found) card = found;
        return {
          ...s,
          cards: s.cards.filter(c => c.id !== cardId)
        };
      });
      if (!card) return prev;
      const next = sem.map(s => s.id === toStageId ? {
        ...s,
        cards: [...s.cards, card]
      } : s);
      const stage = next.find(s => s.id === toStageId);
      setToast(`${card.name} movido(a) para ${stage.label}.`);
      return next;
    });
  };
  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  return /*#__PURE__*/React.createElement(P3, {
    title: "Pipeline \u2014 Analista de dados",
    description: "6 candidatos ativos \xB7 arraste os cart\xF5es entre est\xE1gios",
    maxWidth: "none",
    actions: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(S3, {
      options: ['Analista de dados', 'Analista de RH pleno', 'Product designer'],
      defaultValue: "Analista de dados",
      style: {
        width: 220
      }
    }), /*#__PURE__*/React.createElement(B3, {
      variant: "secondary",
      icon: "user-plus"
    }, "Adicionar candidato"))
  }, /*#__PURE__*/React.createElement(PB3, {
    stages: stages,
    onMoveCard: mover,
    onCardClick: card => abrirCandidato(card.id)
  }), toast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 200
    }
  }, /*#__PURE__*/React.createElement(T3, {
    message: toast,
    actionLabel: "Desfazer",
    onDismiss: () => setToast(null)
  })));
}
window.ScreenPipeline = ScreenPipeline;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/selx/ScreenPipeline.jsx", error: String((e && e.message) || e) }); }

// ui_kits/selx/ScreenVagas.jsx
try { (() => {
const DS2 = window.AIONDesignLanguageADL_e674b3;
const {
  Page: P2,
  Button: B2,
  DataTable: DT2,
  StatusBadge: SB2,
  TextField: TF2,
  Select: S2,
  Pagination: PG2,
  ActionMenu: AM2,
  EmptyState: ES2,
  ConfirmDialog: CD2
} = DS2;
const DV = window.selxData;
function ScreenVagas({
  go,
  abrirCandidato
}) {
  const [busca, setBusca] = React.useState('');
  const [area, setArea] = React.useState('');
  const [sel, setSel] = React.useState([]);
  const [confirm, setConfirm] = React.useState(false);
  const rows = DV.vagas.filter(v => (!busca || v.titulo.toLowerCase().includes(busca.toLowerCase())) && (!area || v.area === area));
  return /*#__PURE__*/React.createElement(P2, {
    title: "Vagas",
    description: "14 vagas abertas \xB7 6 exibidas",
    actions: /*#__PURE__*/React.createElement(B2, {
      icon: "plus"
    }, "Publicar vaga")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      marginBottom: 'var(--space-4)',
      alignItems: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement(TF2, {
    icon: "search",
    placeholder: "Buscar por t\xEDtulo\u2026",
    value: busca,
    onChange: setBusca,
    style: {
      width: 280
    }
  }), /*#__PURE__*/React.createElement(S2, {
    placeholder: "Todas as \xE1reas",
    value: area,
    onChange: setArea,
    options: ['Tecnologia', 'Pessoas', 'Produto'],
    style: {
      width: 180
    }
  }), sel.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      alignItems: 'center',
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-support-size)',
      color: 'var(--text-muted)'
    }
  }, sel.length, " selecionada", sel.length > 1 ? 's' : ''), /*#__PURE__*/React.createElement(B2, {
    variant: "secondary",
    size: "compact",
    icon: "pause"
  }, "Pausar"), /*#__PURE__*/React.createElement(B2, {
    variant: "destructive",
    size: "compact",
    icon: "trash-2",
    onClick: () => setConfirm(true)
  }, "Encerrar"))), /*#__PURE__*/React.createElement(DT2, {
    selectable: true,
    selected: sel,
    onSelectionChange: setSel,
    columns: [{
      key: 'titulo',
      label: 'Vaga',
      sortable: true
    }, {
      key: 'area',
      label: 'Área'
    }, {
      key: 'local',
      label: 'Local'
    }, {
      key: 'candidaturas',
      label: 'Candidaturas',
      numeric: true
    }, {
      key: 'publicada',
      label: 'Publicada'
    }, {
      key: 'status',
      label: 'Status',
      render: r => /*#__PURE__*/React.createElement(SB2, {
        tone: r.tone
      }, r.status)
    }, {
      key: 'acoes',
      label: '',
      render: () => /*#__PURE__*/React.createElement(AM2, {
        compact: true,
        items: [{
          label: 'Editar vaga',
          icon: 'pencil'
        }, {
          label: 'Duplicar',
          icon: 'copy'
        }, '-', {
          label: 'Encerrar vaga',
          icon: 'trash-2',
          destructive: true
        }]
      })
    }],
    rows: rows,
    onRowClick: () => go('pipeline'),
    emptyState: /*#__PURE__*/React.createElement(ES2, {
      icon: "search-x",
      title: "Nenhuma vaga encontrada",
      description: "Ajuste a busca ou os filtros para ver resultados."
    })
  }), /*#__PURE__*/React.createElement(PG2, {
    page: 1,
    pageCount: 1,
    total: rows.length,
    pageSize: 25,
    style: {
      marginTop: 'var(--space-4)'
    }
  }), /*#__PURE__*/React.createElement(CD2, {
    open: confirm,
    destructive: true,
    title: "Encerrar vagas selecionadas",
    description: `${sel.length} vaga(s) serão encerradas e deixarão de receber candidaturas. As candidaturas existentes são mantidas.`,
    confirmLabel: "Encerrar vagas",
    onConfirm: () => {
      setConfirm(false);
      setSel([]);
    },
    onCancel: () => setConfirm(false)
  }));
}
window.ScreenVagas = ScreenVagas;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/selx/ScreenVagas.jsx", error: String((e && e.message) || e) }); }

// ui_kits/selx/data.js
try { (() => {
// Dados de exemplo do SelX 2.0 (fake, pt-BR)
const selxData = {
  vagas: [{
    id: 'v1',
    titulo: 'Analista de dados',
    area: 'Tecnologia',
    local: 'São Paulo — SP · Híbrido',
    candidaturas: 34,
    status: 'Aberta',
    tone: 'success',
    publicada: 'há 12 dias'
  }, {
    id: 'v2',
    titulo: 'Analista de RH pleno',
    area: 'Pessoas',
    local: 'Remoto',
    candidaturas: 58,
    status: 'Aberta',
    tone: 'success',
    publicada: 'há 8 dias'
  }, {
    id: 'v3',
    titulo: 'Product designer',
    area: 'Produto',
    local: 'São Paulo — SP · Híbrido',
    candidaturas: 91,
    status: 'Em triagem',
    tone: 'info',
    publicada: 'há 21 dias'
  }, {
    id: 'v4',
    titulo: 'Desenvolvedor(a) back-end sênior',
    area: 'Tecnologia',
    local: 'Remoto',
    candidaturas: 47,
    status: 'Aberta',
    tone: 'success',
    publicada: 'há 5 dias'
  }, {
    id: 'v5',
    titulo: 'Coordenador(a) de folha',
    area: 'Pessoas',
    local: 'Campinas — SP · Presencial',
    candidaturas: 12,
    status: 'Pausada',
    tone: 'warning',
    publicada: 'há 30 dias'
  }, {
    id: 'v6',
    titulo: 'Estágio em análise de dados',
    area: 'Tecnologia',
    local: 'São Paulo — SP · Híbrido',
    candidaturas: 143,
    status: 'Encerrada',
    tone: 'neutral',
    publicada: 'há 60 dias'
  }],
  candidatos: [{
    id: 'c1',
    nome: 'Ana Souza',
    vaga: 'Analista de dados',
    etapa: 'Entrevista',
    tone: 'info',
    score: 87,
    confidence: 'alta',
    pretensao: 'R$ 7.500',
    cidade: 'São Paulo — SP',
    atualizado: 'há 2 dias',
    criteria: [{
      label: 'Experiência com dados',
      value: 92
    }, {
      label: 'SQL e modelagem',
      value: 88
    }, {
      label: 'Inglês',
      value: 60
    }]
  }, {
    id: 'c2',
    nome: 'Bruno Lima',
    vaga: 'Analista de dados',
    etapa: 'Triagem',
    tone: 'neutral',
    score: 74,
    confidence: 'média — poucos dados',
    pretensao: 'R$ 6.800',
    cidade: 'Osasco — SP',
    atualizado: 'há 1 dia',
    criteria: [{
      label: 'Experiência com dados',
      value: 78
    }, {
      label: 'SQL e modelagem',
      value: 81
    }, {
      label: 'Inglês',
      value: 55
    }]
  }, {
    id: 'c3',
    nome: 'Carla Mendes',
    vaga: 'Analista de dados',
    etapa: 'Proposta',
    tone: 'success',
    score: 91,
    confidence: 'alta',
    pretensao: 'R$ 8.200',
    cidade: 'São Paulo — SP',
    atualizado: 'há 4 horas',
    criteria: [{
      label: 'Experiência com dados',
      value: 95
    }, {
      label: 'SQL e modelagem',
      value: 90
    }, {
      label: 'Inglês',
      value: 82
    }]
  }, {
    id: 'c4',
    nome: 'Diego Alves',
    vaga: 'Analista de dados',
    etapa: 'Triagem',
    tone: 'neutral',
    score: 66,
    confidence: 'média',
    pretensao: 'R$ 6.200',
    cidade: 'Guarulhos — SP',
    atualizado: 'há 3 dias',
    criteria: [{
      label: 'Experiência com dados',
      value: 70
    }, {
      label: 'SQL e modelagem',
      value: 64
    }, {
      label: 'Inglês',
      value: 58
    }]
  }, {
    id: 'c5',
    nome: 'Elisa Rocha',
    vaga: 'Analista de dados',
    etapa: 'Entrevista',
    tone: 'info',
    score: 82,
    confidence: 'alta',
    pretensao: 'R$ 7.900',
    cidade: 'São Paulo — SP',
    atualizado: 'há 6 horas',
    criteria: [{
      label: 'Experiência com dados',
      value: 85
    }, {
      label: 'SQL e modelagem',
      value: 80
    }, {
      label: 'Inglês',
      value: 75
    }]
  }, {
    id: 'c6',
    nome: 'Felipe Nogueira',
    vaga: 'Analista de dados',
    etapa: 'Não aprovado',
    tone: 'danger',
    score: 41,
    confidence: 'alta',
    pretensao: 'R$ 5.900',
    cidade: 'Santo André — SP',
    atualizado: 'há 5 dias',
    criteria: [{
      label: 'Experiência com dados',
      value: 38
    }, {
      label: 'SQL e modelagem',
      value: 45
    }, {
      label: 'Inglês',
      value: 40
    }]
  }],
  timeline: [{
    id: 1,
    title: 'Movida para Entrevista',
    description: 'por Marina Castro',
    meta: 'há 2 dias'
  }, {
    id: 2,
    title: 'Análise de IA concluída',
    description: 'Match 87 · confiança alta',
    meta: 'há 4 dias'
  }, {
    id: 3,
    title: 'Triagem aprovada',
    description: 'por Marina Castro',
    meta: 'há 4 dias'
  }, {
    id: 4,
    title: 'Candidatura recebida',
    description: 'via página de carreiras',
    meta: 'há 9 dias'
  }],
  nav: [{
    section: 'Geral'
  }, {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'layout-dashboard'
  }, {
    section: 'Recrutamento'
  }, {
    id: 'vagas',
    label: 'Vagas',
    icon: 'briefcase'
  }, {
    id: 'pipeline',
    label: 'Pipeline',
    icon: 'kanban'
  }, {
    id: 'candidatos',
    label: 'Candidatos',
    icon: 'users'
  }, {
    section: 'Configurações'
  }, {
    id: 'equipe',
    label: 'Equipe',
    icon: 'user'
  }, {
    id: 'ajustes',
    label: 'Ajustes',
    icon: 'settings'
  }]
};
window.selxData = selxData;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/selx/data.js", error: String((e && e.message) || e) }); }

__ds_ns.ActionMenu = __ds_scope.ActionMenu;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.ButtonGroup = __ds_scope.ButtonGroup;

__ds_ns.KpiCard = __ds_scope.KpiCard;

__ds_ns.PersonCard = __ds_scope.PersonCard;

__ds_ns.PipelineBoard = __ds_scope.PipelineBoard;

__ds_ns.ScoreIndicator = __ds_scope.ScoreIndicator;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.DataTable = __ds_scope.DataTable;

__ds_ns.ListView = __ds_scope.ListView;

__ds_ns.Stat = __ds_scope.Stat;

__ds_ns.StatusBadge = __ds_scope.StatusBadge;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.ConfirmDialog = __ds_scope.ConfirmDialog;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.Skeleton = __ds_scope.Skeleton;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.AppShell = __ds_scope.AppShell;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Divider = __ds_scope.Divider;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.Page = __ds_scope.Page;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Combobox = __ds_scope.Combobox;

__ds_ns.DateField = __ds_scope.DateField;

__ds_ns.FileUpload = __ds_scope.FileUpload;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.TextArea = __ds_scope.TextArea;

__ds_ns.TextField = __ds_scope.TextField;

__ds_ns.Breadcrumb = __ds_scope.Breadcrumb;

__ds_ns.GlobalSearch = __ds_scope.GlobalSearch;

__ds_ns.Pagination = __ds_scope.Pagination;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.Drawer = __ds_scope.Drawer;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.Popover = __ds_scope.Popover;

})();
