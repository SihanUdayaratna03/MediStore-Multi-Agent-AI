"""
╔══════════════════════════════════════════════════════════════════════╗
║  MediStore AI  —  Explainability Report Generator  (v3 Ensemble)    ║
║  ─────────────────────────────────────────────────────────────────  ║
║  Generates publication-quality global and local SHAP explanations   ║
║  using the EXISTING shap_explainer_v3.pkl — no model retraining.    ║
║                                                                      ║
║  Outputs:                                                            ║
║    E1  Global beeswarm  (top-20 features)                           ║
║    E2  Global bar chart with labelled Mean |SHAP| values            ║
║    E3  SHAP dependence plots for top-5 features                     ║
║    E4  Per-patient waterfall plots (high / borderline / low risk)   ║
║    E5  Feature importance table CSV                                 ║
╚══════════════════════════════════════════════════════════════════════╝

Run from the project root:
    python -m backend.ml.explainability_v3
"""

import json
import sys
import warnings
from pathlib import Path

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap
from sklearn.model_selection import train_test_split

from backend.config import (
    UCI130_CSV, V3_MODEL, V3_SCALER, V3_EXPLAINER, V3_FEATURES,
    REPORTS_DIR, FIGURES_DIR, ensure_dirs,
)
from backend.ml.preprocessing_uci130 import preprocess

warnings.filterwarnings("ignore")
ensure_dirs()
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

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
    "grid.color":        "#E0E0E0",
    "grid.linewidth":    0.7,
    "figure.facecolor":  "white",
    "axes.facecolor":    "#FAFAFA",
}
plt.rcParams.update(PLOT_STYLE)

print("=" * 65)
print("  MediStore AI — Explainability Report Generator (v3)")
print("=" * 65)

# ── Load artefacts ─────────────────────────────────────────────────────────────
print("\n[1/6] Loading v3 model artefacts...")
try:
    model     = joblib.load(V3_MODEL)
    scaler    = joblib.load(V3_SCALER)
    explainer = joblib.load(V3_EXPLAINER)
    with open(V3_FEATURES) as fh:
        feature_names: list[str] = json.load(fh)
    print(f"      Model    : {V3_MODEL.name}")
    print(f"      Explainer: {V3_EXPLAINER.name}")
    print(f"      Features : {len(feature_names)}")
except FileNotFoundError as exc:
    print(f"  ERROR — {exc}")
    sys.exit(1)

# ── Data & test split ──────────────────────────────────────────────────────────
print("\n[2/6] Loading UCI-130 data and recreating test split...")
df_data, feat_cols = preprocess(str(UCI130_CSV))
X = df_data[feat_cols].values
y = df_data["target"].values
_, X_test_raw, _, y_test = train_test_split(X, y, test_size=0.20, random_state=42, stratify=y)
X_test_s = scaler.transform(X_test_raw)

np.random.seed(42)
shap_idx = np.random.choice(len(X_test_s), size=min(2000, len(X_test_s)), replace=False)
X_shap   = X_test_s[shap_idx]
y_shap   = y_test[shap_idx]
print(f"      SHAP sample: {len(X_shap)} patients")

print("      Computing SHAP values...")
shap_values = explainer.shap_values(X_shap)
shap_exp    = explainer(X_shap)
shap_exp.feature_names = feature_names
print(f"      SHAP values shape: {np.array(shap_values).shape}")

mean_abs_shap = np.abs(shap_values).mean(axis=0)
sorted_idx    = np.argsort(mean_abs_shap)[::-1]

# Predicted probabilities for patient archetype selection
y_prob_shap = model.predict_proba(X_shap)[:, 1]

# ── E1: Global Beeswarm ────────────────────────────────────────────────────────
print("\n[3/6] E1: Global SHAP Beeswarm (top 20 features)...")
fig, ax = plt.subplots(figsize=(12, 9))
shap.summary_plot(
    shap_values, X_shap, feature_names=feature_names,
    show=False, plot_type="dot", max_display=20, color_bar=True,
)
plt.title(
    "Global SHAP Summary — MediStore AI v3 Ensemble\n"
    "Top 20 Features by Mean |SHAP Value|  ·  n = 2,000 test patients",
    fontsize=13, fontweight="bold", pad=14
)
plt.tight_layout()
plt.savefig(FIGURES_DIR / "explainability_E1_beeswarm_v3.png",
            dpi=150, bbox_inches="tight", facecolor="white")
plt.close()
print("      Saved: explainability_E1_beeswarm_v3.png")

# ── E2: Mean |SHAP| Bar Chart ─────────────────────────────────────────────────
print("\n[4a/6] E2: Mean |SHAP| Bar Chart (top 20, labelled)...")
top_n        = 20
top_idx      = sorted_idx[:top_n]
top_features = [feature_names[i] for i in top_idx]
top_vals     = mean_abs_shap[top_idx]

import matplotlib.colors as mcolors
cmap   = plt.cm.Blues
colors = [cmap(0.4 + 0.5 * (1 - i / top_n)) for i in range(top_n)]

fig, ax = plt.subplots(figsize=(11, 8))
bars = ax.barh(range(top_n), top_vals[::-1], color=colors[::-1], edgecolor="white", height=0.72)
ax.set_yticks(range(top_n))
ax.set_yticklabels(top_features[::-1], fontsize=9.5)
ax.set_xlabel("Mean |SHAP Value|  (Average Impact on Model Output)", fontsize=11)
ax.set_title(
    "Global Feature Importance  —  SHAP\n"
    "MediStore AI v3 Ensemble  ·  Top 20 of 51 Features",
    fontsize=13, fontweight="bold"
)
for i, bar in enumerate(bars):
    w = bar.get_width()
    ax.text(w + max(top_vals) * 0.012, bar.get_y() + bar.get_height() / 2,
            f"{top_vals[::-1][i]:.5f}", va="center", fontsize=8.5, color="#333")
ax.set_xlim(0, max(top_vals) * 1.22)
ax.grid(axis="x", alpha=0.35)
ax.spines["left"].set_visible(False)
ax.tick_params(axis="y", length=0)
plt.tight_layout()
plt.savefig(FIGURES_DIR / "explainability_E2_bar_v3.png",
            dpi=150, bbox_inches="tight", facecolor="white")
plt.close()
print("      Saved: explainability_E2_bar_v3.png")

# Save SHAP importance CSV
shap_csv = pd.DataFrame({
    "Rank":          range(1, len(feature_names) + 1),
    "Feature Name":  [feature_names[i] for i in sorted_idx],
    "Mean |SHAP|":   [round(mean_abs_shap[i], 6) for i in sorted_idx],
    "Importance (% of Top Feature)": [
        round(mean_abs_shap[i] / mean_abs_shap[sorted_idx[0]] * 100, 2)
        for i in sorted_idx
    ],
})
shap_csv.to_csv(REPORTS_DIR / "shap_importance_v3.csv", index=False)
print("      Saved: shap_importance_v3.csv")

# ── E3: SHAP Dependence Plots ─────────────────────────────────────────────────
print("\n[4b/6] E3: SHAP Dependence Plots (top 5 features)...")
top5_idx = sorted_idx[:5]
fig, axes = plt.subplots(1, 5, figsize=(22, 5))
fig.suptitle(
    "SHAP Dependence Plots  —  Top 5 Features\n"
    "MediStore AI v3 Ensemble  ·  Each point = one test patient",
    fontsize=13, fontweight="bold"
)
for pi, fi in enumerate(top5_idx):
    feat_name  = feature_names[fi]
    feat_vals  = X_shap[:, fi]
    feat_shap  = shap_values[:, fi]
    vmin, vmax = np.percentile(feat_shap, 2), np.percentile(feat_shap, 98)
    sc = axes[pi].scatter(feat_vals, feat_shap, c=feat_shap, cmap="RdYlBu_r",
                           alpha=0.45, s=14, vmin=vmin, vmax=vmax, rasterized=True)
    axes[pi].axhline(0, color="#555", lw=0.9, ls="--")
    axes[pi].set_xlabel(feat_name, fontsize=9)
    axes[pi].set_ylabel("SHAP Value" if pi == 0 else "", fontsize=9)
    axes[pi].set_title(f"#{pi+1}  {feat_name}", fontsize=9.5, fontweight="bold")
    axes[pi].grid(alpha=0.25)
    plt.colorbar(sc, ax=axes[pi], fraction=0.046, pad=0.04, label="SHAP" if pi == 4 else "")

plt.tight_layout()
plt.savefig(FIGURES_DIR / "explainability_E3_dependence_v3.png",
            dpi=150, bbox_inches="tight", facecolor="white")
plt.close()
print("      Saved: explainability_E3_dependence_v3.png")

# ── E4: Per-Patient Waterfall Plots ───────────────────────────────────────────
print("\n[5/6] E4: Individual SHAP Waterfall (high / borderline / low risk)...")

high_idx   = int(np.argmax(y_prob_shap))
low_idx    = int(np.argmin(y_prob_shap))
border_idx = int(np.argmin(np.abs(y_prob_shap - 0.50)))

patients = [
    ("High-Risk Patient",   high_idx,   "#C62828"),
    ("Borderline Patient",  border_idx, "#E65100"),
    ("Low-Risk Patient",    low_idx,    "#1B5E20"),
]

for label, idx, accent in patients:
    prob     = y_prob_shap[idx]
    risk_str = f"{prob * 100:.1f}%"
    fig, ax  = plt.subplots(figsize=(11, 8))
    shap.plots.waterfall(shap_exp[idx], max_display=15, show=False)
    plt.title(
        f"SHAP Individual Explanation  —  {label}\n"
        f"Predicted Readmission Probability: {risk_str}  ·  MediStore AI v3",
        fontsize=12, fontweight="bold", pad=12
    )
    plt.tight_layout()
    safe = label.lower().replace(" ", "_").replace("-", "_")
    out  = FIGURES_DIR / f"explainability_E4_waterfall_{safe}_v3.png"
    plt.savefig(out, dpi=150, bbox_inches="tight", facecolor="white")
    plt.close()
    print(f"      Saved: {out.name}  (predicted: {risk_str})")

# ── Final summary ──────────────────────────────────────────────────────────────
print("\n" + "=" * 65)
print("  EXPLAINABILITY REPORT COMPLETE")
print("=" * 65)
print("\n  Top 10 Features by Mean |SHAP|:")
print(f"  {'Rank':<5} {'Feature Name':<38} {'Mean |SHAP|':>11}  {'% of Top':>9}")
print("  " + "─" * 65)
for rank in range(10):
    fi = sorted_idx[rank]
    pct = mean_abs_shap[fi] / mean_abs_shap[sorted_idx[0]] * 100
    print(f"  {rank+1:<5} {feature_names[fi]:<38} {mean_abs_shap[fi]:>11.5f}  {pct:>8.1f}%")
print()
print("  Output Files:")
for fn in [
    "explainability_E1_beeswarm_v3.png",
    "explainability_E2_bar_v3.png",
    "explainability_E3_dependence_v3.png",
    "explainability_E4_waterfall_high_risk_patient_v3.png",
    "explainability_E4_waterfall_borderline_patient_v3.png",
    "explainability_E4_waterfall_low_risk_patient_v3.png",
]:
    print(f"    reports/figures/{fn}")
print("    reports/shap_importance_v3.csv")
print("=" * 65)
