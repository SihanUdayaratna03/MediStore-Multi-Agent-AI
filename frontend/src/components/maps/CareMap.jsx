import { useState, useCallback, useEffect } from 'react'
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api'
import { AlertTriangle, Building2, Package, Search, X, Layers, Sparkles, MapPin, Compass, Navigation } from 'lucide-react'
import { darkMedicalMapStyle } from './mapStyles'
import MapFilterBar from './MapFilterBar'
import PlaceDetailsModal from './PlaceDetailsModal'
import { searchNearbyPlaces, searchPlacesByName } from '../../api/api'

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '16px',
}

const DEFAULT_CENTER = { lat: 6.9271, lng: 79.8612 } // Colombo Reference

const MARKER_ICONS = {
  endocrinologist: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
  pharmacy: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
  laboratory: 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png',
  podiatry: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
  emergency: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
}

export default function CareMap({ riskLevel = 'all', preselectedCategory = 'all' }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'medistore-google-map',
    googleMapsApiKey: apiKey,
  })

  const [center, setCenter] = useState(DEFAULT_CENTER)
  const [userLocation, setUserLocation] = useState({ lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng, isLive: false })
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [activeCategory, setActiveCategory] = useState(preselectedCategory)
  const [isLocating, setIsLocating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchedTerm, setSearchedTerm] = useState('')
  const [locationError, setLocationError] = useState('')

  // Fetch facilities based on current user coordinates & category
  const fetchPlaces = useCallback(async (lat, lng, category) => {
    setLoading(true)
    try {
      const places = await searchNearbyPlaces({
        lat,
        lng,
        category,
        riskLevel,
      })
      setFacilities(places || [])
      setSearchedTerm('')
    } catch (err) {
      console.error('Error fetching nearby places:', err)
    } finally {
      setLoading(false)
    }
  }, [riskLevel])

  // Try detecting user's live location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const liveLoc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            isLive: true
          }
          setUserLocation(liveLoc)
          setCenter({ lat: liveLoc.lat, lng: liveLoc.lng })
          fetchPlaces(liveLoc.lat, liveLoc.lng, activeCategory)
        },
        () => {
          // If denied, fallback to default center
          fetchPlaces(userLocation.lat, userLocation.lng, activeCategory)
        },
        { timeout: 8000, enableHighAccuracy: true }
      )
    } else {
      fetchPlaces(userLocation.lat, userLocation.lng, activeCategory)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Execute precise search by pharmacy / hospital name or city
  const executeSearch = async (query) => {
    const q = query.trim()
    if (!q) {
      fetchPlaces(userLocation.lat, userLocation.lng, activeCategory)
      return
    }

    setLoading(true)
    try {
      const results = await searchPlacesByName({
        query: q,
        lat: userLocation.lat,
        lng: userLocation.lng,
      })

      if (results && results.length > 0) {
        setFacilities(results)
        setSearchedTerm(q)
        const topResult = results[0]
        setCenter({ lat: topResult.lat, lng: topResult.lng })
        setSelectedPlace(topResult)
      } else {
        setFacilities([])
        setSearchedTerm(q)
      }
    } catch (err) {
      console.error('Error searching places by name:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    executeSearch(searchQuery)
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setSearchedTerm('')
    fetchPlaces(userLocation.lat, userLocation.lng, activeCategory)
  }

  // Detect Live GPS Location of the user
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Location services are not available in this browser. Showing the Colombo reference area instead.')
      return
    }
    setLocationError('')
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const liveLoc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          isLive: true
        }
        setUserLocation(liveLoc)
        setCenter({ lat: liveLoc.lat, lng: liveLoc.lng })
        setIsLocating(false)
        // If there's an active search term, re-query using the new GPS coordinates as origin
        if (searchQuery.trim()) {
          searchPlacesByName({
            query: searchQuery.trim(),
            lat: liveLoc.lat,
            lng: liveLoc.lng
          }).then((res) => {
            setFacilities(res || [])
            if (res && res.length > 0) setSelectedPlace(res[0])
          })
        } else {
          fetchPlaces(liveLoc.lat, liveLoc.lng, activeCategory)
        }
      },
      (err) => {
        console.warn('Geolocation denied or failed:', err)
        setIsLocating(false)
        setLocationError('We could not access your location. Allow location permission to see precise distances, or continue with the reference area.')
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }

  if (loadError) {
    return (
      <div className="ms-map-error glass-panel">
        <AlertTriangle size={32} color="var(--status-critical)" />
        <h3>The care map is temporarily unavailable</h3>
        <p>Nearby facilities cannot be displayed right now. Please try again in a moment.</p>
      </div>
    )
  }

  return (
    <div className="ms-care-locator-layout">
      {/* Top Filter Bar */}
      <MapFilterBar
        activeCategory={activeCategory}
        onSelectCategory={(cat) => {
          setSearchQuery('')
          setSearchedTerm('')
          setActiveCategory(cat)
          fetchPlaces(userLocation.lat, userLocation.lng, cat)
        }}
        onDetectLocation={handleDetectLocation}
        isLocating={isLocating}
        riskLevel={riskLevel}
      />

      {locationError && (
        <div className="ms-location-notice" role="status">
          <AlertTriangle size={15} aria-hidden="true" />
          <span>{locationError}</span>
          <button type="button" onClick={() => setLocationError('')} aria-label="Dismiss location notice"><X size={14} /></button>
        </div>
      )}

      {/* Main Full-Height Workspace */}
      <div className="ms-map-content-grid">
        {/* Left: Facility Sidebar */}
        <aside className="ms-facility-sidebar glass-panel">
          <form onSubmit={handleSearchSubmit} className="ms-map-search-form">
            <Search size={16} className="ms-search-icon" />
            <input
              type="text"
              aria-label="Search healthcare providers or cities"
              placeholder="Search pharmacy, hospital, clinic or city (e.g. Asiri, Kandy, Healthguard)…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ms-map-search-input"
            />
            {searchQuery ? (
              <button
                type="button"
                className="ms-search-clear"
                onClick={handleClearSearch}
                aria-label="Clear search"
                title="Clear search"
              >
                <X size={14} />
              </button>
            ) : (
              <button
                type="submit"
                className="ms-search-submit-btn"
                title="Search healthcare provider"
              >
                <Sparkles size={14} />
              </button>
            )}
          </form>

          {/* Location Origin & Counter */}
          <div className="ms-facility-meta-header">
            <span className="ms-facility-count">
              <Layers size={13} color="var(--sky-400)" />
              {searchedTerm ? (
                <span>Results for: <strong style={{ color: 'var(--sky-200)' }}>"{searchedTerm}"</strong></span>
              ) : (
                <span>{facilities.length} {facilities.length === 1 ? 'Location' : 'Locations'} (Sorted by Proximity)</span>
              )}
            </span>
            {userLocation.isLive ? (
              <span className="ms-live-gps-pill" title="All distances measured exactly from your live GPS coordinates">
                <Navigation size={11} /> Live GPS Active
              </span>
            ) : (
              <button
                type="button"
                onClick={handleDetectLocation}
                className="ms-enable-gps-pill"
                title="Click to enable live GPS distance calculation"
              >
                <Compass size={11} /> Enable My Location
              </button>
            )}
            {searchedTerm && (
              <button type="button" onClick={handleClearSearch} className="ms-reset-search-btn">
                Reset
              </button>
            )}
          </div>

          {/* Scrollable Facility Cards */}
          <div className="ms-facility-list">
            {loading ? (
              <div className="ms-map-loading">
                <span className="spinner" />
                <p>Calculating exact GPS distances &amp; verifying facility details…</p>
              </div>
            ) : facilities.length === 0 ? (
              <div className="ms-map-empty">
                <Building2 size={32} color="var(--text-dim)" />
                <p>No facilities found matching "{searchedTerm || searchQuery}".</p>
                <button
                  type="button"
                  className="ms-btn ms-btn--ghost ms-btn--sm"
                  onClick={handleClearSearch}
                  style={{ marginTop: '8px' }}
                >
                  View All Nearby Facilities
                </button>
              </div>
            ) : (
              facilities.map((fac) => (
                <button
                  type="button"
                  key={fac.id}
                  className={`ms-facility-card ${selectedPlace?.id === fac.id ? 'ms-facility-card--selected' : ''}`}
                  aria-pressed={selectedPlace?.id === fac.id}
                  onClick={() => {
                    setSelectedPlace(fac)
                    setCenter({ lat: fac.lat, lng: fac.lng })
                  }}
                >
                  <div className="ms-facility-card__header">
                    <span className="ms-facility-badge">{fac.category_label}</span>
                    <span className="ms-facility-distance">
                      <MapPin size={11} style={{ display: 'inline', marginRight: 2 }} />
                      <strong>{fac.distance_km !== undefined ? `${fac.distance_km} km` : 'Near'}</strong> {userLocation.isLive ? 'away' : ''}
                    </span>
                  </div>
                  <h4 className="ms-facility-card__title">{fac.name}</h4>
                  <p className="ms-facility-card__addr">{fac.address}</p>

                  {fac.supplies_available && fac.supplies_available.length > 0 && (
                    <div className="ms-facility-supplies">
                      <Package size={12} color="var(--sky-400)" />
                      <span>{fac.supplies_available.slice(0, 2).join(' · ')}</span>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right: Google Map Canvas */}
        <div className="ms-map-canvas-wrapper glass-panel">
          {!isLoaded ? (
            <div className="ms-map-loading">
              <span className="spinner" />
              <p>Initializing Google Maps Interface…</p>
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={13}
              options={{
                styles: darkMedicalMapStyle,
                disableDefaultUI: false,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: true,
              }}
            >
              {/* User Live Starting Location Marker */}
              <MarkerF
                position={{ lat: userLocation.lat, lng: userLocation.lng }}
                title={userLocation.isLive ? "Your Current Live Location (Starting Point)" : "Starting Location Reference"}
                icon="https://maps.google.com/mapfiles/ms/icons/blue-pushpin.png"
              />

              {/* Facility Markers */}
              {facilities.map((fac) => (
                <MarkerF
                  key={fac.id}
                  position={{ lat: fac.lat, lng: fac.lng }}
                  title={`${fac.name} (${fac.distance_km} km from starting point)`}
                  icon={MARKER_ICONS[fac.category] || MARKER_ICONS.endocrinologist}
                  onClick={() => {
                    setSelectedPlace(fac)
                    setCenter({ lat: fac.lat, lng: fac.lng })
                  }}
                />
              ))}

              {selectedPlace && (
                <InfoWindowF
                  position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
                  onCloseClick={() => setSelectedPlace(null)}
                >
                  <div className="ms-info-window">
                    <strong className="ms-info-title">{selectedPlace.name}</strong>
                    <p className="ms-info-addr">{selectedPlace.address}</p>
                    <span style={{ fontSize: '0.74rem', color: '#278f7f', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                      <MapPin size={13} aria-hidden="true" /> {selectedPlace.distance_km !== undefined ? `${selectedPlace.distance_km} km from you` : 'Near you'}
                    </span>
                    <button
                      type="button"
                      className="ms-info-btn"
                      onClick={() => setSelectedPlace(selectedPlace)}
                    >
                      View Full Details &amp; Supplies
                    </button>
                  </div>
                </InfoWindowF>
              )}
            </GoogleMap>
          )}

          {/* Detailed Floating Details Drawer */}
          <PlaceDetailsModal
            place={selectedPlace}
            onClose={() => setSelectedPlace(null)}
            userLocation={userLocation}
          />
        </div>
      </div>
    </div>
  )
}
