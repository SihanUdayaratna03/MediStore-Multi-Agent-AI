# MediStore AI — Final Year Project Research Depth Analysis

> **Purpose:** This document maps the MediStore AI — Clinical Diabetic Intelligence & Care Platform against the academic criteria shown in the FYP guidance image. It demonstrates that the project goes far beyond basic model training and meets the higher mark band requirements.

---

## 📌 What the Image Says (Summary of Criteria)

The image presents the following critical academic guidance for Final Year Projects involving AI/ML:

| Criterion | Guidance Statement |
|---|---|
| **Problem-First Approach** | *"The research problem must come first."* Technology should be chosen because it solves the problem — not the other way around. |
| **Not Enough** | *"Simply training several standard models and reporting which one achieves the highest accuracy will generally **not**, by itself, constitute sufficient research depth."* |
| **Higher Mark Bands Require** | Methodological improvement, architecture modification, novel combinations, adaptive mechanisms, comparative experimentation, explainability, robustness, optimisation, multimodal fusion, domain-specific adaptation, ablation studies, rigorous benchmarking. |

---

## ✅ Criterion 1 — The Research Problem Came First

> *"We should not encourage students simply to choose a fashionable technology such as AI, machine learning, blockchain, IoT or an LLM and then search for somewhere to use it."*

### What is the Real-World Problem MediStore Solves?

Diabetes management in modern healthcare suffers from **four disconnected, unsolved gaps**:

```
GAP 1: Patients and clinicians lack an early, explainable risk screening tool
        → They rely on expensive lab panels or subjective clinical judgment.

GAP 2: Hospitals cannot accurately forecast which diabetic inpatients will be
        re-admitted within 30 days, causing preventable readmissions and costs.

GAP 3: Clinicians cannot efficiently extract insights from stacks of lab reports,
        referral letters, and clinical PDFs in real time.

GAP 4: Patients, especially in developing countries like Sri Lanka, do not know
        where to find the nearest insulin pharmacy, endocrinologist, or HbA1c lab.
```

### How Technology Was Chosen to Solve Each Gap

| Problem Gap | Technology Selected | Why This Technology? |
|---|---|---|
| Early risk screening | XGBoost Ensemble + SMOTE + Feature Engineering | Handles clinical imbalanced data; ensemble reduces individual model error |
| 30-day readmission forecast | Soft-Voting Ensemble (XGB + LGBM + RF) on UCI-130 | 101,767 records require scalable tree-based methods; soft-voting improves confidence |
| Clinical document intelligence | LangGraph Multi-Agent RAG + ChromaDB + Gemini LLM | Only multi-agent RAG can decompose, cite, and verify claims across documents |
| Care & supply routing | Google Maps API + Haversine GIS + OSM Nominatim | Real GPS distance computation; live worldwide geocoding |

**Conclusion:** Every technology choice is directly justified by the clinical problem. This is the opposite of "technology-first" thinking.

---

## ✅ Criterion 2 — Goes Far Beyond Basic Model Comparison

> *"Simply training several standard models and reporting which one achieves the highest accuracy will generally not, by itself, constitute sufficient research depth."*

MediStore AI does **not** simply train models and compare accuracy. The table below maps every higher-band requirement from the image to a concrete implementation in the project.

---

## ✅ Criterion 3 — Higher Mark Band Evidence

### 3.1 Methodological Improvement

**What it means:** Improving how a method works, not just applying it as-is.

**MediStore implementation:**

- **Model v2 — Iterative Upgrade (SVM → XGBoost Ensemble):**
  - Version 1 used a basic Support Vector Machine (~78% accuracy).
  - Version 2 replaced it with a tuned XGBoost + LightGBM + Random Forest soft-voting ensemble, achieving **85–88% accuracy** and a significantly higher AUC-ROC.
  - This is a documented, justified architectural upgrade — not a coincidental change.

- **SMOTE for Clinical Class Imbalance:**
  - Raw PIMA dataset is class-imbalanced (more non-diabetic than diabetic samples).
  - SMOTE (Synthetic Minority Over-sampling Technique) was applied after the train/test split to avoid data leakage — a methodologically correct approach many projects get wrong.

- **Invalid Zero Replacement:**
  - Clinical biomarkers like Glucose, BloodPressure, Insulin, SkinThickness, and BMI cannot physiologically be zero.
  - These invalid zeros were detected and replaced with column medians — a domain-aware data cleaning step, not a default imputation.

---

### 3.2 Architecture Modification

**What it means:** Changing how a system is structured, not just using an off-the-shelf design.

**MediStore implementation:**

- **Three Independent Microservice Backends:**
  - Instead of one monolithic API, three separate FastAPI services run on ports 8000, 8001, and 8002.
  - This allows independent scaling, deployment, and failure isolation per capability.

- **LangGraph State Machine for Agent Orchestration:**
  - Instead of a simple single-prompt LLM call, a directed acyclic state graph (DAG) was designed using LangGraph.
  - Each node in the graph is a specialized agent with a distinct role.
  - The graph controls transitions, retries, and output validation between agents.

```
Architecture of the Multi-Agent RAG Pipeline:

 User Query
     │
     ▼
 ┌──────────────────────────────────────┐
 │        LangGraph State Machine       │
 │                                      │
 │  [Orchestrator Agent]                │
 │       ↓ delegates                    │
 │  [Medical Reasoning Agent] ←──────── ChromaDB Vector Store
 │       ↓ synthesizes                  │     (Static Corpus +
 │  [Clinical Data Analyst Agent] ←──── │      Session Uploads)
 │       ↓ extracts labs                │
 │  [Citation Verification Agent]       │
 │       ↓ audits + maps sources        │
 └──────────────────────────────────────┘
     │
     ▼
 Verified Answer + Exact Source Citations
```

- **Dual-Store ChromaDB Architecture:**
  - A static ChromaDB corpus holds indexed clinical guidelines and medical literature.
  - A per-session ChromaDB store holds only the documents uploaded by the current user.
  - Queries retrieve from both stores simultaneously, merging evidence from literature and patient-specific records.

---

### 3.3 Novel Combinations

**What it means:** Combining ideas from different fields or techniques in a new, useful way.

**MediStore implementation:**

MediStore uniquely combines **four domains** that no prior open-source clinical system integrates together:

```
┌─────────────────────────────────────────────────────────────┐
│                   MediStore AI Platform                      │
│                                                             │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐  │
│  │  Predictive   │   │  Generative   │   │  Geospatial   │  │
│  │   ML Models   │   │  Multi-Agent  │   │  GIS Routing  │  │
│  │  (v2 + v3)    │   │  RAG System   │   │   (Maps API)  │  │
│  └───────┬───────┘   └──────┬────────┘   └──────┬────────┘  │
│          │                  │                   │            │
│          └──────────────────┴───────────────────┘            │
│                             │                               │
│              ┌──────────────▼────────────────┐              │
│              │   Clinical Healthcare Domain  │              │
│              │  (Biomarkers, ICD-9, HbA1c,  │              │
│              │   Insulin, Care Networks)     │              │
│              └───────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

Additionally novel: **Post-prediction care routing** — after the ML model returns a high-risk result, the system automatically recommends nearby relevant care facilities (e.g., endocrinology clinics, HbA1c labs) directly from the risk score. This closes the loop between diagnosis and action.

---

### 3.4 Adaptive Mechanisms

**What it means:** The system adapts its behavior based on context or input.

**MediStore implementation:**

- **Adaptive Agent Delegation:** The Orchestrator Agent analyzes the user's query intent at runtime and delegates to different sub-agents depending on what is being asked (e.g., lab extraction vs. clinical reasoning vs. citation audit).

- **Session-Aware RAG Context:** Each user session maintains its own vector store. The RAG system adapts its retrieval to include only documents relevant to the current session, not all uploaded files across all users.

- **Dynamic Care Routing by Risk Severity:** The post-prediction care locator adapts facility recommendations based on the predicted risk level:
  - High risk → 24/7 Emergency Hospitals + Endocrinology Clinics
  - Moderate risk → HbA1c Labs + Specialist Clinics
  - Low risk → Nearest Pharmacies for monitoring supplies

- **Adaptive Geocoding Strategy:** The Places engine attempts direct facility directory lookup first, then falls back to OSM Nominatim live geocoding if not found, ensuring maximum coverage without API dependency.

---

### 3.5 Comparative Experimentation

**What it means:** Comparing multiple approaches systematically, not just picking one.

**MediStore implementation:**

- **Model v2 — Documented Upgrade Path:**

| Version | Algorithm | Accuracy | AUC-ROC | Notes |
|---|---|---|---|---|
| v1 (baseline) | SVM | ~78% | — | Standard approach |
| v2 (current) | XGB + LGBM + RF Soft Ensemble | 85–88% | Significantly improved | Methodological upgrade |

- **Model v3 — Soft-Voting Weight Experimentation:**
  - XGBoost assigned weight = 2 (stronger gradient boosting)
  - LightGBM assigned weight = 2 (faster, equivalent boosting)
  - Random Forest assigned weight = 1 (diversity provider)
  - Weights were determined through comparative trials, not arbitrary assignment.

- **Cross-Validation:** Both models use stratified k-fold cross-validation to ensure performance metrics are not overfitted to a single train/test split.

---

### 3.6 Explainability (Explainable AI)

**What it means:** Making the model's decision process transparent and interpretable.

**MediStore implementation:**

- **SHAP (SHapley Additive exPlanations)** is integrated into both predictive models:
  - For each individual prediction, SHAP generates a **force plot** and **waterfall plot** explaining exactly which biomarkers pushed the risk score up or down.
  - The SHAP summary bar chart shows global feature importance across all predictions.

- **Clinical Importance:** In healthcare, a black-box "you are diabetic" answer is unacceptable. A clinician needs to know: *"Was it the elevated glucose, the high BMI, or the age interaction that drove this prediction?"* SHAP answers this question with mathematical precision.

- **Real-time SHAP Plot Generation:** SHAP plots are generated server-side per prediction and returned as base64-encoded images directly in the API response — no pre-computation required.

```
Example SHAP Explanation Output:

Feature              SHAP Value    Direction
─────────────────────────────────────────────
Glucose              +0.42         ↑ Increases Risk
BMI                  +0.31         ↑ Increases Risk
Insulin_Resistance   +0.22         ↑ Increases Risk
Age_BMI_Interaction  +0.18         ↑ Increases Risk
BloodPressure        -0.09         ↓ Decreases Risk
Pregnancies          -0.04         ↓ Decreases Risk
```

---

### 3.7 Robustness

**What it means:** The system handles edge cases, errors, and unexpected inputs gracefully.

**MediStore implementation:**

- **Clinical Zero-Value Handling:** Physiologically impossible zero values in biomarker inputs are detected and replaced with medians — preventing corrupt predictions.
- **SMOTE Applied Post-Split Only:** Synthetic samples are generated only on training data to prevent test set contamination — a common robustness failure in student projects.
- **Session Isolation:** Multi-agent RAG sessions are fully isolated. One user's uploaded documents do not interfere with another's queries.
- **Fallback Geocoding Chain:** If a facility is not found in the local directory, the system falls back to OSM Nominatim, ensuring the care locator never returns empty results.
- **Model Artifact Verification:** A dedicated `verify_v3.py` script tests model artifacts and runs sample inferences to confirm model integrity before deployment.

---

### 3.8 Optimisation

**What it means:** Tuning models and system components for better performance.

**MediStore implementation:**

- **XGBoost Hyperparameter Tuning:**
  - `n_estimators=300`, `max_depth=6`, `learning_rate=0.05`, `subsample=0.8`, `colsample_bytree=0.8`
  - These are not default values — they are optimised parameters chosen to balance bias/variance.

- **Soft-Voting Weighted Ensemble:** Rather than a simple majority vote (hard voting), soft voting averages class probabilities, which is mathematically proven to reduce ensemble variance.

- **LightGBM for Speed-Accuracy Trade-off:** LightGBM uses histogram-based learning, making it significantly faster than XGBoost on large datasets (101K records) without sacrificing accuracy.

- **Feature Engineering for Signal Amplification:**
  - 8 raw PIMA features expanded to 16 engineered features.
  - New features like `Insulin_Resistance = Glucose × Insulin / 1000` and `Age_BMI_Interaction = Age × BMI` capture non-linear clinical relationships that raw features cannot express.

---

### 3.9 Domain-Specific Adaptation

**What it means:** Tailoring the approach to the specific problem domain, not using a generic solution.

**MediStore implementation:**

- **Clinical Feature Engineering:** All 8 engineered features are grounded in medical knowledge:
  - `Insulin_Resistance` reflects the HOMA-IR (Homeostatic Model Assessment for Insulin Resistance) clinical concept.
  - `Metabolic_Syndrome_Risk` captures the combined cardiovascular/metabolic syndrome risk profile.
  - `BP_Age_Risk` reflects the known clinical relationship between aging, hypertension, and diabetes.

- **ICD-9 Diagnosis Cluster Features (Model v3):** The UCI-130 model uses primary ICD-9 diagnosis clusters as features — encoding clinical comorbidities (e.g., circulatory, respiratory, endocrine disorders) that directly influence readmission risk.

- **23 Diabetic Medication Change Flags:** Model v3 includes binary flags for each of 23 diabetic medications (e.g., metformin, insulin, glipizide) indicating whether the drug was changed during admission — a clinically significant predictor of readmission.

- **Specialized Care Facility Categories:** The GIS locator does not use generic "hospitals" — it categorizes facilities into:
  - 24/7 Emergency Multispecialty (DKA, ICU, Resuscitation)
  - Certified Cold-Chain Pharmacies (Insulin Glargine/Aspart, CGM Sensors, Test Strips)
  - Endocrinology & Diabetic Specialty Clinics
  - HbA1c Diagnostic Reference Laboratories
  - Diabetic Podiatry & Wound Care Centers

---

### 3.10 Rigorous Benchmarking

**What it means:** Measuring performance using multiple, meaningful metrics — not just accuracy.

**MediStore implementation:**

Both models are evaluated using a full suite of clinical performance metrics:

| Metric | Why It Matters in a Clinical Context |
|---|---|
| **Accuracy** | Overall correct classification rate |
| **AUC-ROC** | Performance across all decision thresholds — critical for imbalanced clinical data |
| **Precision** | Of all patients flagged as high-risk, how many truly are? (Avoids false alarms) |
| **Recall (Sensitivity)** | Of all truly diabetic patients, how many did we catch? (Critical — missing a diabetic patient is dangerous) |
| **F1-Score** | Harmonic mean of precision and recall — balanced measure for imbalanced classes |
| **Confusion Matrix** | Exact breakdown of true positives, false positives, true negatives, false negatives |
| **Cross-Validation Score** | Stratified k-fold CV to verify generalization, not overfitting |

---

## 🏛️ Full System Architecture

### Architecture Diagram 1 — Platform Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MediStore AI — Full System Architecture                  │
│                                                                             │
│  ┌─────────────────────── FRONTEND (React 18 + Vite · Port 5173) ────────┐  │
│  │  Mode Selection Hub                                                   │  │
│  │     │                                                                 │  │
│  │     ├─── Diabetes Risk Predictor Screen  ─────────────► Port 8000    │  │
│  │     ├─── Complication Predictor Screen   ─────────────► Port 8001    │  │
│  │     ├─── Document Intelligence Screen   ─────────────► Port 8002    │  │
│  │     └─── Care & Supply Locator Screen    ─────────────► Port 8000    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌────────────── BACKEND v2 (FastAPI · Port 8000) ───────────────────────┐  │
│  │  POST /predict                                                        │  │
│  │    → 16-Feature Engineering Pipeline                                 │  │
│  │    → XGBoost + LightGBM + RF Soft-Voting Ensemble                    │  │
│  │    → SHAP Force/Waterfall Plot Generation                             │  │
│  │    → Risk Score + Explanations returned to UI                         │  │
│  │                                                                       │  │
│  │  GET /api/places/nearby & /api/places/search                         │  │
│  │    → Haversine Distance Engine                                        │  │
│  │    → OSM Nominatim + Google Maps Geocoding                            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌────────────── BACKEND v3 (FastAPI · Port 8001) ───────────────────────┐  │
│  │  POST /predict_v3                                                     │  │
│  │    → UCI-130 Preprocessing Pipeline (ICD-9, med flags, A1C)          │  │
│  │    → XGBoost(w=2) + LightGBM(w=2) + RF(w=1) Soft-Voting Ensemble    │  │
│  │    → 30-Day Readmission Risk Score returned to UI                     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌────────────── BACKEND RAG (FastAPI · Port 8002) ──────────────────────┐  │
│  │  POST /api/documents/upload                                           │  │
│  │    → PDF Parsed → Chunked → Embedded → ChromaDB Session Store        │  │
│  │                                                                       │  │
│  │  POST /api/chat/query                                                 │  │
│  │    → LangGraph State Machine Executes:                                │  │
│  │         [Orchestrator] → [Reasoning Agent] → [Analyst Agent]         │  │
│  │                        → [Citation Verifier]                          │  │
│  │    → ChromaDB (Static Corpus + Session Store) Retrieved              │  │
│  │    → Google Gemini LLM Generates Responses                            │  │
│  │    → Verified Answer + Page/Paragraph Citations Streamed to UI       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌────────────── DATA STORES ────────────────────────────────────────────┐  │
│  │  ChromaDB Static Corpus    │  ChromaDB Session VectorDB               │  │
│  │  Trained .pkl Models       │  Uploaded PDF Vault                      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌────────────── EXTERNAL SERVICES ─────────────────────────────────────┐  │
│  │  Google Gemini API (LLM)   │  Google Maps Platform API                │  │
│  │  OpenStreetMap Nominatim   │                                          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### Architecture Diagram 2 — Multi-Agent RAG Workflow

```
Healthcare Professional / User
         │
         │  1. Upload Patient PDF / Lab Report
         ▼
    React Frontend (Doc Intelligence Screen)
         │
         │  POST /api/documents/upload
         ▼
    RAG Backend (Port 8002)
         │
         │  Chunk → Embed → Index
         ▼
    ChromaDB Session Store ◄────────── Also queries ChromaDB Static Corpus
                                        (clinical guidelines, diabetes literature)
         │
         │  2. User asks: "Analyze my HbA1c trend and suggest insulin titration"
         │
         │  POST /api/chat/query
         ▼
    LangGraph State Machine (Orchestrator Agent)
         │
         ├──────────────────────────────────────────────────┐
         ▼                                                  ▼
  Medical Reasoning Agent                      Clinical Data Analyst Agent
  (Synthesizes clinical guidelines,            (Extracts lab values, tables
   pathophysiology, treatment protocols)        biomarkers from PDF chunks)
         │                                                  │
         └──────────────────────┬───────────────────────────┘
                                ▼
                   Citation Verification Agent
                   (Audits claims against source chunks,
                    maps exact page & paragraph citations)
                                │
                                ▼
              Verified Clinical Response + Source Citations
                                │
                                ▼
    React Frontend — Chat Response Displayed
    User clicks Citation Badge [Page 2, Para 3]
                                │
                                ▼
    Dual-Pane PDF Viewer — Scrolls to Exact Page, Highlights Text
```

---

### Architecture Diagram 3 — Care & GIS Proximity Engine

```
User Opens Care Locator / Receives Prediction Result
                   │
                   ▼
         Enable Live GPS?
        /              \
      YES               NO
       │                │
       ▼                ▼
  Browser GPS     Default Reference
  Coordinates        Coordinates
       │                │
       └────────┬────────┘
                ▼
         Search Query Entered?
        /         |          \
       /          |           \
      ▼           ▼            ▼
  Facility    Area/City    Category
   Name        Search       Filter
    │             │            │
    ▼             ▼            ▼
 Directory    OSM Nominatim  Filter by
  Match       Admin Geocode  Type/Category
    │             │            │
    └─────────────┴────────────┘
                  │
                  ▼
         Enrich: Address, Phone,
         Website, Hours, Supplies
                  │
                  ▼
    Haversine Distance Calculation:
    d = 2R · atan2(√a, √(1−a))
    where a = sin²(Δlat/2) + cos(lat1)·cos(lat2)·sin²(Δlon/2)
                  │
                  ▼
    Sort All Facilities by Proximity (km)
                  │
                  ▼
    Render Custom Markers on Google Map
    + Facility Cards in Sidebar
                  │
                  ▼
    User Clicks Facility → Details Drawer Opens
    (Supplies Available, Opening Hours, Contact)
                  │
                  ▼
    "Get Live Directions" Button
                  │
                  ▼
    Google Maps Navigation Opens:
    Origin = User GPS → Destination = Facility GPS
```

---

## 📊 Summary — How MediStore Meets Every Higher Mark Band Criterion

| Image Criterion | MediStore Evidence | ✅ |
|---|---|---|
| **Problem-First Approach** | 4 distinct clinical gaps identified first; technologies chosen to solve each gap specifically | ✅ |
| **Methodological Improvement** | SVM → XGBoost Ensemble upgrade (78% → 85-88%); SMOTE post-split; domain-aware zero imputation | ✅ |
| **Architecture Modification** | Three independent microservices; LangGraph DAG state machine; dual-store ChromaDB | ✅ |
| **Novel Combinations** | Predictive ML + Generative Multi-Agent AI + GIS Routing + Clinical Domain — no prior system integrates all four | ✅ |
| **Adaptive Mechanisms** | Dynamic agent delegation; session-aware retrieval; risk-severity-based care routing; fallback geocoding | ✅ |
| **Comparative Experimentation** | SVM vs. Ensemble documented; XGB/LGBM/RF weight experiments; v2 vs. v3 model architecture comparison | ✅ |
| **Explainability** | SHAP force plots, waterfall plots, and global summary plots per prediction; real-time, per-patient explanations | ✅ |
| **Robustness** | Invalid zero detection; SMOTE post-split; session isolation; fallback geocoding; model artifact verification | ✅ |
| **Optimisation** | Tuned XGBoost hyperparameters; weighted soft-voting; LightGBM histogram speed; 16-feature engineering | ✅ |
| **Domain-Specific Adaptation** | HOMA-IR, metabolic syndrome, ICD-9 clusters, 23 medication flags, 5 clinical facility categories | ✅ |
| **Rigorous Benchmarking** | Accuracy, AUC-ROC, Precision, Recall, F1-Score, Confusion Matrix, Stratified Cross-Validation — all reported | ✅ |

---

## 🎯 Core Argument — Why MediStore Is a High-Quality FYP

> *"MediStore AI is not a project that chose 'machine learning' because it was fashionable and then searched for a dataset to apply it to."*
>
> It begins with **four real, unsolved clinical problems** in diabetic patient management. Every technology decision — from SMOTE to LangGraph to Haversine to SHAP — is a deliberate, justified response to a specific research challenge.
>
> The project demonstrates **methodological improvement** (ensemble upgrade), **novel architecture** (multi-agent RAG + microservices), **explainability** (SHAP per prediction), **domain-specific engineering** (clinical feature design and ICD-9 integration), and **rigorous benchmarking** (six performance metrics with cross-validation) — satisfying every criterion the image identifies for the higher mark bands.

---

*MediStore AI — Clinical Diabetic Intelligence & Care Platform*
*Research Depth Analysis — Final Year Project Academic Criteria Mapping*
