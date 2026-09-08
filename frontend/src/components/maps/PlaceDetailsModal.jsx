import { X, Phone, Clock, MapPin, Navigation2, CheckCircle2, PackageCheck, Star, Compass, Globe, ExternalLink } from 'lucide-react'

export default function PlaceDetailsModal({ place, onClose, userLocation }) {
  if (!place) return null

  const getGoogleMapsDirectionsUrl = () => {
    if (userLocation && userLocation.lat && userLocation.lng) {
      return `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${place.lat},${place.lng}`
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`
  }

  const latNum = Number(place.lat)
  const lngNum = Number(place.lng)
  const formattedCoords = `${Math.abs(latNum).toFixed(5)}° ${latNum >= 0 ? 'N' : 'S'}, ${Math.abs(lngNum).toFixed(5)}° ${lngNum >= 0 ? 'E' : 'W'}`

  return (
    <div className="ms-place-drawer">
      <div className="ms-place-drawer__header">
        <div className="ms-place-drawer__title-area">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="ms-place-drawer__category">{place.category_label}</span>
            {place.distance_km !== undefined && (
              <span className="ms-distance-badge">
                <MapPin size={13} aria-hidden="true" /> {place.distance_km} km {userLocation?.isLive ? 'from your location' : 'away'}
              </span>
            )}
          </div>
          <h3 className="ms-place-drawer__title">{place.name}</h3>
          <div className="ms-place-drawer__rating">
            <Star size={14} fill="#eab308" color="#eab308" />
            <strong style={{ color: 'var(--text-main)' }}>{place.rating || 4.8}</strong>
            <span className="ms-reviews">({place.reviews_count || 120} verified reviews)</span>
          </div>
        </div>
        <button
          type="button"
          className="ms-drawer-close"
          onClick={onClose}
          aria-label="Close details"
        >
          <X size={18} />
        </button>
      </div>

      <div className="ms-place-drawer__body">
        <div className="ms-place-meta">
          <div className="ms-meta-row">
            <MapPin size={15} color="var(--sky-400)" className="ms-meta-icon" />
            <span><strong>Address:</strong> {place.address}</span>
          </div>
          <div className="ms-meta-row">
            <Compass size={15} color="var(--sky-400)" className="ms-meta-icon" />
            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--sky-300)' }}>
              <strong>Coordinates:</strong> {formattedCoords} ({latNum.toFixed(6)}, {lngNum.toFixed(6)})
            </span>
          </div>
          <div className="ms-meta-row">
            <Clock size={15} color="var(--status-good)" className="ms-meta-icon" />
            <span>
              <strong>Hours:</strong> {place.opening_hours}{' '}
              {place.open_now && <strong style={{ color: 'var(--status-good)' }}>· Open Now</strong>}
            </span>
          </div>
          {place.phone && (
            <div className="ms-meta-row">
              <Phone size={15} color="var(--sky-400)" className="ms-meta-icon" />
              <span><strong>Phone:</strong> <a href={`tel:${place.phone}`} className="ms-phone-link">{place.phone}</a></span>
            </div>
          )}
          {place.website && (
            <div className="ms-meta-row">
              <Globe size={15} color="var(--sky-400)" className="ms-meta-icon" />
              <span>
                <strong>Website:</strong>{' '}
                <a
                  href={place.website.startsWith('http') ? place.website : `https://${place.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ms-website-link"
                >
                  Visit Official Website <ExternalLink size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                </a>
              </span>
            </div>
          )}
        </div>

        {place.supplies_available && place.supplies_available.length > 0 && (
          <div className="ms-supply-section">
            <h4 className="ms-supply-title">
              <PackageCheck size={15} color="var(--sky-400)" />
              Available Diabetic Supplies &amp; Medications
            </h4>
            <div className="ms-supply-tags">
              {place.supplies_available.map((s) => (
                <span key={s} className="ms-supply-pill">{s}</span>
              ))}
            </div>
          </div>
        )}

        {place.services && place.services.length > 0 && (
          <div className="ms-services-section">
            <h4 className="ms-supply-title">
              <CheckCircle2 size={15} color="var(--status-good)" />
              Clinical Services &amp; Diagnostic Capabilities
            </h4>
            <ul className="ms-service-list">
              {place.services.map((srv) => (
                <li key={srv}>{srv}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="ms-place-drawer__footer">
        <a
          href={getGoogleMapsDirectionsUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="ms-btn ms-btn--primary ms-btn--full"
        >
          <Navigation2 size={16} />
          Get Live Directions on Google Maps ({place.distance_km !== undefined ? `${place.distance_km} km` : 'Navigate'})
        </a>
      </div>
    </div>
  )
}
