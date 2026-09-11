"""
╔══════════════════════════════════════════════════════════════════════╗
║  MediStore AI  —  Robustness Evaluation Suite  (v3 Ensemble)        ║
║  ─────────────────────────────────────────────────────────────────  ║
║  Tests model reliability and stability under realistic challenging   ║
║  input conditions. All tests operate on the EXISTING trained model  ║
║  — no retraining or modification of production artefacts occurs.    ║
║                                                                      ║
║  Test Suite:                                                         ║
║    T1  Gaussian Noise Injection  (raw-feature space, % of σ)        ║
║    T2  Random Feature Dropout    (missing/unavailable features)      ║
║    T3  Top-Feature Sensitivity   (importance-ordered dropout)        ║
║    T4  Decision Threshold Sweep  (precision–recall trade-off)        ║
║    T5  Bootstrap Confidence Intervals  (AUC-ROC, n=1000)            ║
║                                                                      ║
║  Outputs  (reports/ and reports/figures/):                           ║
║    robustness_noise_injection_v3.csv                                 ║
║    robustness_feature_dropout_v3.csv                                 ║
║    robustness_top_feature_sensitivity_v3.csv                         ║
║    robustness_threshold_sensitivity_v3.csv                           ║
║    robustness_bootstrap_ci_v3.csv                                    ║
║    robustness_master_summary_v3.csv                                  ║
║    figures/robustness_T1_noise_injection_v3.png                      ║
║    figures/robustness_T2_feature_dropout_v3.png                      ║
║    figures/robustness_T3_top_feature_sensitivity_v3.png              ║
║    figures/robustness_T4_threshold_sensitivity_v3.png                ║
║    figures/robustness_T5_bootstrap_ci_v3.png                         ║
║    figures/robustness_dashboard_v3.png                               ║
╚══════════════════════════════════════════════════════════════════════╝

Run from the project root:
    python -m backend.ml.robustness_v3
"""

# ── Standard Library ──────────────────────────────────────────────────────────
import json
import sys
import warnings
from pathlib import Path

# ── Third-Party ───────────────────────────────────────────────────────────────
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from matplotlib.patches import FancyBboxPatch
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split

# ── Project ───────────────────────────────────────────────────────────────────
from backend.config import (
    UCI130_CSV, V3_MODEL, V3_SCALER, V3_FEATURES,
    REPORTS_DIR, FIGURES_DIR, ensure_dirs,
)
from backend.ml.preprocessing_uci130 import preprocess

# ── Setup ─────────────────────────────────────────────────────────────────────
warnings.filterwarnings("ignore")
ensure_dirs()
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ── Colour palette (consistent across all plots) ──────────────────────────────
PALETTE = {
    "baseline":  "#1565C0",   # strong blue
    "metric_1":  "#1E88E5",   # AUC-ROC    – blue
    "metric_2":  "#43A047",   # Accuracy   – green
    "metric_3":  "#FB8C00",   # F1 Score   – orange
    "metric_4":  "#E53935",   # Recall     – red
    "metric_5":  "#8E24AA",   # Precision  – purple
    "drop":      "#E53935",   # degradation – red
    "ci_band":   "#90CAF9",   # CI shade   – light blue
    "grid":      "#E0E0E0",
    "bg":        "#FAFAFA",
}

PLOT_STYLE = {
    "font.family":        "DejaVu Sans",
    "axes.titlesize":     13,
    "axes.titleweight":   "bold",
    "axes.labelsize":     11,
    "xtick.labelsize":    9,
    "ytick.labelsize":    9,
    "legend.fontsize":    9,
    "axes.spines.top":    False,
    "axes.spines.right":  False,
    "axes.grid":          True,
    "grid.color":         PALETTE["grid"],
    "grid.linewidth":     0.7,
    "figure.facecolor":   "white",
    "axes.facecolor":     PALETTE["bg"],
}
plt.rcParams.update(PLOT_STYLE)


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  Helper utilities                                                            ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

def metrics_dict(y_true, y_pred, y_prob, label: str) -> dict:
    """Return a standardised metrics dictionary for one experiment row."""
    try:
        auc = round(roc_auc_score(y_true, y_prob), 4)
    except Exception:
        auc = float("nan")
    return {
        "Variant":           label,
        "AUC-ROC":           auc,
        "Accuracy (%)":      round(accuracy_score(y_true, y_pred) * 100, 2),
        "Precision":         round(precision_score(y_true, y_pred, zero_division=0), 4),
        "Recall":            round(recall_score(y_true, y_pred, zero_division=0), 4),
        "F1 Score (Pos)":    round(f1_score(y_true, y_pred, zero_division=0), 4),
        "F1 Score (Macro)":  round(f1_score(y_true, y_pred, average="macro", zero_division=0), 4),
    }


def save_df(df: pd.DataFrame, filename: str) -> None:
    path = REPORTS_DIR / filename
    df.to_csv(path, index=False)
    print(f"      Saved: {filename}")


def section(title: str) -> None:
    print(f"\n{'─'*65}")
    print(f"  {title}")
    print(f"{'─'*65}")


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  STARTUP                                                                     ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

print("=" * 65)
print("  MediStore AI — Robustness Evaluation Suite  (v3 Ensemble)")
print("=" * 65)

# ── Load artefacts ────────────────────────────────────────────────────────────
section("[INIT] Loading existing v3 model artefacts")
try:
    model  = joblib.load(V3_MODEL)
    scaler = joblib.load(V3_SCALER)
    with open(V3_FEATURES) as fh:
        feature_names: list[str] = json.load(fh)
    print(f"  Model    : {V3_MODEL.name}")
    print(f"  Scaler   : {V3_SCALER.name}")
    print(f"  Features : {len(feature_names)}")
except FileNotFoundError as exc:
    print(f"  ERROR — {exc}")
    print("  Run 'python -m backend.ml.train_v3' first.")
    sys.exit(1)

# ── Load & split data (identical seed to training) ────────────────────────────
section("[INIT] Preprocessing UCI-130 data & recreating test split")
df_all, feat_cols = preprocess(str(UCI130_CSV))
X_all  = df_all[feat_cols].values
y_all  = df_all["target"].values

X_train_raw, X_test_raw, y_train_raw, y_test = train_test_split(
    X_all, y_all, test_size=0.20, random_state=42, stratify=y_all
)

# Feature standard deviations (from TRAINING raw data) — used for % noise
feat_stds = X_train_raw.std(axis=0)
feat_stds[feat_stds == 0] = 1e-6   # guard against zero-variance features

# Apply saved scaler → production-equivalent test set
X_test_s = scaler.transform(X_test_raw)

n_features = X_test_s.shape[1]
n_test     = len(y_test)

# ── Baseline metrics ──────────────────────────────────────────────────────────
y_pred_base = model.predict(X_test_s)
y_prob_base = model.predict_proba(X_test_s)[:, 1]
BASE        = metrics_dict(y_test, y_pred_base, y_prob_base, "Baseline (Clean)")

print(f"\n  Baseline AUC-ROC  : {BASE['AUC-ROC']:.4f}")
print(f"  Baseline Accuracy : {BASE['Accuracy (%)']:.2f}%")
print(f"  Baseline F1 (Pos) : {BASE['F1 Score (Pos)']:.4f}")
print(f"  Test set size     : {n_test:,}  |  Features: {n_features}")


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  T1 — Gaussian Noise Injection (applied to raw features before scaling)     ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
section("T1 — Gaussian Noise Injection (% of feature std dev, raw-space)")

# Noise levels expressed as a fraction of each feature's training std dev.
# This is scale-invariant and clinically interpretable:
#   5%  ≈ minor measurement error / rounding
#  10%  ≈ moderate instrument variability
#  20%  ≈ substantial data quality issues
#  50%  ≈ severe corruption

NOISE_PCT = [0, 5, 10, 15, 20, 30, 50]   # % of per-feature σ
t1_rows   = []

np.random.seed(42)
for pct in NOISE_PCT:
    sigma_vec  = (pct / 100.0) * feat_stds
    noise      = np.random.normal(0, 1, X_test_raw.shape) * sigma_vec
    X_noisy    = X_test_raw + noise
    X_noisy_s  = scaler.transform(X_noisy)
    y_pred_n   = model.predict(X_noisy_s)
    y_prob_n   = model.predict_proba(X_noisy_s)[:, 1]
    row = metrics_dict(y_test, y_pred_n, y_prob_n, f"{pct}% noise")
    row["Noise Level (% of Feature σ)"] = pct
    row["AUC-ROC Degradation"]          = round(BASE["AUC-ROC"] - row["AUC-ROC"], 4)
    row["Relative AUC Drop (%)"]        = round((BASE["AUC-ROC"] - row["AUC-ROC"]) / BASE["AUC-ROC"] * 100, 2)
    t1_rows.append(row)
    print(f"  {pct:3d}%  AUC={row['AUC-ROC']:.4f}  "
          f"Acc={row['Accuracy (%)']:.2f}%  "
          f"F1={row['F1 Score (Pos)']:.4f}  "
          f"Drop={row['AUC-ROC Degradation']:+.4f}")

df_t1 = pd.DataFrame(t1_rows)[[
    "Noise Level (% of Feature σ)", "AUC-ROC", "Accuracy (%)",
    "Precision", "Recall", "F1 Score (Pos)", "F1 Score (Macro)",
    "AUC-ROC Degradation", "Relative AUC Drop (%)"
]]
save_df(df_t1, "robustness_noise_injection_v3.csv")

# ── T1 Plot ───────────────────────────────────────────────────────────────────
fig, axes = plt.subplots(1, 3, figsize=(16, 5))
fig.suptitle("T1  —  Gaussian Noise Injection\nMediStore AI v3 Ensemble  ·  Noise applied in raw-feature space (% of per-feature σ)",
             fontsize=13, fontweight="bold", y=1.02)

x = df_t1["Noise Level (% of Feature σ)"].tolist()

axes[0].plot(x, df_t1["AUC-ROC"], "o-", color=PALETTE["metric_1"], lw=2.2, ms=7, label="AUC-ROC")
axes[0].axhline(BASE["AUC-ROC"], ls="--", color=PALETTE["baseline"], lw=1.4, alpha=0.7, label=f"Baseline {BASE['AUC-ROC']:.4f}")
axes[0].fill_between(x, df_t1["AUC-ROC"], BASE["AUC-ROC"], alpha=0.12, color=PALETTE["drop"])
axes[0].set_xlabel("Noise Level (% of Feature σ)")
axes[0].set_ylabel("AUC-ROC")
axes[0].set_title("AUC-ROC Degradation")
axes[0].legend()
axes[0].set_ylim(0.45, 0.75)

axes[1].plot(x, df_t1["F1 Score (Pos)"], "s-", color=PALETTE["metric_3"], lw=2.2, ms=7)
axes[1].axhline(BASE["F1 Score (Pos)"], ls="--", color=PALETTE["baseline"], lw=1.4, alpha=0.7)
axes[1].set_xlabel("Noise Level (% of Feature σ)")
axes[1].set_ylabel("F1 Score (Positive Class)")
axes[1].set_title("F1 Score Degradation")

axes[2].bar(x, df_t1["Relative AUC Drop (%)"], color=PALETTE["drop"], alpha=0.8, width=3.5, edgecolor="white")
axes[2].set_xlabel("Noise Level (% of Feature σ)")
axes[2].set_ylabel("Relative AUC Drop (%)")
axes[2].set_title("Relative AUC-ROC Drop vs Baseline")
for xi, yi in zip(x, df_t1["Relative AUC Drop (%)"].tolist()):
    if yi > 0:
        axes[2].text(xi, yi + 0.3, f"{yi:.1f}%", ha="center", fontsize=8, color="#333")

plt.tight_layout()
plt.savefig(FIGURES_DIR / "robustness_T1_noise_injection_v3.png",
            dpi=150, bbox_inches="tight", facecolor="white")
plt.close()
print("  Plot saved: robustness_T1_noise_injection_v3.png")


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  T2 — Random Feature Dropout (simulates missing/unavailable clinical data)  ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
section("T2 — Random Feature Dropout (missing clinical data simulation)")

DROP_COUNTS = [0, 2, 4, 6, 8, 10, 15, 20, 25]
t2_rows     = []

np.random.seed(42)
for n_drop in DROP_COUNTS:
    if n_drop == 0:
        X_d = X_test_s.copy()
    else:
        drop_cols = np.random.choice(n_features, n_drop, replace=False)
        X_d = X_test_s.copy()
        X_d[:, drop_cols] = 0.0    # zero-out = "feature not available"
    y_pred_d = model.predict(X_d)
    y_prob_d = model.predict_proba(X_d)[:, 1]
    row = metrics_dict(y_test, y_pred_d, y_prob_d, f"{n_drop} features dropped")
    row["Features Dropped (Count)"]  = n_drop
    row["Features Dropped (%)"]      = round(n_drop / n_features * 100, 1)
    row["AUC-ROC Degradation"]       = round(BASE["AUC-ROC"] - row["AUC-ROC"], 4)
    t2_rows.append(row)
    print(f"  Drop {n_drop:2d} ({n_drop/n_features*100:.0f}%)  "
          f"AUC={row['AUC-ROC']:.4f}  "
          f"F1={row['F1 Score (Pos)']:.4f}  "
          f"Drop={row['AUC-ROC Degradation']:+.4f}")

df_t2 = pd.DataFrame(t2_rows)[[
    "Features Dropped (Count)", "Features Dropped (%)", "AUC-ROC",
    "Accuracy (%)", "Precision", "Recall", "F1 Score (Pos)",
    "F1 Score (Macro)", "AUC-ROC Degradation"
]]
save_df(df_t2, "robustness_feature_dropout_v3.csv")

# ── T2 Plot ───────────────────────────────────────────────────────────────────
fig, axes = plt.subplots(1, 2, figsize=(13, 5))
fig.suptitle("T2  —  Random Feature Dropout\nMediStore AI v3 Ensemble  ·  Features zeroed to simulate missing clinical data",
             fontsize=13, fontweight="bold", y=1.02)

x2 = df_t2["Features Dropped (Count)"].tolist()

axes[0].plot(x2, df_t2["AUC-ROC"], "o-", color=PALETTE["metric_1"], lw=2.2, ms=7)
axes[0].axhline(BASE["AUC-ROC"], ls="--", color=PALETTE["baseline"], lw=1.4, alpha=0.7,
                label=f"Baseline {BASE['AUC-ROC']:.4f}")
axes[0].fill_between(x2, df_t2["AUC-ROC"], BASE["AUC-ROC"], alpha=0.12, color=PALETTE["drop"])
axes[0].set_xlabel("Number of Features Dropped")
axes[0].set_ylabel("AUC-ROC")
axes[0].set_title("AUC-ROC vs Features Dropped")
axes[0].legend()

ax2_twin = axes[0].twiny()
ax2_twin.set_xlim(axes[0].get_xlim())
tick_pos  = [0, 5, 10, 15, 20, 25]
tick_labs = [f"{v/n_features*100:.0f}%" for v in tick_pos]
ax2_twin.set_xticks(tick_pos)
ax2_twin.set_xticklabels(tick_labs)
ax2_twin.set_xlabel("Features Dropped (%)")

axes[1].plot(x2, df_t2["F1 Score (Pos)"], "s-", color=PALETTE["metric_3"], lw=2.2, ms=7, label="F1 (Pos)")
axes[1].plot(x2, df_t2["F1 Score (Macro)"], "^-", color=PALETTE["metric_5"], lw=2.2, ms=7, label="F1 (Macro)")
axes[1].axhline(BASE["F1 Score (Pos)"], ls="--", color=PALETTE["metric_3"], lw=1.2, alpha=0.5)
axes[1].set_xlabel("Number of Features Dropped")
axes[1].set_ylabel("F1 Score")
axes[1].set_title("F1 Score vs Features Dropped")
axes[1].legend()

plt.tight_layout()
plt.savefig(FIGURES_DIR / "robustness_T2_feature_dropout_v3.png",
            dpi=150, bbox_inches="tight", facecolor="white")
plt.close()
print("  Plot saved: robustness_T2_feature_dropout_v3.png")


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  T3 — Top-Feature Sensitivity (importance-ordered dropout)                  ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
section("T3 — Top-Feature Sensitivity (remove highest-importance features first)")

# Load SHAP importance order if CSV exists, else use RF feature importances
shap_csv = REPORTS_DIR / "shap_importance_v3.csv"
if shap_csv.exists():
    shap_df      = pd.read_csv(shap_csv)
    ordered_feats = shap_df["Feature"].tolist()
    ordered_idx   = [feat_cols.index(f) for f in ordered_feats if f in feat_cols]
    print(f"  Using SHAP-ordered feature importance ({len(ordered_idx)} features)")
else:
    # Fall back to RF importance from ensemble
    rf_est = model.estimators_[2] if hasattr(model, "estimators_") else None
    if rf_est and hasattr(rf_est, "feature_importances_"):
        ordered_idx = list(np.argsort(rf_est.feature_importances_)[::-1])
    else:
        ordered_idx = list(range(n_features))
    print("  Using fallback feature importance ordering")

t3_rows = []
for n_drop in [0, 1, 2, 3, 5, 8, 10, 15]:
    if n_drop > len(ordered_idx):
        break
    top_cols = ordered_idx[:n_drop] if n_drop > 0 else []
    X_d      = X_test_s.copy()
    if top_cols:
        X_d[:, top_cols] = 0.0
    y_pred_t = model.predict(X_d)
    y_prob_t = model.predict_proba(X_d)[:, 1]
    row = metrics_dict(y_test, y_pred_t, y_prob_t,
                       f"Top-{n_drop} features removed" if n_drop else "Baseline")
    row["Top Features Removed"]      = n_drop
    row["AUC-ROC Degradation"]       = round(BASE["AUC-ROC"] - row["AUC-ROC"], 4)
    row["Removed Feature Names"]     = ", ".join(
        feat_cols[i] for i in ordered_idx[:n_drop]
    ) if n_drop else "—"
    t3_rows.append(row)
    print(f"  Remove top {n_drop:2d}  AUC={row['AUC-ROC']:.4f}  "
          f"Drop={row['AUC-ROC Degradation']:+.4f}  "
          f"[{row['Removed Feature Names'][:50]}{'…' if len(row['Removed Feature Names'])>50 else ''}]")

df_t3 = pd.DataFrame(t3_rows)[[
    "Top Features Removed", "AUC-ROC", "Accuracy (%)", "F1 Score (Pos)",
    "F1 Score (Macro)", "AUC-ROC Degradation", "Removed Feature Names"
]]
save_df(df_t3, "robustness_top_feature_sensitivity_v3.csv")

# ── T3 Plot ───────────────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(10, 5))
fig.suptitle("T3  —  Top-Feature Sensitivity (Importance-Ordered Dropout)\nMediStore AI v3 Ensemble  ·  Highest SHAP-importance features removed sequentially",
             fontsize=13, fontweight="bold")
x3 = df_t3["Top Features Removed"].tolist()
ax.plot(x3, df_t3["AUC-ROC"], "o-", color=PALETTE["metric_1"], lw=2.5, ms=8, label="AUC-ROC")
ax.fill_between(x3, df_t3["AUC-ROC"], BASE["AUC-ROC"], alpha=0.15, color=PALETTE["drop"])
ax.axhline(BASE["AUC-ROC"], ls="--", color=PALETTE["baseline"], lw=1.5, alpha=0.7,
           label=f"Baseline {BASE['AUC-ROC']:.4f}")

# Annotate drops
for xi, yi, dr in zip(x3, df_t3["AUC-ROC"].tolist(), df_t3["AUC-ROC Degradation"].tolist()):
    if xi > 0:
        ax.annotate(f"Δ={dr:+.3f}", xy=(xi, yi), xytext=(xi + 0.2, yi - 0.012),
                    fontsize=8, color=PALETTE["drop"])

ax.set_xlabel("Number of Top Features Removed (SHAP-ordered)")
ax.set_ylabel("AUC-ROC")
ax.legend()
plt.tight_layout()
plt.savefig(FIGURES_DIR / "robustness_T3_top_feature_sensitivity_v3.png",
            dpi=150, bbox_inches="tight", facecolor="white")
plt.close()
print("  Plot saved: robustness_T3_top_feature_sensitivity_v3.png")


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  T4 — Decision Threshold Sensitivity                                         ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
section("T4 — Decision Threshold Sensitivity & Optimal Threshold Selection")

thresholds = np.round(np.arange(0.05, 0.96, 0.05), 2)
t4_rows    = []

for thresh in thresholds:
    y_pred_t = (y_prob_base >= thresh).astype(int)
    prec     = precision_score(y_test, y_pred_t, zero_division=0)
    rec      = recall_score(y_test, y_pred_t, zero_division=0)
    f1_t     = f1_score(y_test, y_pred_t, zero_division=0)
    acc_t    = accuracy_score(y_test, y_pred_t)
    # Youden's J statistic: J = Sensitivity + Specificity − 1
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred_t, labels=[0, 1]).ravel()
    sensitivity  = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    specificity  = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    youdens_j    = sensitivity + specificity - 1
    t4_rows.append({
        "Decision Threshold":  float(thresh),
        "Precision":           round(prec, 4),
        "Recall (Sensitivity)": round(rec, 4),
        "Specificity":         round(specificity, 4),
        "F1 Score":            round(f1_t, 4),
        "Accuracy (%)":        round(acc_t * 100, 2),
        "Youden's J":          round(youdens_j, 4),
        "True Positives":      int(tp),
        "False Positives":     int(fp),
        "False Negatives":     int(fn),
        "True Negatives":      int(tn),
    })

df_t4      = pd.DataFrame(t4_rows)
opt_row    = df_t4.loc[df_t4["Youden's J"].idxmax()]
opt_thresh = opt_row["Decision Threshold"]
opt_j      = opt_row["Youden's J"]
opt_prec   = opt_row["Precision"]
opt_rec    = opt_row["Recall (Sensitivity)"]
save_df(df_t4, "robustness_threshold_sensitivity_v3.csv")
print(f"\n  Optimal threshold (Youden's J): {opt_thresh:.2f}  "
      f"(J={opt_j:.4f}  Precision={opt_prec:.4f}  Recall={opt_rec:.4f})")

# ── T4 Plot ───────────────────────────────────────────────────────────────────
fig, axes = plt.subplots(1, 2, figsize=(14, 5))
fig.suptitle("T4  —  Decision Threshold Sensitivity\nMediStore AI v3 Ensemble  ·  Optimal threshold identified via Youden's J statistic",
             fontsize=13, fontweight="bold", y=1.02)

x4 = df_t4["Decision Threshold"].tolist()

axes[0].plot(x4, df_t4["Precision"],           "o-", color=PALETTE["metric_5"], lw=2, ms=5, label="Precision")
axes[0].plot(x4, df_t4["Recall (Sensitivity)"],"s-", color=PALETTE["metric_4"], lw=2, ms=5, label="Recall")
axes[0].plot(x4, df_t4["F1 Score"],             "^-", color=PALETTE["metric_3"], lw=2, ms=5, label="F1 Score")
axes[0].axvline(opt_thresh, ls="--", color="#333", lw=1.5, alpha=0.6,
                label=f"Optimal θ={opt_thresh:.2f}")
axes[0].axvline(0.50, ls=":", color="gray", lw=1.2, alpha=0.5, label="Default θ=0.50")
axes[0].set_xlabel("Decision Threshold (θ)")
axes[0].set_ylabel("Score")
axes[0].set_title("Precision / Recall / F1  vs  Threshold")
axes[0].legend(loc="upper right")
axes[0].set_xlim(0.0, 1.0)
axes[0].set_ylim(0, 1.05)

axes[1].plot(x4, df_t4["Youden's J"], "D-", color=PALETTE["metric_1"], lw=2.2, ms=6, label="Youden's J")
axes[1].axvline(opt_thresh, ls="--", color="#333", lw=1.5, alpha=0.6,
                label=f"Optimal θ={opt_thresh:.2f}")
axes[1].scatter([opt_thresh], [opt_j], color=PALETTE["drop"], zorder=5, s=80,
                label=f"J={opt_j:.4f}")
axes[1].set_xlabel("Decision Threshold (θ)")
axes[1].set_ylabel("Youden's J  (Sensitivity + Specificity − 1)")
axes[1].set_title("Optimal Threshold via Youden's J")
axes[1].legend()
axes[1].set_xlim(0.0, 1.0)

plt.tight_layout()
plt.savefig(FIGURES_DIR / "robustness_T4_threshold_sensitivity_v3.png",
            dpi=150, bbox_inches="tight", facecolor="white")
plt.close()
print("  Plot saved: robustness_T4_threshold_sensitivity_v3.png")


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  T5 — Bootstrap Confidence Intervals  (AUC-ROC, Accuracy, F1)               ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
section("T5 — Bootstrap Confidence Intervals (n=1000 resamples)")

N_BOOT = 1000
np.random.seed(42)
boot_auc, boot_acc, boot_f1 = [], [], []

for _ in range(N_BOOT):
    idx = np.random.choice(n_test, n_test, replace=True)
    yt  = y_test[idx]
    yp  = y_pred_base[idx]
    ypr = y_prob_base[idx]
    if len(np.unique(yt)) < 2:
        continue
    boot_auc.append(roc_auc_score(yt, ypr))
    boot_acc.append(accuracy_score(yt, yp) * 100)
    boot_f1.append(f1_score(yt, yp, zero_division=0))

boot_auc = np.array(boot_auc)
boot_acc = np.array(boot_acc)
boot_f1  = np.array(boot_f1)

def ci_row(name, arr):
    return {
        "Metric":              name,
        "Bootstrap Mean":      round(arr.mean(), 4),
        "Bootstrap Std Dev":   round(arr.std(), 4),
        "CI Lower (2.5%)":     round(np.percentile(arr, 2.5), 4),
        "CI Upper (97.5%)":    round(np.percentile(arr, 97.5), 4),
        "CI Width":            round(np.percentile(arr, 97.5) - np.percentile(arr, 2.5), 4),
        "Bootstrap Samples":   len(arr),
    }

df_t5 = pd.DataFrame([
    ci_row("AUC-ROC",       boot_auc),
    ci_row("Accuracy (%)",  boot_acc),
    ci_row("F1 Score (Pos)", boot_f1),
])
save_df(df_t5, "robustness_bootstrap_ci_v3.csv")

for _, row in df_t5.iterrows():
    print(f"  {row['Metric']:<18}  {row['Bootstrap Mean']:.4f} ± {row['Bootstrap Std Dev']:.4f}  "
          f"95% CI [{row['CI Lower (2.5%)']:.4f}, {row['CI Upper (97.5%)']:.4f}]")

# ── T5 Plot ───────────────────────────────────────────────────────────────────
fig, axes = plt.subplots(1, 3, figsize=(16, 5))
fig.suptitle("T5  —  Bootstrap Confidence Intervals (n=1000)\nMediStore AI v3 Ensemble  ·  Sampling with replacement on test set",
             fontsize=13, fontweight="bold", y=1.02)

for ax, (arr, label, color) in zip(axes, [
    (boot_auc, "AUC-ROC",       PALETTE["metric_1"]),
    (boot_acc, "Accuracy (%)",  PALETTE["metric_2"]),
    (boot_f1,  "F1 Score (Pos)", PALETTE["metric_3"]),
]):
    lo = np.percentile(arr, 2.5)
    hi = np.percentile(arr, 97.5)
    mu = arr.mean()
    ax.hist(arr, bins=40, color=color, alpha=0.7, edgecolor="white")
    ax.axvline(mu,  color="#111",  lw=2.5, label=f"Mean = {mu:.4f}")
    ax.axvline(lo,  color="#555",  lw=1.8, ls="--", label=f"2.5%  = {lo:.4f}")
    ax.axvline(hi,  color="#555",  lw=1.8, ls="--", label=f"97.5% = {hi:.4f}")
    ax.set_xlabel(label)
    ax.set_ylabel("Frequency")
    ax.set_title(f"{label}\n95% CI: [{lo:.4f}, {hi:.4f}]")
    ax.legend(fontsize=8)

plt.tight_layout()
plt.savefig(FIGURES_DIR / "robustness_T5_bootstrap_ci_v3.png",
            dpi=150, bbox_inches="tight", facecolor="white")
plt.close()
print("  Plot saved: robustness_T5_bootstrap_ci_v3.png")


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  MASTER SUMMARY  —  Single-glance overview of all robustness tests          ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
section("Generating Master Summary CSV & Dashboard Figure")

summary_rows = [
    {
        "Test ID":      "Baseline",
        "Test Name":    "Clean Test Set (No Perturbation)",
        "Condition":    "No perturbation",
        "AUC-ROC":      BASE["AUC-ROC"],
        "Accuracy (%)": BASE["Accuracy (%)"],
        "F1 Score":     BASE["F1 Score (Pos)"],
        "AUC-ROC Degradation": 0.0,
        "Interpretation": "Reference performance on unperturbed test data",
    },
    # T1 highlights
    {
        "Test ID": "T1-5pct",
        "Test Name": "Noise Injection",
        "Condition":  "5% feature σ noise",
        "AUC-ROC":   df_t1.loc[df_t1["Noise Level (% of Feature σ)"]==5, "AUC-ROC"].values[0],
        "Accuracy (%)": df_t1.loc[df_t1["Noise Level (% of Feature σ)"]==5, "Accuracy (%)"].values[0],
        "F1 Score":     df_t1.loc[df_t1["Noise Level (% of Feature σ)"]==5, "F1 Score (Pos)"].values[0],
        "AUC-ROC Degradation": df_t1.loc[df_t1["Noise Level (% of Feature σ)"]==5, "AUC-ROC Degradation"].values[0],
        "Interpretation": "Minor measurement noise / rounding errors",
    },
    {
        "Test ID": "T1-20pct",
        "Test Name": "Noise Injection",
        "Condition":  "20% feature σ noise",
        "AUC-ROC":   df_t1.loc[df_t1["Noise Level (% of Feature σ)"]==20, "AUC-ROC"].values[0],
        "Accuracy (%)": df_t1.loc[df_t1["Noise Level (% of Feature σ)"]==20, "Accuracy (%)"].values[0],
        "F1 Score":     df_t1.loc[df_t1["Noise Level (% of Feature σ)"]==20, "F1 Score (Pos)"].values[0],
        "AUC-ROC Degradation": df_t1.loc[df_t1["Noise Level (% of Feature σ)"]==20, "AUC-ROC Degradation"].values[0],
        "Interpretation": "Substantial data quality degradation",
    },
    # T2 highlights
    {
        "Test ID": "T2-4feat",
        "Test Name": "Feature Dropout",
        "Condition":  "4 random features dropped",
        "AUC-ROC":   df_t2.loc[df_t2["Features Dropped (Count)"]==4, "AUC-ROC"].values[0],
        "Accuracy (%)": df_t2.loc[df_t2["Features Dropped (Count)"]==4, "Accuracy (%)"].values[0],
        "F1 Score":     df_t2.loc[df_t2["Features Dropped (Count)"]==4, "F1 Score (Pos)"].values[0],
        "AUC-ROC Degradation": df_t2.loc[df_t2["Features Dropped (Count)"]==4, "AUC-ROC Degradation"].values[0],
        "Interpretation": "~8% missing clinical features",
    },
    {
        "Test ID": "T2-10feat",
        "Test Name": "Feature Dropout",
        "Condition":  "10 random features dropped",
        "AUC-ROC":   df_t2.loc[df_t2["Features Dropped (Count)"]==10, "AUC-ROC"].values[0],
        "Accuracy (%)": df_t2.loc[df_t2["Features Dropped (Count)"]==10, "Accuracy (%)"].values[0],
        "F1 Score":     df_t2.loc[df_t2["Features Dropped (Count)"]==10, "F1 Score (Pos)"].values[0],
        "AUC-ROC Degradation": df_t2.loc[df_t2["Features Dropped (Count)"]==10, "AUC-ROC Degradation"].values[0],
        "Interpretation": "~20% missing clinical features",
    },
    # T3 highlight
    {
        "Test ID": "T3-top5",
        "Test Name": "Top-Feature Sensitivity",
        "Condition":  "Top-5 SHAP features removed",
        "AUC-ROC":   df_t3.loc[df_t3["Top Features Removed"]==5, "AUC-ROC"].values[0] if 5 in df_t3["Top Features Removed"].values else float("nan"),
        "Accuracy (%)": df_t3.loc[df_t3["Top Features Removed"]==5, "Accuracy (%)"].values[0] if 5 in df_t3["Top Features Removed"].values else float("nan"),
        "F1 Score":     df_t3.loc[df_t3["Top Features Removed"]==5, "F1 Score (Pos)"].values[0] if 5 in df_t3["Top Features Removed"].values else float("nan"),
        "AUC-ROC Degradation": df_t3.loc[df_t3["Top Features Removed"]==5, "AUC-ROC Degradation"].values[0] if 5 in df_t3["Top Features Removed"].values else float("nan"),
        "Interpretation": "Removes the 5 most influential SHAP features",
    },
    # T4 optimal threshold
    {
        "Test ID": "T4-opt",
        "Test Name": "Threshold Sensitivity",
        "Condition":  f"Optimal threshold (θ={opt_thresh:.2f}, Youden's J)",
        "AUC-ROC":   BASE["AUC-ROC"],
        "Accuracy (%)": float(opt_row["Accuracy (%)"]),
        "F1 Score":     float(opt_row["F1 Score"]),
        "AUC-ROC Degradation": 0.0,
        "Interpretation": f"Maximises Youden's J at θ={opt_thresh:.2f}",
    },
    # T5 bootstrap
    {
        "Test ID": "T5-ci",
        "Test Name": "Bootstrap CI",
        "Condition":  "n=1000 bootstrap resamples",
        "AUC-ROC":   round(boot_auc.mean(), 4),
        "Accuracy (%)": round(boot_acc.mean(), 2),
        "F1 Score":     round(boot_f1.mean(), 4),
        "AUC-ROC Degradation": 0.0,
        "Interpretation": f"95% CI [{np.percentile(boot_auc,2.5):.4f}, {np.percentile(boot_auc,97.5):.4f}]  std={boot_auc.std():.4f}",
    },
]
df_summary = pd.DataFrame(summary_rows)
save_df(df_summary, "robustness_master_summary_v3.csv")

# ── Dashboard figure (1 combined overview) ────────────────────────────────────
fig = plt.figure(figsize=(18, 12))
fig.patch.set_facecolor("white")
gs  = gridspec.GridSpec(2, 3, figure=fig, hspace=0.45, wspace=0.38)

fig.suptitle(
    "MediStore AI v3 Ensemble  —  Robustness Evaluation Dashboard\n"
    "UCI Diabetes 130-US Hospitals  |  Test set: 20,354 samples  |  51 features",
    fontsize=14, fontweight="bold", y=0.97
)

# Panel 1 — Noise AUC
ax1 = fig.add_subplot(gs[0, 0])
ax1.plot(df_t1["Noise Level (% of Feature σ)"], df_t1["AUC-ROC"],
         "o-", color=PALETTE["metric_1"], lw=2, ms=6)
ax1.axhline(BASE["AUC-ROC"], ls="--", color=PALETTE["baseline"], lw=1.3, alpha=0.7)
ax1.set_title("T1  Noise Injection")
ax1.set_xlabel("Noise Level (% of Feature σ)")
ax1.set_ylabel("AUC-ROC")
ax1.set_ylim(bottom=0.45)

# Panel 2 — Feature dropout AUC
ax2 = fig.add_subplot(gs[0, 1])
ax2.plot(df_t2["Features Dropped (Count)"], df_t2["AUC-ROC"],
         "s-", color=PALETTE["metric_2"], lw=2, ms=6)
ax2.axhline(BASE["AUC-ROC"], ls="--", color=PALETTE["baseline"], lw=1.3, alpha=0.7)
ax2.set_title("T2  Feature Dropout")
ax2.set_xlabel("Features Dropped (count)")
ax2.set_ylabel("AUC-ROC")

# Panel 3 — Top feature sensitivity
ax3 = fig.add_subplot(gs[0, 2])
ax3.plot(df_t3["Top Features Removed"], df_t3["AUC-ROC"],
         "D-", color=PALETTE["metric_3"], lw=2, ms=6)
ax3.axhline(BASE["AUC-ROC"], ls="--", color=PALETTE["baseline"], lw=1.3, alpha=0.7)
ax3.set_title("T3  Top-Feature Sensitivity")
ax3.set_xlabel("Top Features Removed (SHAP order)")
ax3.set_ylabel("AUC-ROC")

# Panel 4 — Precision/Recall vs threshold
ax4 = fig.add_subplot(gs[1, 0])
ax4.plot(df_t4["Decision Threshold"], df_t4["Precision"],           "-", color=PALETTE["metric_5"], lw=2, label="Precision")
ax4.plot(df_t4["Decision Threshold"], df_t4["Recall (Sensitivity)"],"-", color=PALETTE["metric_4"], lw=2, label="Recall")
ax4.plot(df_t4["Decision Threshold"], df_t4["F1 Score"],            "-", color=PALETTE["metric_3"], lw=2, label="F1")
ax4.axvline(opt_thresh, ls="--", color="#333", lw=1.4)
ax4.set_title("T4  Threshold Sensitivity")
ax4.set_xlabel("Decision Threshold (θ)")
ax4.set_ylabel("Score")
ax4.legend(fontsize=8)

# Panel 5 — Bootstrap AUC distribution
ax5 = fig.add_subplot(gs[1, 1])
ax5.hist(boot_auc, bins=35, color=PALETTE["metric_1"], alpha=0.75, edgecolor="white")
ax5.axvline(boot_auc.mean(), color="#111", lw=2, label=f"Mean {boot_auc.mean():.4f}")
ax5.axvline(np.percentile(boot_auc, 2.5),  color="#888", lw=1.8, ls="--",
            label=f"95% CI [{np.percentile(boot_auc,2.5):.4f},{np.percentile(boot_auc,97.5):.4f}]")
ax5.axvline(np.percentile(boot_auc, 97.5), color="#888", lw=1.8, ls="--")
ax5.set_title("T5  Bootstrap AUC-ROC  (n=1000)")
ax5.set_xlabel("AUC-ROC")
ax5.set_ylabel("Frequency")
ax5.legend(fontsize=8)

# Panel 6 — Summary bar chart (AUC across all highlight conditions)
ax6 = fig.add_subplot(gs[1, 2])
bar_labels = [r["Test ID"] for r in summary_rows if r["Test ID"] != "Baseline"]
bar_vals   = [r["AUC-ROC"] for r in summary_rows if r["Test ID"] != "Baseline"]
bar_colors = [PALETTE["metric_4"] if v < BASE["AUC-ROC"] - 0.01
              else PALETTE["metric_2"] for v in bar_vals]
ax6.barh(bar_labels[::-1], bar_vals[::-1], color=bar_colors[::-1], alpha=0.85, edgecolor="white")
ax6.axvline(BASE["AUC-ROC"], ls="--", color=PALETTE["baseline"], lw=1.5,
            label=f"Baseline {BASE['AUC-ROC']:.4f}")
ax6.set_xlabel("AUC-ROC")
ax6.set_title("All Tests  —  AUC-ROC at a Glance")
ax6.legend(fontsize=8)
ax6.set_xlim(0.45, BASE["AUC-ROC"] * 1.08)

plt.savefig(FIGURES_DIR / "robustness_dashboard_v3.png",
            dpi=150, bbox_inches="tight", facecolor="white")
plt.close()
print("  Plot saved: robustness_dashboard_v3.png")


# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║  FINAL CONSOLE SUMMARY                                                       ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
print("\n" + "=" * 65)
print("  ROBUSTNESS EVALUATION COMPLETE")
print("=" * 65)
print(f"\n  Baseline AUC-ROC        : {BASE['AUC-ROC']:.4f}")
print(f"  Bootstrap 95% CI        : [{np.percentile(boot_auc,2.5):.4f}, {np.percentile(boot_auc,97.5):.4f}]")
print(f"  Optimal Threshold       : {opt_thresh:.2f}  (Youden's J = {opt_j:.4f})")

print("\n  ── T1 Noise Injection (raw-feature space, % of σ) ──")
for _, r in df_t1.iterrows():
    print(f"    {int(r['Noise Level (% of Feature σ)']):3d}%  AUC={r['AUC-ROC']:.4f}  Drop={r['AUC-ROC Degradation']:+.4f}")

print("\n  ── T2 Feature Dropout ──")
for _, r in df_t2.iterrows():
    print(f"    {int(r['Features Dropped (Count)']):3d} features  AUC={r['AUC-ROC']:.4f}  Drop={r['AUC-ROC Degradation']:+.4f}")

print("\n  ── T3 Top-Feature Sensitivity ──")
for _, r in df_t3.iterrows():
    print(f"    Top-{int(r['Top Features Removed']):2d}  AUC={r['AUC-ROC']:.4f}  Drop={r['AUC-ROC Degradation']:+.4f}")

print("\n  ── T5 Bootstrap CI ──")
for _, r in df_t5.iterrows():
    print(f"    {r['Metric']:<18}  {r['Bootstrap Mean']:.4f} ± {r['Bootstrap Std Dev']:.4f}  "
          f"[{r['CI Lower (2.5%)']:.4f}, {r['CI Upper (97.5%)']:.4f}]")

print("\n  Output CSVs:")
for fn in ["robustness_noise_injection_v3.csv",
           "robustness_feature_dropout_v3.csv",
           "robustness_top_feature_sensitivity_v3.csv",
           "robustness_threshold_sensitivity_v3.csv",
           "robustness_bootstrap_ci_v3.csv",
           "robustness_master_summary_v3.csv"]:
    print(f"    reports/{fn}")

print("\n  Output Figures:")
for fn in ["robustness_T1_noise_injection_v3.png",
           "robustness_T2_feature_dropout_v3.png",
           "robustness_T3_top_feature_sensitivity_v3.png",
           "robustness_T4_threshold_sensitivity_v3.png",
           "robustness_T5_bootstrap_ci_v3.png",
           "robustness_dashboard_v3.png"]:
    print(f"    reports/figures/{fn}")

print("=" * 65)
