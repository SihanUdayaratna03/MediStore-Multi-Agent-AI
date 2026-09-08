import TopBar from '../components/ui/TopBar'
import CareMap from '../components/maps/CareMap'
import '../components/maps/CareMap.css'

export default function CareLocator({ onBack, onNavigate, riskLevel = 'all', preselectedCategory = 'all' }) {
  return (
    <div className="ms-care-locator-page">
      <TopBar
        moduleName="Care & Diabetic Supply Network"
        accent="sky"
        activeModule="care-locator"
        onNavigate={onNavigate}
        onBack={onBack}
        status="Location-aware directory"
      />
      <main className="ms-care-locator-main">
        <CareMap riskLevel={riskLevel} preselectedCategory={preselectedCategory} />
      </main>
    </div>
  )
}
