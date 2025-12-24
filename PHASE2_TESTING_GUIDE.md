# YOROI Phase 2 - Testing Guide

**Date:** 23 décembre 2025
**Features to Test:** PerformanceTab & VitaliteTab Expert Insights
**Platform:** iOS/Android

---

## 🎯 TESTING OBJECTIVES

Phase 2 introduces intelligent analytics that adapt to your actual data. This guide will help you verify:

1. **Correlation Analysis Service** - Pattern detection works correctly
2. **Expert Insights** - Dynamic recommendations display in VitaliteTab
3. **PerformanceTab** - All 4 sections render and calculate correctly
4. **Data Integration** - Multiple data sources combine properly

---

## 📋 PRE-TESTING SETUP

### Step 1: Ensure Test Data Exists

The insights require minimum data to function:

**Required Data:**
- ✅ At least 7 sleep entries (lib/sleepService)
- ✅ At least 3-5 training sessions (lib/database)
- ✅ At least 7 days of hydration logs (lib/storage)
- ✅ Training loads with RPE scores (lib/trainingLoadService)

**To Add Test Data (if database is empty):**
1. Navigate to Home screen
2. Log a training session with duration + RPE
3. Navigate to Health section
4. Log sleep duration for past 7 days
5. Log hydration for past 7 days
6. Return to Stats screen

### Step 2: Navigate to Stats Screen

1. Open Yoroi app
2. Tap **Stats** tab in bottom navigation
3. Verify 6 tabs appear at top:
   - Discipline
   - Poids
   - Compo
   - Mesures
   - **Vitalité** ⭐ (Phase 2 enhanced)
   - **Perf** ⭐ (Phase 2 new)

---

## 🧪 TEST PLAN

### TEST 1: Vitalité Tab - Expert Insights Section

**Location:** Stats > Vitalité

**Steps:**
1. Tap on **Vitalité** tab
2. Scroll down past "Score Vitalité", "Sommeil", and "Hydratation" sections
3. Locate **"Insights Experts"** section (new in Phase 2)

**Expected Behavior:**

#### With Sufficient Data (≥7 days):
```
✅ Section displays with header "Insights Experts"
✅ Subtitle shows "Analyse basée sur X jours de données"
✅ 1-5 insight cards appear
✅ Each card has:
   - Icon (✅ green / ⚠️ yellow / 💡 blue)
   - Title (bold, colored)
   - Message (2-3 lines, specific numbers/percentages)
   - Footer: "Confiance: X% • Y données"
```

#### With Insufficient Data (<7 days):
```
✅ Section does not appear
✅ No error messages
✅ App does not crash
```

**Example Insights to Verify:**

| Type | Title | Sample Message |
|------|-------|----------------|
| ⚠️ Warning | Sommeil et Performance | "Vos données montrent que lorsque vous dormez moins, vous vous entraînez moins (-42% de corrélation)" |
| 💡 Tip | Hydratation Variable | "Pensez à augmenter votre hydratation les jours d'entraînement intense. Cible : +0.5L par heure d'effort." |
| ✅ Positive | Récupération Équilibrée | "Votre rythme de 1.3j entre séances est optimal pour la progression et la récupération." |
| ⚠️ Warning | Hydratation Insuffisante | "Moyenne : 1.8L/jour. Cible : 2.5-3L pour un pratiquant actif." |
| ✅ Positive | Discipline Exemplaire | "Score de régularité : 85/100. Votre constance est la clé de votre progression !" |

**Test Checklist:**
- [ ] Insights section appears (if data sufficient)
- [ ] At least 1 insight card displays
- [ ] Card colors match insight types (green/yellow/blue)
- [ ] Messages are in French
- [ ] Numbers/percentages are realistic (not NaN or Infinity)
- [ ] Confidence levels are 50-100%
- [ ] Data point counts make sense (< total days)
- [ ] Scroll works smoothly
- [ ] No console errors in Metro logs

---

### TEST 2: Performance Tab - Work/Rest Ratio Chart

**Location:** Stats > Perf

**Steps:**
1. Tap on **Perf** tab (6th tab)
2. Locate "Work / Rest Ratio" chart (top section)

**Expected Behavior:**
```
✅ Chart displays with 8 week pairs
✅ Each week shows 2 bars:
   - Accent color bar (training hours)
   - Purple bar (sleep hours)
✅ X-axis shows week labels (e.g., "S50", "S51", "S52")
✅ Y-axis shows hour values
✅ Grid lines visible
✅ Legend at bottom: "Entraînement" / "Sommeil"
✅ Bars are proportional to data values
```

**Visual Verification:**
- [ ] 8 week labels visible
- [ ] 16 bars total (2 per week)
- [ ] Training bars vary based on actual data
- [ ] Sleep bars show ~52h per week (placeholder)
- [ ] Grid lines help read values
- [ ] Chart not cut off at edges
- [ ] SVG renders smoothly (no pixelation)

**Edge Cases:**
- [ ] Works with 0 trainings in a week (empty bar)
- [ ] Works with multiple trainings in same week (aggregated)
- [ ] Scales correctly if one week has 20+ hours

---

### TEST 3: Performance Tab - Cumulative Load Tracking

**Location:** Stats > Perf (scroll down from Work/Rest chart)

**Steps:**
1. Scroll to "Charge Cumulative" section
2. Observe current week vs average display

**Expected Behavior:**
```
✅ "Charge Cumulative" header visible
✅ Current week load displays (e.g., "1850 pts")
✅ 4-week average displays (e.g., "1420 pts")
✅ Variation percentage shows (e.g., "+30%")
✅ Risk badge appears with color:
   - Green: "safe"
   - Yellow: "moderate"
   - Orange: "high"
   - Red: "danger"
```

**Risk Level Logic:**
| Current Load | Badge Color | Label |
|--------------|-------------|-------|
| < 1500 | Green | safe |
| 1500-2000 | Yellow | moderate |
| 2000-2500 | Orange | high |
| > 2500 | Red | danger |

**Test Checklist:**
- [ ] Current load is a realistic number (not 0 unless no data)
- [ ] 4-week average calculates correctly
- [ ] Variation % is accurate (+X% or -X%)
- [ ] Badge color matches load level
- [ ] Text is readable on badge background

**Threshold Guide:**
```
✅ Guide displays 4 ranges:
   < 1500     | Optimal (charge saine)
   1500-2000  | Modérée (bon équilibre)
   2000-2500  | Élevée (attention)
   > 2500     | Critique (risque blessure)
```

- [ ] All 4 thresholds visible
- [ ] Colors match (green/yellow/orange/red)
- [ ] French labels correct

---

### TEST 4: Performance Tab - RPE Intensity Breakdown

**Location:** Stats > Perf (scroll down from Load section)

**Steps:**
1. Scroll to "Répartition Intensité (RPE)" section
2. Check percentage bars

**Expected Behavior:**
```
✅ "Répartition Intensité (RPE)" header
✅ "Derniers 30 jours" subtitle
✅ 3 horizontal percentage bars:
   - Green bar: "Léger (RPE 1-4)" - X%
   - Orange bar: "Modéré (RPE 5-7)" - Y%
   - Red bar: "Intense (RPE 8-10)" - Z%
✅ Percentages sum to 100%
✅ Bar widths match percentages
✅ Recommendation text below:
   "Idéal : 70-80% modéré, 10-20% intense, 10% léger"
```

**Test Checklist:**
- [ ] All 3 bars visible
- [ ] Colors correct (green/orange/red)
- [ ] Percentages are numbers, not NaN
- [ ] Total = 100% (or close due to rounding)
- [ ] Bar widths proportional to percentages
- [ ] Labels readable
- [ ] Recommendation text displays

**Edge Cases:**
- [ ] Works with 0% in a category (bar invisible)
- [ ] Works with 100% in one category (full width)
- [ ] Works with <30 training loads (shows available data)

---

### TEST 5: Performance Tab - Alert System

**Location:** Stats > Perf (between Load and RPE sections)

**Steps:**
1. Check if yellow alert box appears
2. Read alert message

**Expected Behavior:**

#### Overtraining Alert:
```
⚠️ Charge élevée : +50% vs moyenne 4 semaines. Risque de blessure.
```
**Trigger:** Current load > 1.5x 4-week average

#### Recovery Alert:
```
⚠️ Volume élevé avec sommeil insuffisant. Priorise la récupération.
```
**Trigger:** >12h training + <50h sleep in current week

#### No Alert:
```
No alert box displays (normal conditions)
```

**Test Checklist:**
- [ ] Alert appears when conditions met
- [ ] Alert does NOT appear when conditions not met
- [ ] Alert box is yellow background
- [ ] Warning icon (⚠️) visible
- [ ] Text is readable
- [ ] Does not overlap other sections

---

### TEST 6: Dark Mode Compatibility

**Steps:**
1. Navigate to Settings (or use system settings)
2. Toggle dark mode ON
3. Return to Stats > Vitalité
4. Return to Stats > Perf

**Expected Behavior:**
```
✅ Background colors invert correctly
✅ Text remains readable (proper contrast)
✅ Insight cards maintain visibility:
   - Green insights: darker green bg in dark mode
   - Yellow insights: darker yellow bg
   - Blue insights: darker blue bg
✅ Charts render with appropriate colors
✅ No white boxes on black background
✅ Icons remain visible
```

**Test Checklist:**
- [ ] Vitalité tab readable in dark mode
- [ ] Insights section visible in dark mode
- [ ] Performance charts visible in dark mode
- [ ] All text has sufficient contrast
- [ ] No visual glitches

**Switch back to light mode:**
- [ ] Everything renders correctly in light mode again

---

### TEST 7: Data Edge Cases

#### Empty Database Test:
1. Clear all app data (or fresh install)
2. Navigate to Stats > Vitalité
3. Navigate to Stats > Perf

**Expected:**
- [ ] No insights section in Vitalité (insufficient data)
- [ ] Performance tab shows empty charts or "no data" states
- [ ] No crashes or errors
- [ ] App remains functional

#### Minimal Data Test (1 week):
1. Add 1 training session
2. Add 1 sleep entry
3. Add 1 hydration entry
4. Check Vitalité and Perf tabs

**Expected:**
- [ ] No insights yet (need 7+ days)
- [ ] Performance chart shows minimal bars
- [ ] No NaN or error values
- [ ] App explains why insights aren't available

#### Full Data Test (30+ days):
1. Ensure 30+ days of data
2. Check all tabs

**Expected:**
- [ ] 3-5 insights appear in Vitalité
- [ ] All confidence levels 70%+
- [ ] Charts fully populated
- [ ] All sections render completely

---

### TEST 8: Performance & Responsiveness

**Steps:**
1. Navigate to Stats > Vitalité
2. Measure load time
3. Navigate to Stats > Perf
4. Measure load time
5. Scroll through all sections
6. Switch between tabs rapidly

**Expected Performance:**
- [ ] Vitalité tab loads < 500ms
- [ ] Performance tab loads < 500ms
- [ ] Insights generate < 200ms
- [ ] Scrolling is smooth (60fps)
- [ ] No lag when switching tabs
- [ ] No memory leaks (check Xcode Instruments)

**Metro Bundler Checks:**
- [ ] No red error screens
- [ ] No yellow warning boxes (or documented)
- [ ] No console errors in Metro logs
- [ ] Bundle size reasonable (<10MB)

---

### TEST 9: Correlation Accuracy

**Manual Verification:**

#### Sleep vs Training:
1. Note your average sleep duration over 7 days
2. Note your training frequency
3. Read the insight (if sleep-training correlation appears)
4. Verify the correlation makes sense:
   - Negative correlation: Less sleep → less training
   - Positive correlation: Good sleep → more training

**Test:**
- [ ] Correlation percentage is realistic (-100% to +100%)
- [ ] Message accurately describes pattern
- [ ] Confidence level makes sense based on data amount

#### Hydration vs Load:
1. Check if you adjust hydration on training days
2. Read hydration insight
3. Verify it matches your behavior

**Test:**
- [ ] Insight accurately reflects your habits
- [ ] Recommendations are actionable
- [ ] Numbers match your logged data

#### Consistency Score:
1. Review your training pattern (regular vs sporadic)
2. Read consistency insight
3. Verify score matches reality:
   - 75-100: Very consistent
   - 50-74: Moderately consistent
   - <50: Inconsistent

**Test:**
- [ ] Score reflects actual consistency
- [ ] Message provides helpful guidance
- [ ] Calculation seems accurate

---

### TEST 10: Integration with Existing Features

**Steps:**
1. Add a new training session (Home > Add Training)
2. Return to Stats > Perf
3. Verify new data appears in charts

**Expected:**
- [ ] Performance tab updates with new training
- [ ] Load tracking includes new session
- [ ] RPE breakdown updates if RPE logged
- [ ] Charts re-render correctly

**Steps:**
1. Log new sleep entry
2. Return to Stats > Vitalité
3. Check if insights update

**Expected:**
- [ ] Insights may change (if pattern changes)
- [ ] New sleep data reflected in analysis
- [ ] No stale data displayed

---

## 🐛 KNOWN ISSUES TO VERIFY

### Issue #1: Placeholder Sleep Data (TODO)
**Location:** PerformanceTab.tsx:67-70
**Description:** Work/Rest chart uses placeholder sleep hours (52.5h/week) instead of actual sleep tracking per week

**Test:**
- [ ] Note that all weeks show ~52.5h sleep (same value)
- [ ] Confirm this is expected placeholder behavior
- [ ] Actual sleep integration pending

### Issue #2: Minimum Data Requirements
**Description:** Insights require 7+ days of data

**Test:**
- [ ] With <7 days: No insights section appears
- [ ] With 7+ days: Insights section appears
- [ ] Transition is smooth (no flash of content)

---

## ✅ TEST COMPLETION CHECKLIST

### Core Functionality:
- [ ] Vitalité Insights section displays correctly
- [ ] Performance Work/Rest chart renders
- [ ] Performance Load tracking calculates correctly
- [ ] Performance RPE breakdown shows percentages
- [ ] Performance Alerts trigger appropriately

### Data Accuracy:
- [ ] Correlation calculations are realistic
- [ ] Confidence levels are 50-100%
- [ ] No NaN or Infinity values anywhere
- [ ] Charts scale properly with data
- [ ] Empty states handle gracefully

### UX/UI:
- [ ] Dark mode works correctly
- [ ] Light mode works correctly
- [ ] Text is readable on all backgrounds
- [ ] Icons display correctly
- [ ] Scrolling is smooth
- [ ] No layout shifts or jumps

### Performance:
- [ ] Tabs load quickly (<500ms)
- [ ] No lag when switching tabs
- [ ] No memory leaks
- [ ] No crashes

### Edge Cases:
- [ ] Works with empty database
- [ ] Works with minimal data (1 week)
- [ ] Works with full data (30+ days)
- [ ] Works with extreme values (very high loads)

---

## 📝 BUG REPORTING

If you find issues, please report with:

**Bug Template:**
```
## Bug: [Short title]

**Location:** Stats > [Tab Name] > [Section]

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**


**Actual Behavior:**


**Screenshots:** (if applicable)

**Device:** iOS/Android
**App Version:**
**Data Available:** [X days of sleep, Y trainings, Z hydration entries]
```

**Common Issues to Check:**
- Console errors in Metro bundler
- Red error screens
- Yellow warning boxes
- Layout issues (overlapping text)
- Performance lag
- Crashes
- Incorrect calculations

---

## 🎯 SUCCESS CRITERIA

Phase 2 testing is **successful** when:

1. ✅ **All 10 tests pass** without blocking issues
2. ✅ **Insights display correctly** with realistic data
3. ✅ **Performance tab renders all 4 sections** correctly
4. ✅ **No crashes** in any scenario (empty/minimal/full data)
5. ✅ **Dark/light modes** both work
6. ✅ **Performance** is acceptable (<500ms load times)
7. ✅ **Correlations** are accurate and helpful

---

## 📞 TESTING SUPPORT

**Metro Bundler Logs:**
```bash
# Terminal where Expo is running will show:
- Module resolution errors
- Runtime errors
- Component warnings
- Bundle size
```

**Check logs for:**
```
❌ Error: Cannot find module...
❌ TypeError: undefined is not an object...
❌ RangeError: Invalid array length...
⚠️ Warning: Each child in a list should have a unique "key"...
```

**Debugging Commands:**
```bash
# Reload app
Press 'r' in Metro bundler terminal

# Clear cache and reload
Press 'Shift + R' in Metro bundler terminal

# Open developer menu on device
Shake device (or Cmd+D in simulator)

# View React DevTools
Enable in developer menu
```

---

## 🚀 POST-TESTING

Once all tests pass:

1. **Document Results:** Note any minor issues or suggestions
2. **Performance Metrics:** Record load times and memory usage
3. **User Feedback:** Test with real users if possible
4. **Production Readiness:** Determine if ready to merge to main

**Files to Review:**
- `PHASE2_IMPLEMENTATION_SUMMARY.md` - Implementation details
- `RUNTIME_TEST_SUMMARY.md` - Automated test results (from Phase 1)
- This document - Manual testing guide

---

**Testing Guide Version:** 1.0
**Created:** 23 décembre 2025
**For:** Phase 2 - Expert Insights & Performance Analytics

Good luck testing! 🧪
