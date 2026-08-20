import { useEffect, useState } from 'react'
import { User } from 'lucide-react'
import { getFile } from '../db.js'

const SIZE_CLASS = { xs: 'avatar-xs', sm: 'avatar-sm', card: 'avatar-card', lg: 'avatar-lg' }
const SIZE_ICON = { xs: 10, sm: 13, card: 22, lg: 34 }

export default function PlayerAvatar({ fileId, size = 'md' }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl = null
    if (!fileId) {
      setUrl(null)
      return
    }
    getFile(fileId).then((record) => {
      if (cancelled || !record) return
      objectUrl = URL.createObjectURL(record.blob)
      setUrl(objectUrl)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fileId])

  const cls = `avatar${SIZE_CLASS[size] ? ` ${SIZE_CLASS[size]}` : ''}`

  if (url) return <img src={url} alt="" className={cls} />
  if (size === 'xs') return null
  return (
    <div className={`${cls} avatar-placeholder`}>
      <User size={SIZE_ICON[size] || 18} />
    </div>
  )
}
