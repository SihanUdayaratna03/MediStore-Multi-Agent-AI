# MediStore AI — Complete Project Documentation

> **Version:** 3.0 &nbsp;|&nbsp; **Last Updated:** September 2026  
> **Technology Stack:** React 19 · FastAPI · LangGraph · Gemini AI · ChromaDB · XGBoost/LightGBM/Random Forest · SHAP · Docker

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Frontend — React Web Application](#4-frontend--react-web-application)
5. [Backend — API Servers](#5-backend--api-servers)
6. [Machine Learning System](#6-machine-learning-system)
7. [AI Multi-Agent RAG System](#7-ai-multi-agent-rag-system)
8. [MCP Servers (Model Context Protocol)](#8-mcp-servers-model-context-protocol)
9. [Feature Deep-Dives](#9-feature-deep-dives)
10. [Complete System Data Flow](#10-complete-system-data-flow)
11. [Current Deployment — Docker](#11-current-deployment--docker)
12. [Planned: SQL Database Integration](#12-planned-sql-database-integration)
13. [Planned: Azure CI/CD Pipeline](#13-planned-azure-cicd-pipeline)
14. [Environment Variables & Configuration](#14-environment-variables--configuration)

---

## 1. Project Overview

### What Is MediStore AI?

MediStore AI is a **clinical-grade, AI-powered diabetes intelligence platform** designed to help users and healthcare professionals assess, understand, and manage diabetes risk. The system combines traditional machine learning models, a large language model (LLM) powered multi-agent reasoning pipeline, and real-world care facility lookup into a single, unified web application.

Think of it as three tools in one:

| Tool | What it does |
|---|---|
| **Diabetes Risk Predictor** | Takes 8 basic health biomarkers (e.g., glucose, BMI, age) and predicts whether a person is at risk of diabetes. It also explains *why* the model made that prediction. |
| **Complication & Readmission Risk Predictor** | Takes a much richer set of 52 hospital admission features and predicts whether a diabetic patient is at risk of early hospital readmission — a proxy for poor glycaemic control and complications. |
| **Document Intelligence + AI Copilot** | Users can upload any medical PDF or image (e.g., a blood test report). The system reads the document, understands it, and lets users ask questions about it in a natural chat interface, with answers grounded in the actual document content. |

Additionally, a **Care Locator** feature uses Google Maps to surface nearby hospitals, endocrinologists, pharmacies, and diagnostic labs based on the user's location and risk profile.

### Who Is It For?

- **Patients** who want to understand their own risk and get personalised, evidence-linked advice.
- **Healthcare professionals** who want to quickly analyse uploaded medical documents.
- **Researchers and developers** learning how AI, ML, and LLM-based systems can be applied to healthcare.

### Key Design Principles

- **Explainability first:** Every prediction comes with a SHAP waterfall chart that shows exactly which features pushed the prediction up or down.
- **Safety guardrails:** A dedicated Guardrail agent ensures every AI response includes a medical disclaimer and is within scope.
- **Privacy:** Uploaded documents are stored temporarily (24-hour TTL) and then cleaned up automatically.
- **Modular architecture:** Three separate FastAPI servers run independently so they can be scaled or updated independently.

---

## 2. High-Level Architecture

The entire system is structured as three independently runnable services communicating via HTTP, plus a React frontend that talks to all three.

```
┌───────────────────────────────────────────────────────────────────────┐
│                     REACT FRONTEND (Port 5173)                        │
│  PublicHome → Landing → ModeSelect → [v2 | v3 | DocIntelligence |    │
│               CareLocator]                                             │
└───────┬────────────────┬─────────────────────────┬────────────────────┘
        │                │                         │
        ▼                ▼                         ▼
┌──────────────┐ ┌──────────────┐      ┌─────────────────────────────┐
│  v2 Backend  │ │  v3 Backend  │      │    RAG Backend (Port 8002)  │
│  (Port 8000) │ │  (Port 8001) │      │                             │
│              │ │              │      │  LangGraph 5-Agent Pipeline │
│ SVM Model    │ │ XGBoost +    │      │  ┌──────────────────────┐   │
│ PIMA Dataset │ │ LightGBM +   │      │  │ Orchestrator         │   │
│ 8 features   │ │ RF Ensemble  │      │  │ Researcher           │   │
│              │ │ UCI-130      │      │  │ Reasoning            │   │
│ SHAP Plots   │ │ 52 features  │      │  │ Analyst (Gemini AI)  │   │
│              │ │ SHAP Plots   │      │  │ Guardrail            │   │
│ Google Maps  │ │              │      │  └──────────────────────┘   │
│ Places API   │ │              │      │                             │
└──────────────┘ └──────────────┘      │  ┌──────────────────────┐   │
                                       │  │    MCP Servers       │   │
                                       │  │  ┌────────────────┐  │   │
                                       │  │  │  Knowledge MCP │  │   │
                                       │  │  │  (ChromaDB)    │  │   │
                                       │  │  ├────────────────┤  │   │
                                       │  │  │  Document MCP  │  │   │
                                       │  │  │  (Per-session) │  │   │
                                       │  │  └────────────────┘  │   │
                                       │  └──────────────────────┘   │
                                       └─────────────────────────────┘
```

### Port Map

| Service | Port | Purpose |
|---|---|---|
| React Frontend | `5173` | User interface (Vite dev server) |
| v2 API Server | `8000` | SVM diabetes risk prediction + Places API |
| v3 API Server | `8001` | Ensemble complication risk prediction |
| RAG API Server | `8002` | Multi-agent AI chat + document upload |

---

## 3. Technology Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **React** | 19 | UI component framework |
| **Vite** | 8 | Build tool and dev server |
| **Lucide React** | Latest | Icon library |
| **Axios** | 1.18 | HTTP client for API calls |
| **@react-google-maps/api** | 2.20 | Google Maps integration for Care Locator |
| **Vanilla CSS** | — | All styling (no Tailwind) |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Python** | 3.12 | Backend language |
| **FastAPI** | Latest | REST API framework |
| **Uvicorn** | Latest | ASGI web server |
| **Pydantic** | v2 | Request/response validation |
| **LangGraph** | Latest | Multi-agent AI orchestration |
| **Google Gemini AI** | `gemini-1.5-flash` | LLM for AI response generation |
| **MCP (Model Context Protocol)** | Latest | Tool-calling protocol for agents |

### Machine Learning
| Technology | Purpose |
|---|---|
| **scikit-learn** | SVM model (v2), feature scaling, cross-validation |
| **XGBoost** | Gradient boosting (v3 ensemble) |
| **LightGBM** | Gradient boosting (v3 ensemble) |
| **Random Forest** | Tree ensemble (v3 ensemble) |
| **SHAP** | Model explainability — waterfall & beeswarm plots |
| **SMOTE (imbalanced-learn)** | Handles class imbalance in training |
| **Matplotlib** | Plot generation (SHAP charts returned as Base64) |
| **Joblib** | Serialising trained model artifacts (`.pkl` files) |

### Data & Storage
| Technology | Purpose |
|---|---|
| **ChromaDB** | Vector database for semantic search (RAG) |
| **Sentence Transformers** | `all-MiniLM-L6-v2` embedding model |
| **PyMuPDF (fitz)** | PDF text extraction |
| **Gemini Vision** | OCR for medical image uploads |
| **In-memory session store** | Tracks active document sessions (24h TTL) |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Docker** | Containerise each service |
| **Docker Compose** | Run all services together locally |

---

## 4. Frontend — React Web Application

### Overview

The frontend is a single-page React application with **no URL routing**. Navigation is managed entirely through React `useState`, and each screen transition uses a smooth `ScreenTransition` animation component. Code splitting via `React.lazy` and `Suspense` ensures the heavier modules (v3 predictor, Document Intelligence, Care Locator) are only loaded when the user actually navigates to them.

### Screen Map

```
home (PublicHome)
  ├── signin / signup  (Landing)
  │     └── mode-select (ModeSelect)
  │           ├── v2    (DiabetesPredictor)
  │           ├── v3    (ComplicationPredictor)
  │           ├── doc-intelligence  (DocIntelligence)
  │           └── care-locator  (CareLocator)
  └── (direct to mode-select if session stored in localStorage)
```

### Key Components

#### Screens (`frontend/src/screens/`)

| Screen | File | Description |
|---|---|---|
| `PublicHome` | `PublicHome.jsx` | Marketing landing page visible to unauthenticated users |
| `Landing` | `Landing.jsx` | Sign-in / Sign-up form |
| `ModeSelect` | `ModeSelect.jsx` | Module selection dashboard after login |
| `DiabetesPredictor` | `DiabetesPredictor.jsx` | v2 SVM predictor — 8 biomarker form + results |
| `ComplicationPredictor` | `ComplicationPredictor.jsx` | v3 Ensemble predictor — 52-field clinical form + results |
| `DocIntelligence` | `DocIntelligence.jsx` | Document upload + AI chat interface |
| `CareLocator` | `CareLocator.jsx` | Map-based care facility finder |

#### Shared UI Components (`frontend/src/components/`)

| Component | Purpose |
|---|---|
| `ui/Sidebar` | Left-side form panel with accent colour theming |
| `ui/TopBar` | Module header bar with navigation and status |
| `ui/Field` | Reusable form field types: `RangeField`, `NumberField`, `SelectField` |
| `ui/Reveal` | Fade-in animation wrapper |
| `ui/WorkspaceIntro` | Module intro card with key stats |
| `results/ResultDashboard` | Prediction results: gauge, probability bars, SHAP chart, risk factors, recommendations |
| `results/AnalysingState` | Loading spinner shown while waiting for API |
| `CopilotChat/` | AI chat sidebar attached to predictor screens |
| `DocUpload/` | File drag-and-drop upload zone |
| `DocViewer/` | Document metadata display after upload |
| `DocChat/` | Chat interface for document Q&A |
| `CitationPanel/` | Expandable panel showing page-level citations |
| `charts/` | Gauge and probability bar chart components |
| `maps/` | Google Maps wrapper for Care Locator |
| `background/AuroraField` | Animated gradient background canvas |

### Authentication

Authentication in the current version is **frontend-only**. When a user signs in or registers, their name and email are stored in `localStorage` under the key `medistore-session`. On app load, if this key exists, the app goes directly to `ModeSelect`. On sign-out, the key is cleared.

> **Note:** There is no backend authentication, JWT tokens, or password verification in the current implementation. This is a planned area for improvement via the SQL database integration described in Section 12.

### API Communication

All API calls originate from `frontend/src/api/`:

- `api.js` — calls `predictDiabetesRisk()` (Port 8000) and `predictComplicationRisk()` (Port 8001)
- `docApi.js` — calls `uploadDocument()`, `sendDocChatMessage()` (Port 8002)

---

## 5. Backend — API Servers

The backend is split into three completely separate FastAPI applications. They share the same Python package (`backend/`) and model artifacts directory (`models/`), but run as independent processes on different ports.

### 5.1 v2 Server — Diabetes Risk API (Port 8000)

**File:** `backend/api/v2_server.py`

This server handles two concerns:
1. **Diabetes Risk Prediction** — accepts 8 clinical biomarkers, runs the SVM model, returns a prediction and SHAP chart.
2. **Care Locator** — proxies requests to the Google Maps Places API to find nearby healthcare facilities.

#### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/predict` | Run v2 SVM prediction |
| `GET` | `/api/places/nearby` | Find nearby diabetes-related facilities |
| `GET` | `/api/places/search` | Search facilities by name or keyword |

#### `/predict` — Request Schema

```json
{
  "pregnancies": 2,
  "glucose": 130,
  "blood_pressure": 76,
  "skin_thickness": 29,
  "insulin": 85,
  "bmi": 28.5,
  "dpf": 0.45,
  "age": 38
}
```

#### `/predict` — Response Schema

```json
{
  "prediction": 1,
  "probability_positive": 67.3,
  "probability_negative": 32.7,
  "shap_image_base64": "data:image/png;base64,..."
}
```

The `shap_image_base64` field contains a dark-themed SHAP waterfall chart rendered as a PNG and encoded in Base64. The frontend renders this as an `<img>` tag directly.

#### Feature Engineering (v2)

Before passing data to the model, 8 engineered features are computed from the raw inputs:

| Feature | Formula | Purpose |
|---|---|---|
| `glucose_bmi_ratio` | `glucose / (bmi + 0.001)` | Metabolic stress proxy |
| `insulin_resistance` | `glucose * insulin / 1000` | Insulin resistance proxy |
| `age_bmi_interaction` | `age * bmi` | Compounded age-obesity risk |
| `bp_age_risk` | `bp * age / 100` | Cardiovascular age risk |
| `glucose_age` | `glucose * age / 100` | Age-adjusted glucose risk |
| `high_glucose_flag` | `1 if glucose > 125 else 0` | Binary diabetes threshold |
| `obese_flag` | `1 if bmi > 30 else 0` | Obesity flag |
| `high_risk_age_flag` | `1 if age > 45 else 0` | Age risk flag |

This gives a total of **16 features** (8 raw + 8 engineered) fed into the StandardScaler → SVM pipeline.

---

### 5.2 v3 Server — Complication Risk API (Port 8001)

**File:** `backend/api/v3_server.py`

This server handles the more complex, hospital-context prediction. It accepts 45+ clinical fields derived from a hospital admission record and predicts whether the patient will be **readmitted within 30 days** — which is used as a proxy for poor glycaemic control and diabetes complication risk.

#### Endpoint

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/predict_v3` | Run v3 ensemble prediction |

#### Input Categories

The `ComplicationInput` schema groups fields into clear clinical categories:

| Category | Fields |
|---|---|
| Demographics | `gender`, `age` |
| Hospital visit | `admission_type_id`, `discharge_disposition_id`, `admission_source_id`, `time_in_hospital` |
| Procedures & labs | `num_lab_procedures`, `num_procedures`, `num_medications`, `number_outpatient`, `number_emergency`, `number_inpatient`, `diag_1/2/3`, `number_diagnoses` |
| Lab results | `max_glu_serum`, `a1cresult` |
| Medications (21 drugs) | `metformin`, `insulin`, `glipizide`, `glimepiride`, etc. |
| Flags | `change` (medication change), `diabetesmed` |
| Race (one-hot) | `race_Asian`, `race_Caucasian`, `race_Hispanic`, `race_Other` |

#### Engineered Features (v3)

After the raw fields, these derived features are computed at inference time:

| Engineered Feature | Formula |
|---|---|
| `med_procedure_ratio` | `num_medications / (num_procedures + 1)` |
| `hospital_complexity` | `number_inpatient + number_emergency * 2` |
| `total_prior_visits` | `number_outpatient + number_inpatient` |
| `multi_diag_endocrine` | Count of diagnoses where ICD-9 category = 3 (Endocrine/Diabetes) |
| `is_emergency_admission` | `1 if admission_source_id == 7 else 0` |
| `long_stay` | `1 if time_in_hospital > 7 else 0` |

This gives a total of **51 features** as expected by the `feature_names_v3.json` file.

---

### 5.3 RAG Server — AI Chat API (Port 8002)

**File:** `backend/app/main.py` → creates the FastAPI app via `backend/app/api/routes.py`

This is the most complex server. It manages the entire document upload and AI chat pipeline.

#### Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/chat` | Standard AI chat (no document) |
| `POST` | `/api/v1/upload` | Upload a medical PDF or image |
| `POST` | `/api/v1/doc-chat` | Chat about an uploaded document |
| `GET` | `/api/v1/session/{id}` | Get session/document metadata |
| `DELETE` | `/api/v1/session/{id}` | Delete session and all associated files |
| `GET` | `/api/v1/health` | Health check |

---

## 6. Machine Learning System

### 6.1 v2 Model — SVM Classifier

**Dataset:** PIMA Indians Diabetes Dataset (`data/raw/diabetes.csv`)  
**Records:** 768 patients  
**Target:** Binary — diabetic (1) or non-diabetic (0)  
**Algorithm:** Support Vector Machine (SVM) with an RBF kernel  
**Reported Accuracy:** ~85%  

**Training script:** `backend/ml/train_v2.py`  
**Saved artifacts:**
- `models/v2/diabetes_model_v2.pkl` — trained SVM model
- `models/v2/scaler_v2.pkl` — StandardScaler for feature normalisation
- `models/v2/shap_explainer.pkl` — SHAP TreeExplainer for explanations
- `models/v2/feature_names_v2.json` — ordered list of all 16 feature names

### 6.2 v3 Model — Ensemble Classifier

**Dataset:** UCI Diabetes 130-US Hospitals (`data/raw/diabetic_data.csv`)  
**Records:** 101,766 hospital admission records  
**Target:** Binary — early readmission within 30 days (1) or not (0)  
**Algorithm:** Soft-voting ensemble of XGBoost + LightGBM + Random Forest  
**Class balancing:** SMOTE (Synthetic Minority Over-sampling Technique)

**Training script:** `backend/ml/train_v3.py`

#### Model Weights in Ensemble

```
VotingClassifier(
    estimators=[
        ("xgb",  XGBClassifier),          weight = 2
        ("lgbm", LGBMClassifier),         weight = 2
        ("rf",   RandomForestClassifier)  weight = 1
    ],
    voting="soft",
    weights=[2, 2, 1]
)
```

XGBoost and LightGBM are weighted twice as heavily as Random Forest because they have better probability calibration.

**Saved artifacts:**
- `models/v3/diabetes_model_v3.pkl` — trained ensemble
- `models/v3/scaler_v3.pkl` — StandardScaler
- `models/v3/shap_explainer_v3.pkl` — XGBoost-backed SHAP explainer
- `models/v3/feature_names_v3.json` — ordered list of all 51 features

> **Why a separate XGBoost for SHAP?** The `VotingClassifier` ensemble is not directly supported by SHAP. So during training, a separate standalone XGBoost model is trained on the same data and used only for generating SHAP explanations.

#### v3 Training Pipeline

```
CSV Load
  → Preprocessing (preprocessing_uci130.py)
  → Train/Test Split (80/20, stratified)
  → SMOTE Oversampling
  → StandardScaler
  → Ensemble Training (XGBoost + LGBM + RF)
  → Evaluation (Accuracy, AUC-ROC, Confusion Matrix, 5-Fold CV)
  → SHAP Explainability (separate XGBoost for SHAP compatibility)
  → Save artifacts to models/v3/
```

### 6.3 SHAP Explainability

SHAP (SHapley Additive exPlanations) is used to explain individual predictions. For each prediction, a **waterfall chart** is generated that shows:
- The model's **base value** (average prediction across all training data)
- Each feature's **contribution** (positive = increases risk, negative = decreases risk)
- The **final output value** (the actual prediction probability)

Both v2 and v3 servers generate this chart server-side using Matplotlib, render it with a **dark background** to match the frontend theme, and return it as a Base64-encoded PNG string in the JSON response.

**Explainability reporting script:** `backend/ml/explainability_v3.py` generates:
- `E1` — Global beeswarm plot (top 20 features across 2,000 test patients)
- `E2` — Mean |SHAP| bar chart with labelled values
- `E3` — Dependence plots for top 5 features
- `E4` — Individual waterfall plots for high-risk, borderline, and low-risk patients
- `E5` — Feature importance CSV (`reports/shap_importance_v3.csv`)

---

## 7. AI Multi-Agent RAG System

This is the most sophisticated component of MediStore AI. It uses **LangGraph** to build a stateful, multi-agent pipeline that processes user questions through a sequence of specialised AI agents.

### 7.1 What Is RAG?

RAG stands for **Retrieval-Augmented Generation**. Instead of relying purely on what an LLM knows from training, RAG first *retrieves* relevant documents from a knowledge base, then *generates* a response using both the retrieved content and the LLM's reasoning. This ensures answers are grounded in specific, verifiable sources rather than hallucinated.

### 7.2 The Agent Graph

The pipeline is a directed graph with 5 nodes:

```
[START]
   │
   ▼
orchestrator ──── (empty query) ──────────────────► [END]
   │
   ▼ (valid query)
researcher   ← calls Knowledge MCP and/or Document MCP
   │
   ▼
reasoning    ← Gemini generates a reasoning trace
   │
   ▼
analyst      ← Gemini synthesises the final structured response
   │
   ▼
guardrail    ← safety check + disclaimer injection
   │
   ▼
[END]
```

### 7.3 Agent Descriptions

#### Orchestrator (`orchestrator.py`)
- **Role:** Entry point and router.
- **What it does:** Validates that the query is not empty. Checks whether a `session_id` is present (meaning the user has uploaded a document). Sets the `doc_mode` flag accordingly.
- **Routing:** If query is empty → short-circuit to `END`. If query is valid → route to `researcher`.

#### Researcher (`researcher.py`)
- **Role:** Information retrieval.
- **What it does:** Calls the appropriate MCP servers to retrieve relevant content.
  - In **doc mode** (`session_id` present): calls the Document MCP server to search the uploaded document, then also calls the Knowledge MCP server for supplementary medical context.
  - In **standard mode**: calls only the Knowledge MCP server with the general medical knowledge base.
- **Output:** Populates `retrieved_docs` and optionally `doc_context` in the shared state.

#### Reasoning (`reasoning.py`)
- **Role:** Thinking step.
- **What it does:** Uses Gemini to generate a clinical reasoning trace — a chain-of-thought that interprets the retrieved information before the final response is written. This improves the quality and coherence of the final answer.
- **Output:** Populates `reasoning_trace` in the shared state.

#### Analyst (`analyst.py`)
- **Role:** Response generation.
- **What it does:** Takes the user query, patient context, retrieved documents, and reasoning trace, and generates the final structured response using Gemini.
  - In **doc mode:** Uses a `DOC_ANALYST_PROMPT` that instructs Gemini to cite specific pages and highlight critical medical values from the uploaded document.
  - In **standard mode:** Uses the `ANALYST_AGENT_PROMPT` that instructs Gemini to provide a clinical analysis with risk factors and actionable recommendations.
- **Output:** Populates `final_response` in the shared state.

#### Guardrail (`guardrail.py`)
- **Role:** Safety and compliance.
- **What it does:** Applies the final safety check. Always appends the medical disclaimer to the response. Checks if the query is medically related using a keyword list. In doc mode, always treats the query as in-scope (because the user uploaded a medical document).
- **Medical Disclaimer (always appended):**
  > ⚕️ *This analysis is generated by an AI system and is intended for informational purposes only. It does not constitute medical advice. Always consult a qualified healthcare professional before making any medical decisions.*

### 7.4 Shared Agent State (`state.py`)

All agents communicate through a shared `AgentState` TypedDict. This is the "memory" of the pipeline:

```python
class AgentState(TypedDict):
    user_query:       str
    patient_context:  str
    session_id:       Optional[str]      # set if document is uploaded
    doc_mode:         bool
    doc_context:      Optional[str]      # content from uploaded document
    citations:        List[CitationRef]
    conversation_history: List[dict]     # chat memory (last 3 turns used)
    retrieved_docs:   Optional[str]      # from Knowledge MCP
    reasoning_trace:  Optional[str]      # from reasoning agent
    final_response:   Optional[str]      # the answer to return
    error:            Optional[str]
    steps_taken:      List[str]          # audit trail of nodes visited
```

### 7.5 Vector Stores (ChromaDB)

ChromaDB is used as the vector database for semantic search. There are two types of collections:

#### Medical Knowledge Base (`MedicalVectorStore`)
- A **global, shared collection** called `medical_guidelines`.
- Stores chunked medical text from curated diabetes guidelines, clinical recommendations, and reference documents.
- Populated once during data ingestion (`backend/data_ingestion/`).
- Uses `all-MiniLM-L6-v2` sentence-transformer embeddings.
- Persisted to disk at `data/chroma_db/`.

#### Per-Session Document Store (`SessionVectorStore`)
- A **temporary, per-user collection** created each time a document is uploaded.
- Collection name: `session_{first_8_chars_of_session_id}`.
- Persisted to `data/session_chroma/{session_id}/`.
- Automatically deleted after 24 hours (via session TTL) or when the user explicitly deletes the session.
- Stores chunks of the uploaded document with metadata: `page_number`, `chunk_index`, `text_snippet`, `chunk_id`.

---

## 8. MCP Servers (Model Context Protocol)

MCP (Model Context Protocol) is a standard that allows AI agents to call external tools using a well-defined interface. MediStore uses MCP to decouple the agent logic from the data retrieval logic.

### Why MCP?

By putting retrieval behind MCP servers, the researcher agent does not need to know *how* ChromaDB works. It just calls a tool (`semantic_search` or `session_search`) and gets results. This makes the system modular — you could swap ChromaDB for another vector store without changing the agent code.

### Knowledge MCP Server (`mcp_servers/knowledge_mcp/server.py`)

- **Transport:** stdio (the agent spawns this as a subprocess)
- **Tools exposed:**

| Tool | Description |
|---|---|
| `semantic_search` | Searches the global medical knowledge base with a text query. Returns the top-N most semantically relevant passages. |
| `get_collection_stats` | Returns the total number of chunks in the knowledge base. |

### Document MCP Server (`mcp_servers/document_mcp/server.py`)

- **Transport:** stdio
- **Tools exposed:**

| Tool | Description |
|---|---|
| `session_search` | Searches a specific session's ChromaDB collection by `session_id` and query. Used to answer questions about an uploaded document. |

---

## 9. Feature Deep-Dives

### 9.1 Diabetes Risk Predictor (v2)

**User flow:**
1. User navigates to the v2 module from Mode Select.
2. A sidebar with a form appears with sections for Demographics, Biomarkers, and Vitals.
3. User enters values using range sliders and number fields.
4. User clicks **"Analyze Patient Risk"**.
5. The frontend calls `POST /predict` on Port 8000 with the 8 biomarker values.
6. The backend computes 8 engineered features, scales all 16 features, runs the SVM, computes SHAP values, generates a waterfall chart, and returns the response.
7. The frontend displays:
   - A prediction badge (High Risk / Low Risk)
   - A gauge chart showing risk level
   - Probability bars (Diabetic % vs Non-Diabetic %)
   - The SHAP waterfall chart
   - A risk factor panel (red/yellow/green markers for each input)
   - A list of clinical recommendations (different for high-risk and low-risk)
   - A button to open the Care Locator with pre-filtered results based on risk level

### 9.2 Complication Risk Predictor (v3)

**User flow:**
1. User navigates to the v3 module.
2. A complex sidebar form appears with 7 sections: Demographics, Hospital Visit, Procedures & Lab Counts, Diagnoses, Lab Results, Key Medications, and Other Medications.
3. User fills in all 45+ fields (with default values pre-populated).
4. User clicks **"Assess Complication Risk"**.
5. The frontend calls `POST /predict_v3` on Port 8001.
6. The backend builds the 51-feature vector, scales it, runs the ensemble, computes SHAP values, and returns the response.
7. The results screen is identical in structure to v2 but uses different labels:
   - High Risk: "High-Risk Readmission" vs Low Risk: "Low-Risk / Stable"
   - SHAP description: "How each clinical feature influenced the readmission risk score."

### 9.3 Document Intelligence

**User flow:**
1. User navigates to the Document Intelligence module.
2. A two-column layout appears:
   - **Left panel:** Document upload zone (supports PDF and medical images: JPG, PNG, WEBP, TIFF, BMP)
   - **Right panel:** Chat interface (disabled until a document is uploaded)
3. User drags and drops or selects a file.
4. Frontend calls `POST /api/v1/upload` on Port 8002.
5. Backend pipeline runs:
   ```
   File saved
     → Type detection (PDF or image)
     → Text extraction (PyMuPDF for PDFs, Gemini Vision for images)
     → Document chunking (sliding window with overlap)
     → ChromaDB embedding and indexing
     → Session registration (24h TTL)
     → Return session_id to frontend
   ```
6. Left panel switches from upload zone to `DocViewer` (shows filename, page count, chunk count, preview text).
7. Right panel's chat becomes active.
8. User types a question about the document.
9. Frontend calls `POST /api/v1/doc-chat` with `session_id`, the query, and conversation history.
10. The 5-agent pipeline runs in **doc mode**:
    - Researcher searches the uploaded document's vector store
    - Analyst cites specific pages in the response
11. Response appears in the chat with expandable citation panels showing which pages each answer came from.

### 9.4 Care Locator

**User flow:**
1. User can navigate to Care Locator directly from Mode Select, or be automatically redirected from either predictor module after a high-risk result.
2. When redirected from a predictor, the risk level and category (e.g., "endocrinologist") are pre-filled.
3. A Google Map is rendered with markers for nearby healthcare facilities.
4. The frontend calls `GET /api/places/nearby` with the user's latitude/longitude, radius, category, and risk level filters.
5. The backend returns a curated list of diabetes-relevant facilities (hospitals, endocrinologists, pharmacies, diagnostic labs).
6. Each facility card shows: name, category, rating, distance, address, phone, website, services offered, supplies available, and whether telehealth is available.
7. Users can also search by name/keyword via `GET /api/places/search`.

> The care facility data is currently stored as a verified static list in `backend/api/places_service.py`, covering hospitals, clinics, pharmacies, and labs in the Colombo, Sri Lanka region.

### 9.5 AI Copilot Chat

Both the v2 and v3 predictors include an attached **Copilot Chat** sidebar. After running a prediction, the user can ask follow-up questions. The chat component automatically builds a `patient_context` string from the prediction inputs and result, which is sent with every message to the RAG API. This means the AI knows the patient's biomarkers and prediction result when answering questions like *"What does my glucose level mean?"* or *"What lifestyle changes should I make?"*.

---

## 10. Complete System Data Flow

### 10.1 Standard Prediction Flow (v2 or v3)

```
User fills form
      │
      ▼
React Frontend
      │ POST /predict or /predict_v3
      │ {clinical fields as JSON}
      ▼
FastAPI Backend (Port 8000 or 8001)
      │
      ├─ Feature engineering (compute derived features)
      ├─ StandardScaler.transform(input)
      ├─ model.predict(scaled_input)  →  0 or 1
      ├─ model.predict_proba(scaled_input)  →  [prob_neg, prob_pos]
      ├─ explainer(scaled_input)  →  SHAP values
      ├─ matplotlib waterfall chart  →  base64 PNG
      │
      ▼
JSON Response {prediction, probability_positive, probability_negative, shap_image_base64}
      │
      ▼
React ResultDashboard renders all results
```

### 10.2 Document Intelligence Flow

```
User uploads file
      │
      ▼
POST /api/v1/upload  (Port 8002)
      │
      ├─ File type detection (PDF vs image)
      ├─ Text extraction:
      │     PDF   →  PyMuPDF (page-by-page)
      │     Image →  Gemini Vision OCR
      ├─ Chunking (sliding window, ~400 chars, 50 char overlap)
      ├─ Embedding (all-MiniLM-L6-v2 via ChromaDB)
      ├─ Session registration (in-memory, 24h TTL)
      │
      ▼
UploadResponse {session_id, filename, total_pages, chunk_count, preview_text}
      │
      ▼
User types a question
      │
      ▼
POST /api/v1/doc-chat {session_id, query, conversation_history}
      │
      ▼
LangGraph Pipeline (5 agents):
      │
      ├─ [1] Orchestrator: validate query, set doc_mode=True
      ├─ [2] Researcher:   call Document MCP → retrieve relevant chunks from session ChromaDB
      │                    call Knowledge MCP → retrieve general medical context
      ├─ [3] Reasoning:    Gemini generates reasoning trace
      ├─ [4] Analyst:      Gemini synthesises response, cites pages
      └─ [5] Guardrail:    append medical disclaimer
      │
      ▼
DocChatResponse {response, steps_taken, citations}
      │
      ▼
React DocChat renders message + CitationPanel
```

---

## 11. Current Deployment — Docker

The project includes a `docker-compose.yml` that runs all three backend services and the frontend together with a single command.

### Services in docker-compose.yml

| Service | Container name | Port |
|---|---|---|
| `backend-v2` | `medistore_backend_v2` | 8000:8000 |
| `backend-v3` | `medistore_backend_v3` | 8001:8001 |
| `frontend` | `medistore_frontend` | 5173:5173 |

> **Note:** The RAG backend (Port 8002) is not yet included in docker-compose.yml and must be started separately: `uvicorn backend.main:app --reload --port 8002`

### Backend Dockerfile

The backend Dockerfile uses `python:3.12-slim` and installs `libgomp1` (required by LightGBM and XGBoost at runtime). It copies the `backend/`, `models/`, and `data/` directories into the container.

### Running Locally

```bash
# Start all Docker services
docker-compose up --build

# Or start individually:
uvicorn backend.api.v2_server:app --port 8000 --reload
uvicorn backend.api.v3_server:app --port 8001 --reload
uvicorn backend.main:app --port 8002 --reload

# Start frontend
cd frontend && npm run dev
```

---

## 12. Planned: SQL Database Integration

### Why an SQL Database Is Needed

Currently, the system has no persistent data storage. All session data is in-memory and lost when the server restarts. User authentication exists only on the frontend. There is no way to track prediction history, audit AI interactions, or analyse system usage. An SQL database will solve all of these problems.

### Recommended Database: Azure SQL (or PostgreSQL)

**Why Azure SQL?**
- Fully managed — no need to manage server patching or backups
- Native integration with the planned Azure CI/CD pipeline
- Supports all needed relational features (foreign keys, indexes, transactions)
- Built-in geo-replication for disaster recovery

---

### 12.1 Recommended Database Schema

#### Table 1: `users`

Stores registered user accounts.

```sql
CREATE TABLE users (
    user_id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    name          VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,           -- bcrypt hash, never plain text
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_users_email ON users(email);
```

#### Table 2: `prediction_sessions`

Tracks every time a user runs a prediction (v2 or v3).

```sql
CREATE TABLE prediction_sessions (
    session_id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    model_version        VARCHAR(10)   NOT NULL,    -- 'v2' or 'v3'
    created_at           TIMESTAMP     NOT NULL DEFAULT NOW(),
    prediction_result    INTEGER       NOT NULL,    -- 0 = low risk, 1 = high risk
    probability_positive DECIMAL(5,2)  NOT NULL,    -- e.g. 67.35
    probability_negative DECIMAL(5,2)  NOT NULL,
    input_features       JSONB         NOT NULL,    -- full JSON of input fields
    shap_image_path      VARCHAR(500)              -- path to SHAP image in Blob Storage
);

CREATE INDEX idx_pred_sessions_user ON prediction_sessions(user_id);
CREATE INDEX idx_pred_sessions_date ON prediction_sessions(created_at);
```

**Why JSONB for `input_features`?**  
The v2 model has 8 inputs; the v3 has 45+ inputs. JSONB lets both live in the same table without defining 50+ columns. It also means adding new features to the model does not require an `ALTER TABLE`.

#### Table 3: `document_sessions`

Tracks uploaded document sessions (replaces the in-memory `SessionStore`).

```sql
CREATE TABLE document_sessions (
    session_id        UUID         PRIMARY KEY,
    user_id           UUID         REFERENCES users(user_id) ON DELETE CASCADE,
    original_filename VARCHAR(500) NOT NULL,
    doc_type          VARCHAR(20)  NOT NULL,         -- 'pdf' or 'image'
    total_pages       INTEGER      NOT NULL,
    chunk_count       INTEGER      NOT NULL,
    preview_text      TEXT,
    extraction_method VARCHAR(50),                   -- 'pymupdf' or 'gemini-vision'
    file_blob_path    VARCHAR(500),                  -- path in Azure Blob Storage
    chroma_path       VARCHAR(500),                  -- path to ChromaDB collection
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW(),
    expires_at        TIMESTAMP    NOT NULL,
    is_deleted        BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_doc_sessions_user   ON document_sessions(user_id);
CREATE INDEX idx_doc_sessions_expiry ON document_sessions(expires_at);
```

#### Table 4: `chat_messages`

Persists AI chat conversation history.

```sql
CREATE TABLE chat_messages (
    message_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_session_id  UUID        REFERENCES document_sessions(session_id) ON DELETE CASCADE,
    pred_session_id UUID        REFERENCES prediction_sessions(session_id) ON DELETE CASCADE,
    user_id         UUID        REFERENCES users(user_id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content         TEXT        NOT NULL,
    steps_taken     JSONB,       -- agent pipeline steps for debugging
    citations       JSONB,       -- citation references from doc chat
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_doc_session  ON chat_messages(doc_session_id);
CREATE INDEX idx_chat_pred_session ON chat_messages(pred_session_id);
CREATE INDEX idx_chat_user         ON chat_messages(user_id);
```

#### Table 5: `care_searches`

Logs Care Locator searches for analytics.

```sql
CREATE TABLE care_searches (
    search_id    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID          REFERENCES users(user_id) ON DELETE SET NULL,
    lat          DECIMAL(9,6)  NOT NULL,
    lng          DECIMAL(9,6)  NOT NULL,
    radius_m     INTEGER       NOT NULL DEFAULT 10000,
    category     VARCHAR(50),
    risk_level   VARCHAR(50),
    result_count INTEGER,
    created_at   TIMESTAMP     NOT NULL DEFAULT NOW()
);
```

#### Table 6: `audit_log`

Immutable audit trail for all significant system events (security and compliance).

```sql
CREATE TABLE audit_log (
    log_id      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         REFERENCES users(user_id) ON DELETE SET NULL,
    event_type  VARCHAR(100) NOT NULL,    -- e.g. 'login', 'prediction', 'upload', 'delete_session'
    event_data  JSONB,
    ip_address  VARCHAR(50),
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_type ON audit_log(event_type);
CREATE INDEX idx_audit_date ON audit_log(created_at);
```

---

### 12.2 Entity-Relationship Diagram

```
users (1)
  │
  ├──── (many) prediction_sessions
  │           └──── (many) chat_messages
  │
  ├──── (many) document_sessions
  │           └──── (many) chat_messages
  │
  ├──── (many) care_searches
  │
  └──── (many) audit_log
```

---

### 12.3 How the Backend Should Connect to the Database

#### Recommended Library: SQLAlchemy + asyncpg

```python
# backend/database/connection.py

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL")
# e.g., postgresql+asyncpg://user:password@host/medistore_db

engine = create_async_engine(DATABASE_URL, echo=False, pool_size=10, max_overflow=20)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db() -> AsyncSession:
    """FastAPI dependency — provides a DB session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

#### Integration Points in the Backend

| Current Code | Current Behavior | With SQL Database |
|---|---|---|
| `backend/rag/session_store.py` | In-memory session dict | Replace with DB read/write to `document_sessions` |
| `/upload` in routes.py | Creates session in memory | INSERT into `document_sessions`, write file to Azure Blob |
| `/doc-chat` in routes.py | Looks up in-memory session | SELECT from `document_sessions` |
| `/predict` in v2_server.py | Returns result, not stored | INSERT into `prediction_sessions` + `audit_log` |
| `/predict_v3` in v3_server.py | Returns result, not stored | INSERT into `prediction_sessions` + `audit_log` |
| `App.jsx` localStorage | Frontend-only auth | Real JWT auth against `users` table |

#### New Backend Endpoints to Add

```
POST   /auth/register                →  Create user in users table
POST   /auth/login                   →  Verify password, return JWT token
POST   /auth/logout                  →  Invalidate token

GET    /history/predictions          →  List user's prediction history
GET    /history/predictions/{id}     →  Get a specific prediction + SHAP
GET    /history/documents            →  List user's document sessions

GET    /admin/analytics              →  (admin-only) aggregate usage stats
```

---

### 12.4 Database in Docker (Local Development)

```yaml
# Add to docker-compose.yml for local development:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: medistore
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: medistore_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

In Azure, this local PostgreSQL container would be replaced by **Azure SQL Database** or **Azure Database for PostgreSQL (Flexible Server)**, providing managed backups, scaling, and high availability.

---

## 13. Planned: Azure CI/CD Pipeline

### Overview

The Azure CI/CD pipeline automates the entire process from pushing code to deploying the updated application. Whenever a developer pushes code to the repository, Azure DevOps automatically tests it, builds Docker images, pushes them to a private registry, and deploys everything to a Kubernetes cluster in Azure.

### 13.1 Recommended Azure Services

| Azure Service | Purpose |
|---|---|
| **Azure DevOps** | CI/CD pipelines — build, test, and deploy stages |
| **Azure Container Registry (ACR)** | Private Docker image registry |
| **Azure Kubernetes Service (AKS)** | Runs all application containers in production |
| **Azure SQL Database** | Managed relational database for persistent data |
| **Azure Blob Storage** | Stores uploaded medical documents and SHAP images |
| **Azure Key Vault** | Securely stores API keys, DB passwords, and secrets |
| **Azure API Management (APIM)** | API gateway, rate limiting, and authentication layer |
| **Azure Monitor + Log Analytics** | Centralised logging, metrics, and alerts |

---

### 13.2 Repository and Branch Strategy

```
main         ← Production branch. Merging here triggers production deployment.
develop      ← Integration branch. Merging here triggers staging deployment.
feature/*    ← Feature branches. PRs to develop trigger CI checks only.
```

---

### 13.3 Complete CI/CD Pipeline — Step by Step

#### Stage 1: Continuous Integration (CI)

Triggered on every push to any branch.

```yaml
# azure-pipelines.yml (simplified)

trigger:
  branches:
    include: [main, develop, feature/*]

stages:
  - stage: CI
    displayName: "Build & Test"
    jobs:
      - job: BackendTests
        pool:
          vmImage: ubuntu-latest
        steps:
          - task: UsePythonVersion@0
            inputs:
              versionSpec: "3.12"

          - script: |
              pip install -r requirements.txt -r requirements_uci130.txt -r requirements_rag.txt
              pip install pytest pytest-asyncio
            displayName: "Install Python dependencies"

          - script: python -m pytest backend/tests/ -v --tb=short
            displayName: "Run backend unit tests"

      - job: FrontendTests
        pool:
          vmImage: ubuntu-latest
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: "20.x"

          - script: cd frontend && npm ci
            displayName: "Install npm packages"

          - script: cd frontend && npm run lint
            displayName: "Run lint checks (oxlint)"

          - script: cd frontend && npm run build
            displayName: "Build frontend (validates no compile errors)"
```

#### Stage 2: Build Docker Images and Push to ACR

Only runs on pushes to `main` or `develop` after CI passes.

```yaml
  - stage: BuildImages
    displayName: "Build & Push Docker Images"
    dependsOn: CI
    condition: and(succeeded(), in(variables['Build.SourceBranchName'], 'main', 'develop'))
    jobs:
      - job: BuildAndPush
        steps:
          - task: AzureCLI@2
            inputs:
              azureSubscription: "MediStore-Azure-ServiceConnection"
              scriptType: bash
              scriptLocation: inlineScript
              inlineScript: |
                az acr login --name medistoreacr

                # Backend images (v2, v3 share Dockerfile; different CMD set in k8s)
                docker build -t medistoreacr.azurecr.io/backend-v2:$(Build.BuildId) \
                             -t medistoreacr.azurecr.io/backend-v2:latest \
                             -f Dockerfile .
                docker push medistoreacr.azurecr.io/backend-v2:$(Build.BuildId)
                docker push medistoreacr.azurecr.io/backend-v2:latest

                docker tag medistoreacr.azurecr.io/backend-v2:$(Build.BuildId) \
                           medistoreacr.azurecr.io/backend-v3:$(Build.BuildId)
                docker push medistoreacr.azurecr.io/backend-v3:$(Build.BuildId)

                # RAG backend
                docker build -t medistoreacr.azurecr.io/backend-rag:$(Build.BuildId) \
                             -f Dockerfile.rag .
                docker push medistoreacr.azurecr.io/backend-rag:$(Build.BuildId)

                # Frontend
                docker build -t medistoreacr.azurecr.io/frontend:$(Build.BuildId) \
                             -t medistoreacr.azurecr.io/frontend:latest \
                             -f frontend/Dockerfile ./frontend
                docker push medistoreacr.azurecr.io/frontend:$(Build.BuildId)
                docker push medistoreacr.azurecr.io/frontend:latest
```

#### Stage 3: Deploy to Staging (develop branch only)

```yaml
  - stage: DeployStaging
    displayName: "Deploy to Staging"
    dependsOn: BuildImages
    condition: and(succeeded(), eq(variables['Build.SourceBranchName'], 'develop'))
    jobs:
      - deployment: DeployToStaging
        environment: "medistore-staging"
        strategy:
          runOnce:
            deploy:
              steps:
                - task: KubernetesManifest@0
                  displayName: "Rolling deploy to staging namespace"
                  inputs:
                    action: deploy
                    kubernetesServiceConnection: "AKS-MediStore-ServiceConnection"
                    namespace: staging
                    manifests: |
                      k8s/backend-v2-deployment.yaml
                      k8s/backend-v3-deployment.yaml
                      k8s/backend-rag-deployment.yaml
                      k8s/frontend-deployment.yaml
                    containers: |
                      medistoreacr.azurecr.io/backend-v2:$(Build.BuildId)
                      medistoreacr.azurecr.io/backend-v3:$(Build.BuildId)
                      medistoreacr.azurecr.io/backend-rag:$(Build.BuildId)
                      medistoreacr.azurecr.io/frontend:$(Build.BuildId)
```

#### Stage 4: Deploy to Production (main branch, with approval)

```yaml
  - stage: DeployProduction
    displayName: "Deploy to Production"
    dependsOn: BuildImages
    condition: and(succeeded(), eq(variables['Build.SourceBranchName'], 'main'))
    jobs:
      - deployment: DeployToProduction
        environment: "medistore-production"   # ← manual approval gate configured here
        strategy:
          runOnce:
            deploy:
              steps:
                - task: KubernetesManifest@0
                  displayName: "Rolling deploy to production namespace"
                  inputs:
                    action: deploy
                    kubernetesServiceConnection: "AKS-MediStore-ServiceConnection"
                    namespace: production
                    manifests: |
                      k8s/backend-v2-deployment.yaml
                      k8s/backend-v3-deployment.yaml
                      k8s/backend-rag-deployment.yaml
                      k8s/frontend-deployment.yaml
                    containers: |
                      medistoreacr.azurecr.io/backend-v2:$(Build.BuildId)
                      medistoreacr.azurecr.io/backend-v3:$(Build.BuildId)
                      medistoreacr.azurecr.io/backend-rag:$(Build.BuildId)
                      medistoreacr.azurecr.io/frontend:$(Build.BuildId)
```

> **Manual Approval Gate:** The production environment in Azure DevOps is configured with an approval check. A designated reviewer must click "Approve" before the pipeline continues. This prevents accidental deployments of untested code to production.

---

### 13.4 Kubernetes Manifests (AKS)

Each service runs as a separate **Deployment** in Kubernetes. Services are exposed internally via **ClusterIP**, and the frontend/API gateway is exposed to the internet via a **LoadBalancer** or **Ingress Controller**.

#### Example: Backend v2 Deployment

```yaml
# k8s/backend-v2-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-v2
  namespace: production
spec:
  replicas: 2                          # 2 instances for high availability
  selector:
    matchLabels:
      app: backend-v2
  template:
    metadata:
      labels:
        app: backend-v2
    spec:
      containers:
        - name: backend-v2
          image: medistoreacr.azurecr.io/backend-v2:latest
          command: ["uvicorn", "backend.api.v2_server:app",
                    "--host", "0.0.0.0", "--port", "8000"]
          ports:
            - containerPort: 8000
          env:
            - name: GOOGLE_MAPS_API_KEY
              valueFrom:
                secretKeyRef:
                  name: medistore-secrets
                  key: google-maps-api-key
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: medistore-secrets
                  key: database-url
          resources:
            requests:
              memory: "512Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "500m"
          readinessProbe:               # Kubernetes waits for this before routing traffic
            httpGet:
              path: /
              port: 8000
            initialDelaySeconds: 15
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: backend-v2-service
  namespace: production
spec:
  selector:
    app: backend-v2
  ports:
    - port: 8000
      targetPort: 8000
  type: ClusterIP
```

---

### 13.5 Secrets Management with Azure Key Vault

All sensitive values (API keys, database passwords, connection strings) are stored in **Azure Key Vault** and injected into pods at runtime via the **Azure Key Vault Provider for Secrets Store CSI Driver**. This means no secrets ever appear in source code, environment files, or Docker images.

**Secrets stored in Key Vault:**

| Secret name | Value |
|---|---|
| `google-api-key` | Google Gemini AI key |
| `google-maps-api-key` | Google Maps Places API key |
| `database-url` | Azure SQL connection string |
| `azure-blob-connection-string` | Azure Blob Storage connection |
| `jwt-secret-key` | JWT signing key (for future auth) |

---

### 13.6 Complete Azure Architecture Diagram

```
Internet
    │
    ▼
Azure API Management (APIM)
  Rate limiting · API key validation · Request routing
    │
    ▼
Azure Kubernetes Service (AKS)
  ┌─────────────────────────────────────────────────────────────┐
  │  Namespace: production                                       │
  │                                                             │
  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐    │
  │  │ frontend    │  │ backend-v2  │  │ backend-v3       │    │
  │  │ (React SPA) │  │ (Port 8000) │  │ (Port 8001)      │    │
  │  │ 2 replicas  │  │ 2 replicas  │  │ 2 replicas       │    │
  │  └─────────────┘  └─────────────┘  └──────────────────┘    │
  │                                                             │
  │  ┌─────────────────┐                                       │
  │  │ backend-rag     │                                       │
  │  │ (Port 8002)     │                                       │
  │  │ 2 replicas      │                                       │
  │  └─────────────────┘                                       │
  └─────────────────────────────────────────────────────────────┘
         │                    │                  │
         ▼                    ▼                  ▼
  Azure SQL Database    Azure Blob          Azure Key Vault
  (users, predictions,  Storage             (All secrets)
   sessions, chat,      (Documents,
   audit log)           SHAP images)
         │
         ▼
  Azure Monitor + Log Analytics
  (Alerts, dashboards, centralised logs)
```

---

### 13.7 CI/CD Complete Workflow Summary

The following describes the **end-to-end journey** from a developer's code change to running in production:

**Step 1 — Developer pushes code**  
A developer pushes a feature branch. A pull request (PR) is opened against `develop`.

**Step 2 — CI triggers automatically**  
Azure DevOps runs:
- Python unit tests (`pytest`)
- Frontend lint checks (`oxlint`)
- Frontend build validation (`npm run build`)  
If any step fails, the PR cannot be merged.

**Step 3 — PR review and merge**  
A team member reviews the code. If approved, the PR is merged into `develop`.

**Step 4 — Staging deployment triggers**  
Merging to `develop` triggers the full pipeline:
- CI runs on the merged code
- Docker images are built for all 4 services
- Images are tagged and pushed to Azure Container Registry
- All 4 services are rolling-deployed to the **staging namespace** in AKS

**Step 5 — Manual testing on staging**  
QA and the team test the staging environment to confirm everything works correctly.

**Step 6 — Merge to main (release)**  
A PR is merged from `develop` into `main`.

**Step 7 — Production deployment (with approval)**  
The pipeline triggers and pauses at the production stage. A notification is sent to the designated approver, who reviews and clicks "Approve" in Azure DevOps.

**Step 8 — Rolling production deployment**  
Kubernetes performs a zero-downtime rolling update:
- New pods start with the new image
- Health checks verify new pods are ready
- Old pods are terminated only after new ones pass their readiness probe

**Step 9 — Monitoring**  
Azure Monitor collects metrics (CPU, memory, response times, error rates). Alerts notify the team if error rates spike or latency exceeds thresholds.

---

### 13.8 Database Migrations in CI/CD

Schema changes (new tables, columns, indexes) are managed using **Alembic** (the migration tool for SQLAlchemy).

```
Developer writes a migration file
        │
        ▼
Committed to source control alongside the code change
        │
        ▼
Production CI/CD stage:
        │
        ├── Run: alembic upgrade head
        │         ↓
        │   Applies only new, unapplied migrations
        │   (Alembic tracks applied migrations in the DB itself)
        │
        ▼
Application code deployed (schema is now correct)
```

**Key rules:**
- Migrations must always be **backward-compatible** (never drop a column the current code still reads)
- Migrations run **before** the new application code is deployed
- All migrations are reviewed in code review alongside the application changes that depend on them

---

## 14. Environment Variables & Configuration

### Root `.env` (Backend)

```env
GOOGLE_API_KEY=your-google-gemini-api-key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/medistore_db
AZURE_BLOB_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
JWT_SECRET_KEY=your-jwt-secret
SESSION_TTL_HOURS=24
```

### Frontend `.env`

```env
VITE_API_V2_URL=http://localhost:8000
VITE_API_V3_URL=http://localhost:8001
VITE_RAG_API_URL=http://localhost:8002
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### `backend/config.py` — Path Configuration

The `config.py` file centralises all filesystem paths so that the code runs correctly regardless of whether it is started from the project root, the `backend/` directory, or a Docker container.

Key paths:
- `PROJECT_ROOT` — 2 levels above `config.py` (i.e., the repo root)
- `DATA_DIR` — `{PROJECT_ROOT}/data/`
- `MODELS_DIR` — `{PROJECT_ROOT}/models/`
- `CHROMA_DB_DIR` — `{PROJECT_ROOT}/data/chroma_db/`
- `UPLOADS_DIR` — `{PROJECT_ROOT}/data/uploads/`
- `SESSION_CHROMA_DIR` — `{PROJECT_ROOT}/data/session_chroma/`
- `V2_MODEL` — `models/v2/diabetes_model_v2.pkl`
- `V3_MODEL` — `models/v3/diabetes_model_v3.pkl`

---

## Appendix: Directory Reference

```
MediStore Diabetes Prediction/
├── backend/
│   ├── api/
│   │   ├── v2_server.py              ← SVM prediction + Places API (Port 8000)
│   │   ├── v3_server.py              ← Ensemble prediction (Port 8001)
│   │   └── places_service.py         ← Care facility data + Haversine distance
│   ├── app/
│   │   ├── agents/
│   │   │   ├── state.py              ← Shared AgentState TypedDict
│   │   │   ├── orchestrator.py       ← Agent 1: validate + route
│   │   │   ├── researcher.py         ← Agent 2: call MCP servers
│   │   │   ├── reasoning.py          ← Agent 3: Gemini reasoning trace
│   │   │   ├── analyst.py            ← Agent 4: Gemini final response
│   │   │   └── guardrail.py          ← Agent 5: safety + disclaimer
│   │   ├── api/
│   │   │   └── routes.py             ← RAG API endpoints (Port 8002)
│   │   ├── graph.py                  ← LangGraph StateGraph definition
│   │   └── main.py                   ← Creates FastAPI app
│   ├── ml/
│   │   ├── train_v2.py               ← Train SVM on PIMA dataset
│   │   ├── train_v3.py               ← Train XGB+LGBM+RF on UCI-130
│   │   ├── preprocessing_uci130.py   ← UCI-130 cleaning + feature engineering
│   │   ├── explainability_v3.py      ← Generate SHAP explainability reports
│   │   ├── ablation_v3.py            ← Feature ablation study
│   │   ├── robustness_v3.py          ← Model robustness testing
│   │   └── model_runner.py           ← Load artifacts for internal use
│   ├── rag/
│   │   ├── vector_store.py           ← MedicalVectorStore + SessionVectorStore
│   │   ├── document_processor.py     ← PDF / image text extraction
│   │   ├── chunker.py                ← Sliding window document chunking
│   │   ├── session_store.py          ← In-memory session registry (24h TTL)
│   │   ├── prompts.py                ← System prompts for Gemini agents
│   │   └── agents.py                 ← RAG agent definitions
│   ├── config.py                     ← Centralised filesystem paths
│   └── main.py                       ← RAG server entry point (Port 8002)
│
├── frontend/
│   └── src/
│       ├── App.jsx                   ← Root component + screen router
│       ├── screens/                  ← Full-page screen components
│       ├── components/               ← Reusable UI components
│       ├── api/                      ← API client functions
│       ├── styles/                   ← Additional CSS files
│       └── hooks/                    ← Custom React hooks
│
├── mcp_servers/
│   ├── knowledge_mcp/server.py       ← Global knowledge base MCP server
│   └── document_mcp/server.py        ← Per-session document MCP server
│
├── models/
│   ├── v2/                           ← SVM model artifacts (.pkl, .json)
│   └── v3/                           ← Ensemble model artifacts (.pkl, .json)
│
├── data/
│   ├── raw/                          ← PIMA and UCI-130 CSV datasets
│   ├── chroma_db/                    ← Global medical knowledge ChromaDB
│   ├── uploads/                      ← Uploaded document files (per session)
│   └── session_chroma/               ← Per-session ChromaDB collections
│
├── reports/
│   ├── figures/                      ← SHAP charts and explainability plots
│   └── *.csv                         ← Robustness and importance CSVs
│
├── docker-compose.yml                ← Run all services with docker compose up
├── Dockerfile                        ← Backend container definition
├── requirements.txt                  ← Core Python dependencies
├── requirements_uci130.txt           ← ML training dependencies
└── requirements_rag.txt              ← RAG system dependencies
```

---

*This documentation covers the complete MediStore AI system as of September 2026.*
