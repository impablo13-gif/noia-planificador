// Cabecera compartida por las pestañas de segundo nivel: icono de color +
// título + subtítulo, con hueco a la derecha para los botones de acción.
export default function PageHeader({ icon: Icon, title, hint, children }) {
  return (
    <div className="page-header">
      <div className="page-header__title-row">
        {Icon && (
          <div className="page-header__icon">
            <Icon size={20} />
          </div>
        )}
        <div>
          <h2 className="section-title">{title}</h2>
          {hint && <p className="section-hint">{hint}</p>}
        </div>
      </div>
      {children && <div className="page-header__actions">{children}</div>}
    </div>
  )
}
