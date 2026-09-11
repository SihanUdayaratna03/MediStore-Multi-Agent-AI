"""
╔══════════════════════════════════════════════════════════════════════╗
║  MediStore AI  —  Ablation Study  (v3 Pipeline)                     ║
║  ─────────────────────────────────────────────────────────────────  ║
║  Systematically removes or changes one pipeline component at a      ║
║  time to quantify each component's contribution to overall          ║
║  predictive performance.                                            ║
║                                                                     ║
║  Variants                                                           ║
║  ─────────                                                          ║
║  A0  Full Ensemble (Baseline)  XGB + LGBM + RF  ·  SMOTE  ·        ║
║                                Scaling  ·  All 51 features          ║
║  A1  XGBoost Only              Remove LightGBM and Random Forest   ║
║  A2  LightGBM Only             Remove XGBoost and Random Forest    ║
║  A3  Random Forest Only        Remove XGBoost and LightGBM         ║
║  A4  No SMOTE Balancing        Full ensemble, original class dist.  ║
║  A5  No Feature Engineering    Remove 6 domain-engineered features  ║
║  A6  No Feature Scaling        Full ensemble, unscaled features     ║
║                                                                     ║
║  Metrics reported per variant:                                      ║
║    AUC-ROC · Accuracy · Precision · Recall · F1 (Macro) · F1 (Pos) ║
║    AUC-ROC Δ vs Baseline · Training Time (s)                       ║
║                                                                     ║
║  IMPORTANT: The production model (diabetes_model_v3.pkl) is never   ║
║             modified. Only lightweight ablation variants are trained ║
╚══════════════════════════════════════════════════════════════════════╝

Run from the project root:
    python -m backend.ml.ablation_v3
"""

import json
import sys
import time
import warnings
from pathlib import Path

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import numpy as np
import pandas as pd

from imblearn.over_sampling import SMOTE
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.metrics import (
    accuracy_score, f1_score, precision_score,
    recall_score, roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier

from backend.config import (
    UCI130_CSV, V3_MODEL, V3_SCALER, V3_FEATURES,
    REPORTS_DIR, FIGURES_DIR, ensure_dirs,
)
from backend.ml.preprocessing_uci130 import preprocess

warnings.filterwarnings("ignore")
ensure_dirs()
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PALETTE = {
    "baseline": "#1565C0",
    "better":   "#2E7D32",
    "worse":    "#C62828",
    "neutral":  "#5E35B1",
    "grid":     "#E0E0E0",
}
PLOT_STYLE = {
    "font.family":       "DejaVu Sans",
    "axes.titlesize":    13,
    "axes.titleweight":  "bold",
    "axes.labelsize":    11,
    "xtick.labelsize":   9,
    "ytick.labelsize":   9,
    "legend.fontsize":   9,
    "axes.spines.top":   False,
    "axes.spines.right": False,
    "axes.grid":         True,
    "grid.color":        PALETTE["grid"],
    "grid.linewidth":    0.7,
    "figure.facecolor":  "white",
    "axes.facecolor":    "#FAFAFA",
}
plt.rcParams.update(PLOT_STYLE)

print("=" * 65)
print("  MediStore AI — Ablation Study (v3 Pipeline)")
print("=" * 65)


# ── Helper: build ablation-weight estimators (fewer trees for speed) ──────────
def make_xgb(n=150):
    return XGBClassifier(
        n_estimators=n, max_depth=6, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8, min_child_weight=3,
        gamma=0.1, eval_metric="logloss", random_state=42,
        verbosity=0, n_jobs=-1,
    )

def make_lgbm(n=150):
    return LGBMClassifier(
        n_estimators=n, max_depth=6, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8, min_child_samples=20,
        random_state=42, verbose=-1, n_jobs=-1,
    )

def make_rf(n=120):
    return RandomForestClassifier(
        n_estimators=n, max_depth=10, min_samples_split=10,
        min_samples_leaf=5, max_features="sqrt",
        random_state=42, n_jobs=-1,
    )

def make_ensemble():
    return VotingClassifier(
        estimators=[("xgb", make_xgb()), ("lgbm", make_lgbm()), ("rf", make_rf())],
        voting="soft", weights=[2, 2, 1],
    )


def evaluate(fitted_model, X_te, y_te, label: str) -> dict:
    y_pred = fitted_model.predict(X_te)
    try:
        y_prob = fitted_model.predict_proba(X_te)[:, 1]
        auc    = roc_auc_score(y_te, y_prob)
    except Exception:
        auc    = float("nan")
    return {
        "Variant ID":              label.split(":")[0].strip(),
        "Variant Description":     label.split(":", 1)[1].strip() if ":" in label else label,
        "AUC-ROC":                 round(auc, 4),
        "Accuracy (%)":            round(accuracy_score(y_te, y_pred) * 100, 2),
        "Precision":               round(precision_score(y_te, y_pred, zero_division=0), 4),
        "Recall":                  round(recall_score(y_te, y_pred, zero_division=0), 4),
        "F1 Score (Positive)":     round(f1_score(y_te, y_pred, zero_division=0), 4),
        "F1 Score (Macro)":        round(f1_score(y_te, y_pred, average="macro", zero_division=0), 4),
    }


# ── Step 1: Load & preprocess data ───────────────────────────────────────────
print("\n[1/4] Loading and preprocessing UCI-130 data...")
df_full, feat_cols = preprocess(str(UCI130_CSV))
X_full = df_full[feat_cols].values
y_full = df_full["target"].values

ENGINEERED = [
    "med_procedure_ratio", "hospital_complexity", "total_prior_visits",
    "multi_diag_endocrine", "is_emergency_admission", "long_stay",
]
eng_mask  = np.array([f in ENGINEERED for f in feat_cols])
base_mask = ~eng_mask

print(f"      Total features      : {len(feat_cols)}")
print(f"      Base features       : {base_mask.sum()}")
print(f"      Engineered features : {eng_mask.sum()}")

X_tr_raw, X_te_raw, y_tr_raw, y_te = train_test_split(
    X_full, y_full, test_size=0.20, random_state=42, stratify=y_full,
)
print(f"      Train: {len(X_tr_raw):,}  |  Test: {len(X_te_raw):,}")


# ── Step 2: Run ablation variants ─────────────────────────────────────────────
print("\n[2/4] Running ablation variants...\n")
results  = []
t_total  = time.time()

smote = SMOTE(random_state=42)

# ── A0: Full Ensemble (Baseline) ─────────────────────────────────────────────
print("  A0 — Full Ensemble (XGB+LGBM+RF · SMOTE · Scaling · All Features)")
t0 = time.time()
X_bal, y_bal = smote.fit_resample(X_tr_raw, y_tr_raw)
sc_a0        = StandardScaler()
X_tr_s       = sc_a0.fit_transform(X_bal)
X_te_s       = sc_a0.transform(X_te_raw)
m_a0         = make_ensemble(); m_a0.fit(X_tr_s, y_bal)
r = evaluate(m_a0, X_te_s, y_te, "A0: Full Ensemble (Baseline)")
r["Training Time (s)"] = round(time.time() - t0, 1)
results.append(r)
print(f"      AUC={r['AUC-ROC']:.4f}  Acc={r['Accuracy (%)']:.2f}%  "
      f"F1(Pos)={r['F1 Score (Positive)']:.4f}  F1(Mac)={r['F1 Score (Macro)']:.4f}  [{r['Training Time (s)']}s]")

baseline_auc = r["AUC-ROC"]

# ── A1: XGBoost Only ─────────────────────────────────────────────────────────
print("\n  A1 — XGBoost Only  (no LightGBM, no Random Forest)")
t0 = time.time()
m_a1 = make_xgb(n=200); m_a1.fit(X_tr_s, y_bal)
r = evaluate(m_a1, X_te_s, y_te, "A1: XGBoost Only")
r["Training Time (s)"] = round(time.time() - t0, 1)
results.append(r)
print(f"      AUC={r['AUC-ROC']:.4f}  Acc={r['Accuracy (%)']:.2f}%  [{r['Training Time (s)']}s]")

# ── A2: LightGBM Only ────────────────────────────────────────────────────────
print("\n  A2 — LightGBM Only  (no XGBoost, no Random Forest)")
t0 = time.time()
m_a2 = make_lgbm(n=200); m_a2.fit(X_tr_s, y_bal)
r = evaluate(m_a2, X_te_s, y_te, "A2: LightGBM Only")
r["Training Time (s)"] = round(time.time() - t0, 1)
results.append(r)
print(f"      AUC={r['AUC-ROC']:.4f}  Acc={r['Accuracy (%)']:.2f}%  [{r['Training Time (s)']}s]")

# ── A3: Random Forest Only ───────────────────────────────────────────────────
print("\n  A3 — Random Forest Only  (no XGBoost, no LightGBM)")
t0 = time.time()
m_a3 = make_rf(n=180); m_a3.fit(X_tr_s, y_bal)
r = evaluate(m_a3, X_te_s, y_te, "A3: Random Forest Only")
r["Training Time (s)"] = round(time.time() - t0, 1)
results.append(r)
print(f"      AUC={r['AUC-ROC']:.4f}  Acc={r['Accuracy (%)']:.2f}%  [{r['Training Time (s)']}s]")

# ── A4: No SMOTE (original class imbalance retained) ─────────────────────────
print("\n  A4 — No SMOTE Balancing  (original imbalanced class distribution)")
t0 = time.time()
sc_a4    = StandardScaler()
X_tr_s4  = sc_a4.fit_transform(X_tr_raw)
X_te_s4  = sc_a4.transform(X_te_raw)
m_a4     = make_ensemble(); m_a4.fit(X_tr_s4, y_tr_raw)
r = evaluate(m_a4, X_te_s4, y_te, "A4: No SMOTE Balancing")
r["Training Time (s)"] = round(time.time() - t0, 1)
results.append(r)
print(f"      AUC={r['AUC-ROC']:.4f}  Acc={r['Accuracy (%)']:.2f}%  [{r['Training Time (s)']}s]")

# ── A5: No Feature Engineering ───────────────────────────────────────────────
print("\n  A5 — No Feature Engineering  (45 base features only, 6 engineered removed)")
t0 = time.time()
X_base_tr       = X_tr_raw[:, base_mask]
X_base_te       = X_te_raw[:, base_mask]
X_base_bal, y_base_bal = smote.fit_resample(X_base_tr, y_tr_raw)
sc_a5           = StandardScaler()
X_base_tr_s     = sc_a5.fit_transform(X_base_bal)
X_base_te_s     = sc_a5.transform(X_base_te)
m_a5            = make_ensemble(); m_a5.fit(X_base_tr_s, y_base_bal)
r = evaluate(m_a5, X_base_te_s, y_te, "A5: No Feature Engineering")
r["Training Time (s)"] = round(time.time() - t0, 1)
results.append(r)
print(f"      AUC={r['AUC-ROC']:.4f}  Acc={r['Accuracy (%)']:.2f}%  [{r['Training Time (s)']}s]")

# ── A6: No Scaling ───────────────────────────────────────────────────────────
print("\n  A6 — No Feature Scaling  (raw unscaled features — tree models are scale-invariant)")
t0 = time.time()
m_a6 = make_ensemble(); m_a6.fit(X_bal, y_bal)    # X_bal already SMOTE-d
r = evaluate(m_a6, X_te_raw, y_te, "A6: No Feature Scaling")
r["Training Time (s)"] = round(time.time() - t0, 1)
results.append(r)
print(f"      AUC={r['AUC-ROC']:.4f}  Acc={r['Accuracy (%)']:.2f}%  [{r['Training Time (s)']}s]")

print(f"\n  Total ablation wall time: {round(time.time()-t_total, 1)}s")


# ── Step 3: Build results DataFrame & add delta columns ───────────────────────
print("\n[3/4] Saving ablation results table...")
df = pd.DataFrame(results)
df["AUC-ROC Δ vs Baseline"]  = (df["AUC-ROC"] - baseline_auc).round(4)
df["F1 (Macro) Δ vs Baseline"] = (df["F1 Score (Macro)"] - results[0]["F1 Score (Macro)"]).round(4)

# Ordered columns for the CSV
col_order = [
    "Variant ID", "Variant Description",
    "AUC-ROC", "AUC-ROC Δ vs Baseline",
    "Accuracy (%)",
    "Precision", "Recall",
    "F1 Score (Positive)", "F1 Score (Macro)", "F1 (Macro) Δ vs Baseline",
    "Training Time (s)",
]
df[col_order].to_csv(REPORTS_DIR / "ablation_results_v3.csv", index=False)
print("      Saved: ablation_results_v3.csv")
print()
print(df[col_order].to_string(index=False))


# ── Step 4: Visualisations ────────────────────────────────────────────────────
print("\n[4/4] Generating ablation charts...")

short_ids = df["Variant ID"].tolist()         # ["A0", "A1", …]
auc_vals  = df["AUC-ROC"].tolist()
auc_deltas = df["AUC-ROC Δ vs Baseline"].tolist()
f1_macro  = df["F1 Score (Macro)"].tolist()
f1_pos    = df["F1 Score (Positive)"].tolist()
recall    = df["Recall"].tolist()
prec      = df["Precision"].tolist()
acc       = [v / 100 for v in df["Accuracy (%)"].tolist()]   # normalise to 0-1

def bar_color(delta):
    if abs(delta) < 0.002:
        return PALETTE["neutral"]
    return PALETTE["better"] if delta > 0 else PALETTE["worse"]

delta_colors = [bar_color(d) for d in auc_deltas]

# ── Chart 1: AUC-ROC horizontal bar ──────────────────────────────────────────
fig, ax = plt.subplots(figsize=(11, 6))
y_pos  = np.arange(len(short_ids))[::-1]
bars   = ax.barh(y_pos, auc_vals, color=delta_colors, height=0.62, edgecolor="white")
ax.axvline(baseline_auc, color=PALETTE["baseline"], lw=2, ls="--",
           label=f"Baseline A0 = {baseline_auc:.4f}", zorder=5)
for bar, auc, delta in zip(bars, auc_vals, auc_deltas):
    ax.text(bar.get_width() + 0.003, bar.get_y() + bar.get_height() / 2,
            f"{auc:.4f}  (Δ {delta:+.4f})", va="center", fontsize=9)
ax.set_yticks(y_pos)
ax.set_yticklabels(short_ids[::-1], fontsize=10, fontweight="bold")
ax.set_xlabel("AUC-ROC")
ax.set_xlim(min(auc_vals) * 0.96, max(auc_vals) * 1.10)
ax.set_title(
    "Ablation Study  —  AUC-ROC per Pipeline Variant\n"
    "MediStore AI v3  ·  Δ = change relative to Full Ensemble baseline",
    fontsize=13, fontweight="bold"
)
ax.legend(fontsize=9)

# Colour legend patches
from matplotlib.patches import Patch
legend_patches = [
    Patch(color=PALETTE["better"],  label="AUC higher than baseline"),
    Patch(color=PALETTE["worse"],   label="AUC lower than baseline"),
    Patch(color=PALETTE["neutral"], label="Negligible difference (|Δ| < 0.002)"),
]
ax.legend(handles=legend_patches + ax.get_legend_handles_labels()[0][:1],
          fontsize=8.5, loc="lower right")
plt.tight_layout()
plt.savefig(FIGURES_DIR / "ablation_auc_v3.png",
            dpi=150, bbox_inches="tight", facecolor="white")
plt.close()
print("      Saved: ablation_auc_v3.png")

# ── Chart 2: Multi-metric grouped bar ────────────────────────────────────────
x      = np.arange(len(short_ids))
w      = 0.16
metrics_to_plot = [
    ("AUC-ROC",           auc_vals,  "#1E88E5"),
    ("Accuracy",          acc,       "#43A047"),
    ("F1 (Macro)",        f1_macro,  "#FB8C00"),
    ("F1 (Pos. Class)",   f1_pos,    "#E53935"),
    ("Recall",            recall,    "#8E24AA"),
]
fig, ax = plt.subplots(figsize=(16, 6))
for i, (lbl, vals, col) in enumerate(metrics_to_plot):
    offset = (i - 2) * w
    bars   = ax.bar(x + offset, vals, w, label=lbl, color=col, alpha=0.88, edgecolor="white")

ax.set_xticks(x)
ax.set_xticklabels(short_ids, fontsize=10, fontweight="bold")
ax.set_ylabel("Score  (Accuracy normalised to 0–1)")
ax.set_ylim(0, 1.05)
ax.set_title(
    "Ablation Study  —  Multi-Metric Comparison per Variant\n"
    "MediStore AI v3  ·  Accuracy divided by 100 for scale consistency",
    fontsize=13, fontweight="bold"
)
ax.axhline(baseline_auc, color=PALETTE["baseline"], lw=1.4, ls="--", alpha=0.55,
           label=f"Baseline AUC = {baseline_auc:.4f}")
ax.legend(fontsize=9, loc="lower left", ncols=3)

# Annotate variant descriptions on x-axis
descs = df["Variant Description"].tolist()
for xi, desc in zip(x, descs):
    ax.annotate(
        desc, xy=(xi, -0.085), xycoords=("data", "axes fraction"),
        ha="center", va="top", fontsize=7.5, color="#555",
        rotation=12, annotation_clip=False,
    )
plt.tight_layout(rect=[0, 0.08, 1, 1])
plt.savefig(FIGURES_DIR / "ablation_comparison_v3.png",
            dpi=150, bbox_inches="tight", facecolor="white")
plt.close()
print("      Saved: ablation_comparison_v3.png")

# ── Chart 3: Precision vs Recall scatter per variant ─────────────────────────
fig, ax = plt.subplots(figsize=(9, 7))
scatter_colors = [PALETTE["baseline"]] + [bar_color(d) for d in auc_deltas[1:]]
for xi, (sid, prv, rcv, auc, col) in enumerate(
    zip(short_ids, prec, recall, auc_vals, scatter_colors)
):
    ax.scatter(prv, rcv, s=140, color=col, zorder=5, edgecolors="white", lw=1.5)
    ax.annotate(
        f"{sid}\n(AUC={auc:.3f})",
        xy=(prv, rcv), xytext=(prv + 0.008, rcv + 0.003),
        fontsize=8.5, ha="left",
    )
ax.set_xlabel("Precision")
ax.set_ylabel("Recall")
ax.set_title(
    "Ablation Study  —  Precision vs Recall Trade-off\n"
    "MediStore AI v3  ·  Each point = one pipeline variant",
    fontsize=13, fontweight="bold"
)
ax.grid(True, alpha=0.35)
plt.tight_layout()
plt.savefig(FIGURES_DIR / "ablation_precision_recall_v3.png",
            dpi=150, bbox_inches="tight", facecolor="white")
plt.close()
print("      Saved: ablation_precision_recall_v3.png")


# ── Final console summary ──────────────────────────────────────────────────────
print("\n" + "=" * 65)
print("  ABLATION STUDY COMPLETE")
print("=" * 65)
print()
header = f"  {'Variant ID':<6}  {'Description':<36}  {'AUC':>7}  {'Acc%':>7}  {'F1(Mac)':>8}  {'Δ AUC':>8}"
print(header)
print("  " + "─" * 80)
for _, row in df.iterrows():
    delta_str = f"{row['AUC-ROC Δ vs Baseline']:+.4f}"
    print(f"  {row['Variant ID']:<6}  {row['Variant Description']:<36}  "
          f"{row['AUC-ROC']:>7.4f}  {row['Accuracy (%)']:>7.2f}  "
          f"{row['F1 Score (Macro)']:>8.4f}  {delta_str:>8}")

print()
print("  Output Files:")
for fn in ["ablation_results_v3.csv"]:
    print(f"    reports/{fn}")
for fn in ["ablation_auc_v3.png", "ablation_comparison_v3.png", "ablation_precision_recall_v3.png"]:
    print(f"    reports/figures/{fn}")
print("=" * 65)
