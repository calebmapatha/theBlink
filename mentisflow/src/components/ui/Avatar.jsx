import { useState } from 'react'
import { IllustratedAvatar } from './IllustratedAvatar'

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
 *   - photoUrl missing  -> an illustrated flat-vector person, deterministic
 *     from `seed` (uid preferred, falls back to name) so each user keeps the
 *     same face everywhere. `role="provider"` adds the white coat and
 *     stethoscope. No emoji, no initials.
 *   - Broken image URL  -> the illustration (onError), never a broken icon.
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
  seed,
  role = 'patient',
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
        <span aria-hidden="true" className="block h-full w-full">
          <IllustratedAvatar seed={seed || name || ''} role={role} />
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
