import { useState } from 'react'
import { Stethoscope, Droplet, Heart, User, Activity, AlertOctagon } from 'lucide-react'
import Sidebar from '../components/ui/Sidebar'
import TopBar from '../components/ui/TopBar'
import { RangeField, NumberField } from '../components/ui/Field'
import ResultDashboard from '../components/results/ResultDashboard'
import AnalysingState from '../components/results/AnalysingState'
import Reveal from '../components/ui/Reveal'
import { predictDiabetesRisk } from '../api/api'
import WorkspaceIntro from '../components/ui/WorkspaceIntro'

const INITIAL_FORM = {
  pregnancies: 0,
  glucose: 120,
  blood_pressure: 70,
  skin_thickness: 20,
  insulin: 80,
  bmi: 25.0,
  dpf: 0.5,
  age: 30,
}

const HIGH_RISK_RECS = [
  { text: 'Consult a healthcare professional or endocrinologist as soon as possible' },
  { text: 'Request a full diabetes panel: HbA1c, fasting plasma glucose, oral glucose tolerance test' },
  { text: 'Begin self-monitoring of blood glucose — aim for pre-meal readings below 7 mmol/L' },
  { text: 'Reduce dietary refined sugars and processed carbohydrates; increase fibre intake' },
  { text: 'Start structured physical activity — 150 min/week moderate aerobic exercise' },
  { text: 'Discuss pharmacological management options with your doctor' },
]

const LOW_RISK_RECS = [
  { text: 'Schedule annual blood glucose and HbA1c screening tests' },
  { text: 'Maintain a balanced diet — Mediterranean or low-GI dietary patterns recommended' },
  { text: 'Stay physically active — at least 150 minutes of moderate exercise per week' },
  { text: 'Maintain a healthy weight; even 5–7% weight reduction lowers diabetes risk' },
  { text: 'Stay well-hydrated — aim for 2–3 litres of water daily' },
  { text: 'Prioritise 7–9 hours of quality sleep — poor sleep increases insulin resistance' },
]

/**
 * v2 — the Pima 8-biomarker diabetes model. Extracted verbatim from the
 * original App.jsx: same endpoint, same payload, same clinical thresholds.
 * Only the presentation layer is new.
 */
export default function DiabetesPredictor({ onBack, onNavigate, onOpenCareMap }) {
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: parseFloat(value) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const apiResult = await predictDiabetesRisk(formData)
      // Attach the raw input data so CopilotChat can build patient context
      setResult({ ...apiResult, input_data: formData })
    } catch (err) {
      setError('Failed to connect to the prediction server. Ensure FastAPI is running on port 8000.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getFactors = () => {
    const risks = [], goods = []
    const { glucose, bmi, age, blood_pressure: bp, dpf, insulin } = formData

    if (glucose > 125) risks.push({ level: 'r', text: 'High plasma glucose (>125 mg/dL) — key diabetes marker' })
    else if (glucose < 100) goods.push({ level: 'g', text: 'Normal fasting glucose — within healthy range' })

    if (bmi > 30) risks.push({ level: 'r', text: 'Obesity — BMI >30 significantly raises diabetes risk' })
    else if (bmi >= 18.5 && bmi <= 24.9) goods.push({ level: 'g', text: 'Healthy BMI (18.5–24.9) — reduces metabolic risk' })
    else if (bmi >= 25) risks.push({ level: 'y', text: 'Overweight — BMI between 25–30, borderline risk' })

    if (age > 45) risks.push({ level: 'y', text: 'Age >45 — diabetes prevalence increases with age' })
    else if (age < 35) goods.push({ level: 'g', text: 'Younger age — lower baseline diabetes risk' })

    if (bp > 80) risks.push({ level: 'r', text: 'Elevated diastolic BP (>80 mm Hg) — metabolic risk factor' })
    else if (bp >= 60 && bp <= 80) goods.push({ level: 'g', text: 'Diastolic blood pressure within normal range' })

    if (dpf > 0.8) risks.push({ level: 'r', text: 'High genetic predisposition (DPF >0.8)' })
    else if (dpf > 0.5) risks.push({ level: 'y', text: 'Moderate genetic predisposition (DPF >0.5)' })
    else goods.push({ level: 'g', text: 'Low genetic predisposition (DPF ≤0.5)' })

    if (insulin > 200) risks.push({ level: 'y', text: 'Elevated insulin — possible insulin resistance' })

    return { risks, goods }
  }

  const { risks, goods } = getFactors()
  const recommendations = result?.prediction === 1 ? HIGH_RISK_RECS : LOW_RISK_RECS

  return (
    <div className="app-container ms-risk-workspace">
      <Sidebar title="Patient Biomarkers" accent="sky">
        <form onSubmit={handleSubmit}>
          <h2 className="form-section-title"><User size={14} aria-hidden="true" /> Demographics</h2>
          <RangeField
            label="Age" unit=" yrs" name="age" min={1} max={120}
            value={formData.age} onChange={handleInputChange}
          />
          <NumberField
            label="Pregnancies" name="pregnancies" min={0} max={20}
            value={formData.pregnancies} onChange={handleInputChange}
          />

          <h2 className="form-section-title"><Droplet size={14} aria-hidden="true" /> Biomarkers</h2>
          <NumberField
            label="Glucose" unit="mg/dL" name="glucose"
            value={formData.glucose} onChange={handleInputChange}
          />
          <NumberField
            label="Insulin" unit="mu U/ml" name="insulin"
            value={formData.insulin} onChange={handleInputChange}
          />
          <NumberField
            label="Skin Thickness" unit="mm" name="skin_thickness"
            value={formData.skin_thickness} onChange={handleInputChange}
          />

          <h2 className="form-section-title"><Heart size={14} aria-hidden="true" /> Vitals &amp; Indices</h2>
          <NumberField
            label="Blood Pressure" unit="mm Hg" name="blood_pressure"
            value={formData.blood_pressure} onChange={handleInputChange}
          />
          <NumberField
            label="BMI" name="bmi" step={0.1}
            value={formData.bmi} onChange={handleInputChange}
          />
          <NumberField
            label="Diabetes Pedigree" name="dpf" step={0.01}
            value={formData.dpf} onChange={handleInputChange}
          />

          <button type="submit" disabled={loading} className="submit-btn">
            {loading
              ? <><span className="spinner" aria-hidden="true" /> Analysing…</>
              : <><Stethoscope size={18} aria-hidden="true" /> Analyze Patient Risk</>}
          </button>
        </form>

        {error && (
          <p className="ms-alert" role="alert">
            <AlertOctagon size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
          </p>
        )}
      </Sidebar>

      <div className="content-wrapper">
        <TopBar
          moduleName="Diabetes Risk · v2"
          accent="sky"
          activeModule="v2"
          onNavigate={onNavigate}
          onBack={onBack}
        />

        <WorkspaceIntro
          code="PREDICT-01"
          title="Diabetes risk intelligence"
          description="Turn eight essential biomarkers into an explainable probability, a balanced factor view and a clear path to next-step care."
          metrics={[[8, 'Biomarkers'], ['SVM', 'Model'], ['SHAP', 'Explainability']]}
        />

        <main className="dashboard-area" id="main">
          {loading && <AnalysingState accent="sky" />}

          {!result && !loading && (
            <Reveal>
              <div className="glass-panel ms-empty">
                <div>
                  <div className="ms-empty__icon ms-empty__icon--sky">
                    <Activity size={38} aria-hidden="true" />
                  </div>
                  <h2 className="ms-empty__title">Clinical Intelligence Dashboard</h2>
                  <p className="ms-empty__body">
                    Enter patient data in the sidebar and select
                    <strong style={{ color: 'var(--sky-300)' }}> Analyze Patient Risk</strong> to
                    view the SVM prediction, probability breakdown and SHAP explanation.
                  </p>
                  <div className="ms-stat-row" style={{ marginTop: 'var(--sp-6)' }}>
                    {[
                      ['SVM', 'Model'],
                      ['8', 'Biomarkers'],
                      ['~85%', 'Accuracy'],
                      ['Pima', 'Dataset'],
                    ].map(([value, label]) => (
                      <div className="ms-stat" key={label}>
                        <div className="ms-stat__value">{value}</div>
                        <div className="ms-stat__label">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          )}

          {result && !loading && (
            <ResultDashboard
              result={result}
              risks={risks}
              goods={goods}
              recommendations={recommendations}
              accent="sky"
              assessmentLabel="Clinical Assessment"
              highRiskText="High Risk — Diabetic"
              lowRiskText="Low Risk — Non-Diabetic"
              negativeLabel="Non-Diabetic Probability"
              positiveLabel="Diabetic Probability"
              gaugeCaption="Diabetes risk"
              shapDescription="How each biomarker influenced the model's decision. Features pushing right increase diabetes risk; features pushing left lower it."
              disclaimer="This tool is for educational purposes only. It does not constitute medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional."
              onOpenCareMap={onOpenCareMap}
            />
          )}
        </main>
      </div>

    </div>
  )
}
