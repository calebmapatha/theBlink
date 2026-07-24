import { useState } from 'react'

/**
 * Avatar
 *
 * The ONE avatar component for the whole app. Sidebar, Settings
 * header, Edit Profile modal, appointment cards, doctor cards,
 * admin tables — all of them render this, never their own <img> or
 * emoji block. That is what makes the photo consistent: one
 * component, one source field, one fallback.
 *
 * Rules:
 *   - Always a circle, at every size.
 *   - photoUrl set      -> the photo.
 *   - photoUrl missing  -> the silhouette. No emoji, no initials.
 *   - Broken image URL  -> silhouette (onError), never a broken icon.
 *
 * Source of truth: the photoURL field on providers/{uid} or
 * patients/{uid}. See src/services/profilePhoto.js for the write side.
 */

const SIZES = {
  xs: 'h-6 w-6',
  sm: 'h-9 w-9',    // sidebar
  md: 'h-12 w-12',  // settings header, cards
  lg: 'h-20 w-20',  // profile headers
  xl: 'h-24 w-24',  // edit profile modal
}

export default function Avatar({
  photoUrl,
  name,
  size = 'md',
  ring = false,
  className = '',
}) {
  const [failed, setFailed] = useState(false)
  const showPhoto = Boolean(photoUrl) && !failed

  return (
    <span
      className={`inline-block shrink-0 overflow-hidden  ${SIZES[size]} ${
        ring ? 'ring-2 ring-accent/30 ring-offset-2 ring-offset-surface' : ''
      } ${className}`}
    >
      {showPhoto ? (
        <img
          src={photoUrl}
          alt={`Profile photo of ${name}`}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center bg-accent-soft text-accent-soft-text/70"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3/5 w-3/5">
            <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2.25c-4.97 0-9 2.77-9 6.19 0 .31.25.56.56.56h16.88c.31 0 .56-.25.56-.56 0-3.42-4.03-6.19-9-6.19Z" />
          </svg>
        </span>
      )}
    </span>
  )
}

/* Size map, replacing every old avatar block:

Sidebar:            <Avatar photoUrl={photoURL} name={name} size="sm" />
Settings header:    <Avatar photoUrl={photoURL} name={name} size="md" />
Edit Profile modal: <Avatar photoUrl={preview ?? photoURL} name={name} size="xl" ring />
Doctor card:        <Avatar photoUrl={doctor.photoURL} name={doctor.name} size="md" />
Appointment row:    <Avatar photoUrl={doctor.photoURL} name={doctor.name} size="sm" />

*/
