import { Stethoscope, Pill, FlaskConical, AlertCircle, Sparkles, Navigation } from 'lucide-react'

const CATEGORIES = [
    { id: 'all', label: 'All Facilities', icon: Sparkles },
    { id: 'endocrinologist', label: 'Endocrinologists & Specialists', icon: Stethoscope },
    { id: 'pharmacy', label: 'MediStore Pharmacies & Supplies', icon: Pill },
    { id: 'laboratory', label: 'Diagnostic Labs (HbA1c)', icon: FlaskConical },
    { id: 'emergency', label: '24/7 Emergency ER', icon: AlertCircle },
]

export default function MapFilterBar({ activeCategory, onSelectCategory, onDetectLocation, isLocating, riskLevel }) {
    return (
        <div className="ms-map-filter-bar">
            <div className="ms-map-categories">
                {CATEGORIES.map((cat) => {
                    const Icon = cat.icon
                    const isActive = activeCategory === cat.id
                    const isRecommended = (riskLevel === 'high' && (cat.id === 'endocrinologist' || cat.id === 'pharmacy'))
                    return (
                        <button
                            key={cat.id}
                            type="button"
                            className={`ms-filter-chip ${isActive ? 'ms-filter-chip--active' : ''}`}
                            onClick={() => onSelectCategory(cat.id)}
                        >
                            <Icon size={15} aria-hidden="true" />
                            <span>{cat.label}</span>
                            {isRecommended && <span className="ms-recommended-badge">Recommended</span>}
                        </button>
                    )
                })}
            </div>

            <button
                type="button"
                className="ms-btn-locate"
                onClick={onDetectLocation}
                disabled={isLocating}
                title="Find care near my current location"
            >
                <Navigation size={15} className={isLocating ? 'ms-spin' : ''} />
                <span>{isLocating ? 'Locating…' : 'My Location'}</span>
            </button>
        </div>
    )
}
