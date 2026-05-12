"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/layout/Container";
import { Header } from "@/components/layout/Header";

// ── Step definitions ──────────────────────────────────────────
type RiskTolerance = "conservative" | "moderate" | "aggressive";

interface OnboardingData {
  // Step 1 — Investment Style
  horizonMonths: number;       // 3–36
  riskTolerance: RiskTolerance;
  // Step 2 — Risk Parameters
  maxConcentration: number;    // 10–50 %
  maxSinglePosition: number;  // 5–25 %
  // Step 3 — Market Access
  markets: string[];
  vehicleTypes: string[];
}

const ALL_MARKETS = ["US", "UK", "EU", "JP", "AU", "HK", "CA"];
const ALL_VEHICLES = ["equity", "ETF", "LEAPS", "options", "warrants", "futures"];

const STEPS = [
  { title: "Investment style", subtitle: "How do you think about opportunities?" },
  { title: "Risk parameters", subtitle: "Set your guardrails" },
  { title: "Market access", subtitle: "Where can you trade?" },
];

// ── Slider component ─────────────────────────────────────────
function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-sm font-medium text-neutral-700">{label}</span>
        <span className="text-sm font-semibold text-neutral-900 tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-neutral-200 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-900
          [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:-mt-[7px]
          [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
          [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-neutral-900
          [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md"
      />
      <div className="flex justify-between mt-1">
        <span className="text-xs text-neutral-400">{format(min)}</span>
        <span className="text-xs text-neutral-400">{format(max)}</span>
      </div>
    </div>
  );
}

// ── Pill toggle ──────────────────────────────────────────────
function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border
        ${active
          ? "bg-neutral-900 text-white border-neutral-900"
          : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-300 hover:text-neutral-700"
        }`}
    >
      {label}
    </button>
  );
}

// ── Risk selector ────────────────────────────────────────────
function RiskSelector({
  value,
  onChange,
}: {
  value: RiskTolerance;
  onChange: (v: RiskTolerance) => void;
}) {
  const options: { key: RiskTolerance; label: string; desc: string }[] = [
    { key: "conservative", label: "Conservative", desc: "Preserve capital, accept modest upside" },
    { key: "moderate", label: "Moderate", desc: "Balanced risk-reward, some concentration OK" },
    { key: "aggressive", label: "Aggressive", desc: "Maximize upside, accept deep drawdowns" },
  ];

  return (
    <div className="space-y-3">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200
            ${value === opt.key
              ? "border-neutral-900 bg-neutral-50"
              : "border-neutral-200 bg-white hover:border-neutral-300"
            }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-neutral-900">{opt.label}</span>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all
              ${value === opt.key ? "border-neutral-900" : "border-neutral-300"}`}>
              {value === opt.key && <div className="w-2 h-2 rounded-full bg-neutral-900" />}
            </div>
          </div>
          <p className="text-xs text-neutral-500">{opt.desc}</p>
        </button>
      ))}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────
export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    horizonMonths: 12,
    riskTolerance: "moderate",
    maxConcentration: 25,
    maxSinglePosition: 10,
    markets: ["US"],
    vehicleTypes: ["equity", "ETF", "options"],
  });

  const update = <K extends keyof OnboardingData>(key: K, val: OnboardingData[K]) =>
    setData((d) => ({ ...d, [key]: val }));

  const toggleItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

  async function handleComplete() {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, ...data }),
    });

    if (res.ok) {
      window.location.href = "/";
    } else {
      alert("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  const canProceed = () => {
    if (step === 0) return true;
    if (step === 1) return data.maxConcentration >= data.maxSinglePosition;
    if (step === 2) return data.markets.length > 0 && data.vehicleTypes.length > 0;
    return true;
  };

  return (
    <>
      <Header />
      <Container className="py-16">
        <div className="max-w-lg mx-auto">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-12">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors duration-300
                  ${i <= step ? "bg-neutral-900" : "bg-neutral-200"}`}
              />
            ))}
          </div>

          {/* Step header */}
          <h1 className="text-2xl font-semibold tracking-tight mb-1">
            {STEPS[step].title}
          </h1>
          <p className="text-sm text-neutral-500 mb-10">
            {STEPS[step].subtitle}
          </p>

          {/* Step 0 — Investment Style */}
          {step === 0 && (
            <div>
              <Slider
                label="Investment horizon"
                value={data.horizonMonths}
                min={3}
                max={36}
                step={3}
                format={(v) => (v < 12 ? `${v} months` : `${v / 12} year${v > 12 ? "s" : ""}`)}
                onChange={(v) => update("horizonMonths", v)}
              />

              <div className="mt-2">
                <span className="text-sm font-medium text-neutral-700 block mb-3">
                  Risk appetite
                </span>
                <RiskSelector
                  value={data.riskTolerance}
                  onChange={(v) => update("riskTolerance", v)}
                />
              </div>
            </div>
          )}

          {/* Step 1 — Risk Parameters */}
          {step === 1 && (
            <div>
              <Slider
                label="Max sector concentration"
                value={data.maxConcentration}
                min={10}
                max={50}
                step={5}
                format={(v) => `${v}%`}
                onChange={(v) => update("maxConcentration", v)}
              />
              <Slider
                label="Max single position"
                value={data.maxSinglePosition}
                min={5}
                max={25}
                step={5}
                format={(v) => `${v}%`}
                onChange={(v) => update("maxSinglePosition", v)}
              />
              {data.maxSinglePosition > data.maxConcentration && (
                <p className="text-xs text-red-500 -mt-4 mb-4">
                  Single position can&apos;t exceed sector concentration
                </p>
              )}
            </div>
          )}

          {/* Step 2 — Market Access */}
          {step === 2 && (
            <div>
              <div className="mb-8">
                <span className="text-sm font-medium text-neutral-700 block mb-3">
                  Markets you can trade
                </span>
                <div className="flex flex-wrap gap-2">
                  {ALL_MARKETS.map((m) => (
                    <Pill
                      key={m}
                      label={m}
                      active={data.markets.includes(m)}
                      onClick={() => update("markets", toggleItem(data.markets, m))}
                    />
                  ))}
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-neutral-700 block mb-3">
                  Instruments you can use
                </span>
                <div className="flex flex-wrap gap-2">
                  {ALL_VEHICLES.map((v) => (
                    <Pill
                      key={v}
                      label={v}
                      active={data.vehicleTypes.includes(v)}
                      onClick={() => update("vehicleTypes", toggleItem(data.vehicleTypes, v))}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-12">
            {step > 0 ? (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Continue
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={!canProceed() || saving}>
                {saving ? "Saving…" : "Start researching"}
              </Button>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}
