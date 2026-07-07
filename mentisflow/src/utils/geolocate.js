// Browser geolocation + free OpenStreetMap (Nominatim) reverse geocoding.
// No API key required, which matters while the project has no billing
// account. Used to autofill city/province and to power "Near me" search.

export const SA_PROVINCES = ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape']

// Nominatim reports e.g. "Gauteng" or "KwaZulu-Natal"; match loosely in both
// directions so small naming differences still resolve.
export function matchProvince(state = '') {
  const s = state.toLowerCase()
  if (!s) return ''
  return SA_PROVINCES.find(p => s.includes(p.toLowerCase()) || p.toLowerCase().includes(s)) || ''
}

// Resolves to { city, province } (either may be '') or rejects on
// denial/timeout/network failure. Callers show their own error state.
export function detectLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await res.json()
          const a = data.address || {}
          resolve({
            city: a.city || a.town || a.village || a.suburb || '',
            province: matchProvince(a.state),
          })
        } catch {
          reject(new Error('Could not look up your location. Please fill it in manually.'))
        }
      },
      () => reject(new Error('Location permission was denied.')),
      { timeout: 8000 }
    )
  })
}
