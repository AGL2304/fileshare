import { useState } from 'react'

interface AvatarProps {
  user: {
    id: string
    name?: string | null
    email: string
    avatarKey?: string | null
    avatarUrl?: string | null
  }
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  /** Cache-buster for forcing reload after upload */
  version?: string | number
}

const sizeMap: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl',
}

export function Avatar({ user, size = 'sm', className = '', version }: AvatarProps) {
  const [errored, setErrored] = useState(false)

  const initial =
    user.name?.[0]?.toUpperCase() ??
    user.email?.[0]?.toUpperCase() ??
    '?'

  const hasAvatar = (user.avatarKey || user.avatarUrl) && !errored
  const src = hasAvatar
    ? `/api/v1/profile/avatar/${user.id}${version ? `?v=${version}` : ''}`
    : null

  return (
    <div
      className={`rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300
                  font-medium flex items-center justify-center overflow-hidden flex-shrink-0
                  ${sizeMap[size]} ${className}`}
      aria-label={`Avatar de ${user.name ?? user.email}`}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
          loading="lazy"
        />
      ) : (
        <span aria-hidden="true">{initial}</span>
      )}
    </div>
  )
}
