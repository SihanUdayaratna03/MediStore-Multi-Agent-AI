import { useState } from 'react'
import {
  Activity, Stethoscope, User, Heart, Pill, FlaskConical,
  Building2, ClipboardList, ChevronDown, AlertOctagon,
} from 'lucide-react'
import Sidebar from '../components/ui/Sidebar'
import TopBar from '../components/ui/TopBar'
import { Field, RangeField, NumberField, SelectField } from '../components/ui/Field'
import ResultDashboard from '../components/results/ResultDashboard'
import { predictComplicationRisk } from '../api/api'
import AnalysingState from '../components/results/AnalysingState'
import Reveal from '../components/ui/Reveal'
import WorkspaceIntro from '../components/ui/WorkspaceIntro'

// ─── Option maps ──────────────────────────────────────────────────────────────
const MED_OPTIONS = [[0, 'No'], [1, 'Steady'], [2, 'Up'], [-1, 'Down']]

const ICD9_LABELS = {
  0: 'Unknown / Other',         1: 'Infectious & Parasitic',
  2: 'Neoplasms (Cancer)',      3: 'Endocrine / Diabetes',
  4: 'Blood Diseases',          5: 'Mental Disorders',
  6: 'Nervous System',          7: 'Circulatory System',
  8: 'Respiratory',             9: 'Digestive',
  10: 'Genitourinary',          11: 'Pregnancy / Childbirth',
  12: 'Skin Diseases',          13: 'Musculoskeletal',
  14: 'Congenital Anomalies',   15: 'Perinatal Conditions',
  16: 'Symptoms / Ill-defined', 17: 'Injury / Poisoning',
}

const ADMISSION_TYPE = {
  1: 'Emergency', 2: 'Urgent', 3: 'Elective',
  4: 'Newborn',   5: 'Not Available', 7: 'Trauma Center',
}

const ADMISSION_SOURCE = {
  1: 'Physician / Clinic Referral', 2: 'HMO Referral',
  3: 'Transfer from Hospital',      7: 'Emergency Room',
  9: 'Not Available',
}

const DISCHARGE_DISP = {
  1: 'Discharged to Home',
  2: 'Discharged to Short-term Hospital',
  3: 'Discharged to SNF',
  6: 'Discharged to Home Health',
  7: 'Left AMA',
  11: 'Not Available',
}

const AGE_OPTIONS = [
  [5, '[0–10)'],  [15, '[10–20)'], [25, '[20–30)'], [35, '[30–40)'],
  [45, '[40–50)'], [55, '[50–60)'], [65, '[60–70)'], [75, '[70–80)'],
  [85, '[80–90)'], [95, '[90–100)'],
]

const OTHER_MEDS = [
  ['glipizide', 'Glipizide'],
  ['glyburide', 'Glyburide'],
  ['glimepiride', 'Glimepiride'],
  ['pioglitazone', 'Pioglitazone'],
  ['rosiglitazone', 'Rosiglitazone'],
  ['repaglinide', 'Repaglinide'],
  ['nateglinide', 'Nateglinide'],
  ['chlorpropamide', 'Chlorpropamide'],
  ['acarbose', 'Acarbose'],
  ['tolbutamide', 'Tolbutamide'],
  ['miglitol', 'Miglitol'],
  ['acetohexamide', 'Acetohexamide'],
  ['tolazamide', 'Tolazamide'],
  ['troglitazone', 'Troglitazone'],
  ['glyburide_metformin', 'Glyburide–Metformin'],
  ['glipizide_metformin', 'Glipizide–Metformin'],
  ['glimepiride_pioglitazone', 'Glimepiride–Pioglitazone'],
  ['metformin_rosiglitazone', 'Metformin–Rosiglitazone'],
  ['metformin_pioglitazone', 'Metformin–Pioglitazone'],
]

const toOptions = (map) => Object.entries(map)

// ─── Defaults ─────────────────────────────────────────────────────────────────
// Modal / median values from the UCI-130 training set. Always sent to the
// model — the user only needs to override the "essential" fields shown upfront.
const DEFAULT_FORM = {
  // Essential — always shown
  gender: 1, age: 55,
  admission_type_id: 1, admission_source_id: 7, time_in_hospital: 3,
  num_lab_procedures: 40, num_medications: 15,
  number_diagnoses: 9, diag_1: 3,
  max_glu_serum: 0, a1cresult: 0,
  metformin: 0, insulin: 1,
  change: 0, diabetesmed: 1,
  race_Asian: 0, race_Caucasian: 1, race_Hispanic: 0, race_Other: 0,

  // Advanced — hidden by default, sensible defaults applied
  discharge_disposition_id: 1,
  num_procedures: 1,
  diag_2: 3, diag_3: 7,
  number_outpatient: 0, number_emergency: 0, number_inpatient: 0,
  repaglinide: 0, nateglinide: 0, chlorpropamide: 0,
  glimepiride: 0, acetohexamide: 0, glipizide: 0, glyburide: 0,
  tolbutamide: 0, pioglitazone: 0, rosiglitazone: 0, acarbose: 0,
  miglitol: 0, troglitazone: 0, tolazamide: 0,
  glyburide_metformin: 0, glipizide_metformin: 0,
  glimepiride_pioglitazone: 0, metformin_rosiglitazone: 0,
  metformin_pioglitazone: 0,
}

const HIGH_RISK_RECS = [
  { text: 'Immediate follow-up with diabetologist or endocrinologist — do not delay' },
  { text: 'Establish intensive glucose monitoring protocol — target HbA1c below 7%' },
  { text: 'Review and optimise current pharmacological regimen with the clinical team' },
  { text: 'Order full metabolic panel: renal function, lipids, liver enzymes, HbA1c' },
  { text: 'Refer to a clinical dietitian for personalised medical nutrition therapy' },
  { text: 'Develop a structured discharge plan with a 7-day post-discharge follow-up' },
]

const LOW_RISK_RECS = [
  { text: 'Schedule quarterly HbA1c monitoring and annual comprehensive metabolic panel' },
  { text: 'Maintain structured physical activity — 150 min/week moderate aerobic exercise' },
  { text: 'Adhere to a balanced, low-GI diet; limit refined carbohydrates and processed foods' },
  { text: 'Continue current medication regimen and reinforce adherence with patient education' },
  { text: 'Monitor weight trajectory; target BMI 18.5–24.9 to reduce complication risk' },
  { text: 'Ensure 7–9 hours of quality sleep — poor sleep significantly worsens glycaemic control' },
]

// ─── Collapsible advanced section ─────────────────────────────────────────────
function AdvancedSection({ form, onChange }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ marginTop: 'var(--sp-2)' }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        aria-controls="advanced-fields"
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem',
          background: open ? 'rgba(201,179,111,0.14)' : 'rgba(201,179,111,0.06)',
          border: '1px solid rgba(201,179,111,0.3)',
          borderRadius: 'var(--r-md)',
          padding: '0.8rem 1rem',
          cursor: 'pointer',
          color: 'var(--violet-300)',
          transition: 'background var(--dur-base) var(--ease-out)',
          marginBottom: open ? 'var(--sp-4)' : 0,
        }}
      >
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: '0.78rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.09em',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <span style={{
            width: 18, height: 18, borderRadius: '50%',
            background: 'rgba(201,179,111,0.22)', border: '1px solid rgba(201,179,111,0.46)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.7rem', fontWeight: 800, color: 'var(--violet-400)',
          }} aria-hidden="true">
            {open ? '−' : '+'}
          </span>
          Advanced Fields
        </span>
          <span style={{ fontSize: '0.7rem', color: 'rgba(240,232,207,0.68)', fontFamily: 'var(--font-body)' }}>
          {open ? 'Collapse' : '29 optional'}
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform var(--dur-base) var(--ease-out)',
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div
          id="advanced-fields"
          className="ms-fade-in"
          style={{
            background: 'rgba(201,179,111,0.04)',
            border: '1px solid rgba(201,179,111,0.18)',
            borderRadius: 'var(--r-md)',
            padding: 'var(--sp-4)',
            marginBottom: 'var(--sp-2)',
          }}
        >
          <p style={{
            fontSize: '0.72rem', color: 'var(--text-dim)',
            marginBottom: 'var(--sp-4)', lineHeight: 1.6, fontStyle: 'italic',
          }}>
            These fields are pre-filled with typical values from the UCI-130 dataset.
            Override them only when you have specific patient data available.
          </p>

          <h2 className="form-section-title form-section-title--violet" style={{ marginTop: 0 }}>
            <Building2 size={12} aria-hidden="true" /> Discharge
          </h2>
          <SelectField
            label="Discharge Disposition" name="discharge_disposition_id"
            value={form.discharge_disposition_id} onChange={onChange}
            options={toOptions(DISCHARGE_DISP)}
          />

          <h2 className="form-section-title form-section-title--violet">
            <ClipboardList size={12} aria-hidden="true" /> Prior Utilisation
          </h2>
          <NumberField
            label="Outpatient Visits (prior year)" name="number_outpatient"
            min={0} max={42} value={form.number_outpatient} onChange={onChange}
          />
          <NumberField
            label="Emergency Visits (prior year)" name="number_emergency"
            min={0} max={76} value={form.number_emergency} onChange={onChange}
          />
          <NumberField
            label="Inpatient Visits (prior year)" name="number_inpatient"
            min={0} max={21} value={form.number_inpatient} onChange={onChange}
          />

          <h2 className="form-section-title form-section-title--violet">
            <ClipboardList size={12} aria-hidden="true" /> Additional Diagnoses
          </h2>
          <NumberField
            label="Procedures Performed" name="num_procedures"
            min={0} max={6} value={form.num_procedures} onChange={onChange}
          />
          <SelectField
            label="Secondary Diagnosis (ICD-9)" name="diag_2"
            value={form.diag_2} onChange={onChange} options={toOptions(ICD9_LABELS)}
          />
          <SelectField
            label="Tertiary Diagnosis (ICD-9)" name="diag_3"
            value={form.diag_3} onChange={onChange} options={toOptions(ICD9_LABELS)}
          />

          <h2 className="form-section-title form-section-title--violet">
            <Pill size={12} aria-hidden="true" /> Other Medications
          </h2>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.85rem', lineHeight: 1.5 }}>
            Dosage status: No / Steady / Up / Down
          </p>
          {OTHER_MEDS.map(([name, label]) => (
            <SelectField
              key={name} label={label} name={name}
              value={form[name]} onChange={onChange} options={MED_OPTIONS}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ComplicationPredictor({ onBack, onNavigate, onOpenCareMap }) {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: parseFloat(value) }))
  }

  const handleRace = (race) => {
    setForm((prev) => ({
      ...prev,
      race_Asian:     race === 'Asian'     ? 1 : 0,
      race_Caucasian: race === 'Caucasian' ? 1 : 0,
      race_Hispanic:  race === 'Hispanic'  ? 1 : 0,
      race_Other:     race === 'Other'     ? 1 : 0,
    }))
  }

  const currentRace = () => {
    if (form.race_Asian)     return 'Asian'
    if (form.race_Caucasian) return 'Caucasian'
    if (form.race_Hispanic)  return 'Hispanic'
    if (form.race_Other)     return 'Other'
    return 'AfricanAmerican'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload = {
        ...form,
        gender:                    parseInt(form.gender),
        age:                       parseInt(form.age),
        admission_type_id:         parseInt(form.admission_type_id),
        discharge_disposition_id:  parseInt(form.discharge_disposition_id),
        admission_source_id:       parseInt(form.admission_source_id),
        time_in_hospital:          parseInt(form.time_in_hospital),
        num_lab_procedures:        parseInt(form.num_lab_procedures),
        num_procedures:            parseInt(form.num_procedures),
        num_medications:           parseInt(form.num_medications),
        number_outpatient:         parseInt(form.number_outpatient),
        number_emergency:          parseInt(form.number_emergency),
        number_inpatient:          parseInt(form.number_inpatient),
        diag_1:                    parseInt(form.diag_1),
        diag_2:                    parseInt(form.diag_2),
        diag_3:                    parseInt(form.diag_3),
        number_diagnoses:          parseInt(form.number_diagnoses),
      }
      setResult(await predictComplicationRisk(payload))
    } catch (err) {
      setError('Failed to connect to the complication risk server. Ensure the v3 API is running on port 8001.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // ── Factor analysis ────────────────────────────────────────────────────────
  const getFactors = () => {
    const risks = [], goods = []
    const { a1cresult, max_glu_serum, number_inpatient, time_in_hospital,
            number_emergency, age, number_diagnoses, diabetesmed, change } = form

    if (a1cresult >= 3)       risks.push({ level: 'r', text: 'A1c result >8% — severely uncontrolled glycaemia' })
    else if (a1cresult === 2) risks.push({ level: 'y', text: 'A1c result >7% — moderately elevated, intervention needed' })
    else if (a1cresult === 1) goods.push({ level: 'g', text: 'A1c within normal range — good glycaemic control' })

    if (max_glu_serum >= 3)       risks.push({ level: 'r', text: 'Max glucose serum >300 mg/dL — critical hyperglycaemia' })
    else if (max_glu_serum === 2) risks.push({ level: 'y', text: 'Max glucose serum >200 mg/dL — elevated blood glucose' })
    else if (max_glu_serum === 1) goods.push({ level: 'g', text: 'Serum glucose within normal range' })

    if (number_inpatient >= 2)       risks.push({ level: 'r', text: `${number_inpatient} prior inpatient visits — high care dependency` })
    else if (number_inpatient === 1) risks.push({ level: 'y', text: '1 prior inpatient visit — moderate readmission risk' })
    else                             goods.push({ level: 'g', text: 'No prior inpatient visits — lower readmission baseline' })

    if (number_emergency >= 2)       risks.push({ level: 'r', text: `${number_emergency} emergency visits — unstable management` })
    else if (number_emergency === 1) risks.push({ level: 'y', text: '1 emergency visit — borderline instability signal' })

    if (time_in_hospital > 7)  risks.push({ level: 'y', text: `Extended hospital stay (${time_in_hospital} days) — complex case` })
    else                       goods.push({ level: 'g', text: `Short hospital stay (${time_in_hospital} days) — manageable case` })

    if (age >= 75)      risks.push({ level: 'r', text: 'Age ≥75 — elevated physiological frailty and complication risk' })
    else if (age >= 55) risks.push({ level: 'y', text: 'Age ≥55 — moderate age-related diabetes complication risk' })
    else                goods.push({ level: 'g', text: 'Younger age — lower baseline complication risk' })

    if (number_diagnoses >= 8)      risks.push({ level: 'r', text: `${number_diagnoses} co-diagnoses — high comorbidity burden` })
    else if (number_diagnoses >= 5) risks.push({ level: 'y', text: `${number_diagnoses} co-diagnoses — moderate comorbidity load` })
    else                            goods.push({ level: 'g', text: `Low comorbidity count (${number_diagnoses}) — simpler clinical picture` })

    if (diabetesmed === 1)  goods.push({ level: 'g', text: 'Prescribed diabetes medication — active pharmacological management' })
    else                    risks.push({ level: 'y', text: 'No diabetes medication — possible under-management' })

    if (change === 1) risks.push({ level: 'y', text: 'Medication regimen changed — may indicate instability' })
    else              goods.push({ level: 'g', text: 'Stable medication regimen — consistent treatment' })

    return { risks, goods }
  }

  const { risks, goods } = getFactors()
  const recommendations = result?.prediction === 1 ? HIGH_RISK_RECS : LOW_RISK_RECS

  return (
    <div className="app-container">
      <Sidebar title="Patient Record" accent="violet">
        <div className="ms-pill" style={{
          background: 'rgba(201,179,111,0.14)',
          borderColor: 'rgba(201,179,111,0.34)',
          color: 'var(--violet-300)',
          marginBottom: 'var(--sp-5)',
        }}>
          <Activity size={13} aria-hidden="true" /> Complication Risk · v3
        </div>

        <form onSubmit={handleSubmit} className="ms-form--violet">

          <h2 className="form-section-title form-section-title--violet">
            <User size={13} aria-hidden="true" /> Demographics
          </h2>
          <SelectField
            label="Gender" name="gender" value={form.gender} onChange={handleChange}
            options={[[1, 'Male'], [0, 'Female']]}
          />
          <SelectField
            label="Age Bracket" name="age" value={form.age} onChange={handleChange}
            options={AGE_OPTIONS}
          />
          <Field label="Race / Ethnicity">
            {(id) => (
              <select
                id={id}
                className="input-field"
                value={currentRace()}
                onChange={(e) => handleRace(e.target.value)}
              >
                <option value="AfricanAmerican">African American</option>
                <option value="Asian">Asian</option>
                <option value="Caucasian">Caucasian</option>
                <option value="Hispanic">Hispanic</option>
                <option value="Other">Other</option>
              </select>
            )}
          </Field>

          <h2 className="form-section-title form-section-title--violet">
            <Building2 size={13} aria-hidden="true" /> Hospital Visit
          </h2>
          <SelectField
            label="Admission Type" name="admission_type_id"
            value={form.admission_type_id} onChange={handleChange}
            options={toOptions(ADMISSION_TYPE)}
          />
          <SelectField
            label="Admission Source" name="admission_source_id"
            value={form.admission_source_id} onChange={handleChange}
            options={toOptions(ADMISSION_SOURCE)}
          />
          <RangeField
            label="Days in Hospital" name="time_in_hospital" min={1} max={14}
            value={form.time_in_hospital} onChange={handleChange}
          />

          <h2 className="form-section-title form-section-title--violet">
            <ClipboardList size={13} aria-hidden="true" /> Clinical
          </h2>
          <RangeField
            label="Lab Procedures" name="num_lab_procedures" min={1} max={132}
            value={form.num_lab_procedures} onChange={handleChange}
          />
          <NumberField
            label="Number of Medications" name="num_medications"
            min={1} max={81} value={form.num_medications} onChange={handleChange}
          />
          <NumberField
            label="Number of Diagnoses" name="number_diagnoses"
            min={1} max={16} value={form.number_diagnoses} onChange={handleChange}
          />
          <SelectField
            label="Primary Diagnosis (ICD-9)" name="diag_1"
            value={form.diag_1} onChange={handleChange} options={toOptions(ICD9_LABELS)}
          />

          <h2 className="form-section-title form-section-title--violet">
            <FlaskConical size={13} aria-hidden="true" /> Lab Results
          </h2>
          <SelectField
            label="A1c Result" name="a1cresult" value={form.a1cresult} onChange={handleChange}
            options={[[0, 'Not Tested'], [1, 'Normal'], [2, '>7%'], [3, '>8%']]}
          />
          <SelectField
            label="Max Glucose Serum" name="max_glu_serum"
            value={form.max_glu_serum} onChange={handleChange}
            options={[[0, 'Not Tested'], [1, 'Normal'], [2, '>200 mg/dL'], [3, '>300 mg/dL']]}
          />

          <h2 className="form-section-title form-section-title--violet">
            <Pill size={13} aria-hidden="true" /> Key Medications
          </h2>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginBottom: '0.9rem', lineHeight: 1.5 }}>
            Dosage status: No / Steady / Up / Down
          </p>
          <SelectField
            label="Metformin" name="metformin" value={form.metformin}
            onChange={handleChange} options={MED_OPTIONS}
          />
          <SelectField
            label="Insulin" name="insulin" value={form.insulin}
            onChange={handleChange} options={MED_OPTIONS}
          />

          <h2 className="form-section-title form-section-title--violet">
            <Heart size={13} aria-hidden="true" /> Management
          </h2>
          <SelectField
            label="Medication Change" name="change" value={form.change}
            onChange={handleChange} options={[[0, 'No Change'], [1, 'Changed']]}
          />
          <SelectField
            label="Diabetes Medication Prescribed" name="diabetesmed"
            value={form.diabetesmed} onChange={handleChange}
            options={[[1, 'Yes'], [0, 'No']]}
          />

          <AdvancedSection form={form} onChange={handleChange} />

          <button
            type="submit"
            disabled={loading}
            className="submit-btn"
            style={{
              background: 'linear-gradient(135deg, var(--violet-500), var(--violet-700))',
              borderColor: 'rgba(240,232,207,0.4)',
              boxShadow: '0 6px 22px rgba(135,109,53,0.38), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
          >
            {loading
              ? <><span className="spinner" aria-hidden="true" /> Assessing…</>
              : <><Stethoscope size={18} aria-hidden="true" /> Assess Complication Risk</>}
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
          moduleName="Complication Risk · v3"
          accent="violet"
          activeModule="v3"
          onNavigate={onNavigate}
          onBack={onBack}
        />

        <WorkspaceIntro
          code="PREDICT-02"
          title="Complication risk intelligence"
          description="Synthesise clinical history, admissions, diagnostics and medication context into an early readmission risk signal."
          metrics={[[52, 'Clinical features'], ['3×', 'Model ensemble'], ['SHAP', 'Explainability']]}
          accent="violet"
        />

        <main className="dashboard-area" id="main">
          {loading && <AnalysingState accent="violet" />}

          {!result && !loading && (
            <Reveal>
              <div className="glass-panel ms-empty">
                <div>
                  <div className="ms-empty__icon ms-empty__icon--violet">
                    <Activity size={38} aria-hidden="true" />
                  </div>
                  <h2 className="ms-empty__title">Complication Risk Dashboard</h2>
                  <p className="ms-empty__body">
                    Fill in the essential patient details in the sidebar and select
                    <strong style={{ color: 'var(--violet-400)' }}> Assess Complication Risk</strong>.
                    Optional fields are pre-filled with typical values and can be overridden in the
                    <strong style={{ color: 'var(--violet-300)' }}> Advanced Fields</strong> section.
                  </p>
                  <div className="ms-stat-row" style={{ marginTop: 'var(--sp-6)' }}>
                    {[
                      ['XGB+LGBM+RF', 'Ensemble'],
                      ['101,766', 'Training Records'],
                      ['52', 'Features'],
                      ['UCI-130', 'Dataset'],
                    ].map(([value, label]) => (
                      <div className="ms-stat ms-stat--violet" key={label}>
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
              accent="violet"
              assessmentLabel="Complication Risk Assessment"
              highRiskText="High Risk — Early Readmission Likely"
              lowRiskText="Low Risk — Stable / Well-Managed"
              negativeLabel="Stable / Low-Risk Probability"
              positiveLabel="Early Readmission Probability"
              gaugeCaption="Readmission risk"
              shapDescription="Which clinical features drove this readmission risk prediction. Features pushing right increase risk; features pushing left lower it."
              disclaimer="This tool is for educational and research purposes only. Predictions are based on historical hospital data and do not constitute clinical advice, diagnosis, or treatment. Always consult a qualified healthcare professional."
              onOpenCareMap={onOpenCareMap}
            />
          )}
        </main>
      </div>
    </div>
  )
}
