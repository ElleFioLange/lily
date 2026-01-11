export type HeaderProps = {
  title: string
  options: string[]
  active: string
  setActive: (name: string) => void
}

export default function Header(props: HeaderProps) {
  const { title, options, active, setActive } = props

  return (
    <div className="w-full h-8 bg-stone-900 border-b border-stone-700 flex p-1 z-10">
      <span className="shrink-0 px-4">{title.toUpperCase()}</span>
      <div className="grow flex gap-3 overflow-x-scrol overflow-y-visible no-scrollbar">
        {options.map((option) => (
          <div className="relative" key={option}>
            <button
              className={`text-xs ${option === active ? '' : 'cursor-pointer hover:underline'}`}
              onClick={() => setActive(option)}
            >
              {option}
            </button>
            {option === active && (
              <svg
                preserveAspectRatio="none"
                height="8"
                viewBox="0 0 64 8"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-0 right-0 w-full top-6.75"
              >
                <path
                  d="M31.748 8C42.2299 8 51.9055 1 64 1V0H0V1C13.1024 1 21.2661 8 31.748 8Z"
                  fill="#D6D3D1"
                />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
