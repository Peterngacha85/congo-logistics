const VARIANTS = {
  primary: 'bg-primary-600 border border-primary-600 hover:bg-primary-700 hover:border-primary-700 text-white hover:shadow-md active:bg-primary-800',
  secondary:
    'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 hover:shadow-sm active:bg-slate-200',
  danger: 'bg-red-600 border border-red-600 hover:bg-red-700 hover:border-red-700 text-white hover:shadow-md active:bg-red-800',
  'danger-outline':
    'bg-white border border-red-200 text-red-600 hover:bg-red-100 hover:border-red-400 hover:text-red-700 hover:shadow-sm active:bg-red-200',
  ghost: 'bg-transparent border border-transparent text-slate-700 hover:bg-slate-100 hover:border-slate-200 active:bg-slate-200'
}

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm'
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {isLoading && (
        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {children}
    </button>
  )
}
