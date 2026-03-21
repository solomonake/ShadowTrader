import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import { apiClient } from "../api/client";
import { StepBroker } from "../components/onboarding/StepBroker";
import { StepComplete } from "../components/onboarding/StepComplete";
import { StepCredentials } from "../components/onboarding/StepCredentials";
import { StepRuleTemplate } from "../components/onboarding/StepRuleTemplate";
import { StepTestConnection } from "../components/onboarding/StepTestConnection";
import type { BrokerConnectionPayload, BrokerStatus } from "../lib/types";

const steps = ["Broker", "Credentials", "Test", "Template", "Complete"];

function initialPayload(): BrokerConnectionPayload {
  return {
    broker: "alpaca",
    credentials: { api_key: "", api_secret: "", paper: true },
    is_paper: true,
  };
}

export function Onboarding(): JSX.Element {
  const navigate = useNavigate();
  const { completeOnboarding } = useAuth();
  const [step, setStep] = useState(0);
  const [brokerPayload, setBrokerPayload] = useState<BrokerConnectionPayload>(initialPayload());
  const [template, setTemplate] = useState("day_trader");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<BrokerStatus | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  const payload = useMemo(() => {
    if (brokerPayload.broker === "ibkr") {
      return {
        ...brokerPayload,
        credentials: {
          host: brokerPayload.credentials.host ?? "127.0.0.1",
          port: brokerPayload.credentials.port ?? (brokerPayload.is_paper ? 7497 : 7496),
          client_id: brokerPayload.credentials.client_id ?? 1,
        },
      };
    }
    if (brokerPayload.broker === "binance") {
      return {
        ...brokerPayload,
        credentials: {
          ...brokerPayload.credentials,
          testnet: brokerPayload.is_paper,
        },
      };
    }
    return {
      ...brokerPayload,
      credentials: {
        ...brokerPayload.credentials,
        paper: brokerPayload.is_paper,
      },
    };
  }, [brokerPayload]);

  async function handleTest(): Promise<void> {
    setTesting(true);
    setTestError(null);
    try {
      const result = await apiClient.testBrokerConnection(payload);
      setTestResult(result);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Connection failed.");
      setTestResult(null);
    } finally {
      setTesting(false);
    }
  }

  async function handleFinish(): Promise<void> {
    setFinishing(true);
    try {
      await apiClient.connectBroker(payload);
      if (template !== "custom") {
        await apiClient.applyRuleTemplate(template);
      }
      completeOnboarding();
      navigate(template === "custom" ? "/rules" : "/session");
    } finally {
      setFinishing(false);
    }
  }

  return (
    <main className="min-h-screen bg-shell px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-primary">Onboarding</div>
          <h1 className="mt-3 text-3xl font-semibold text-white">Connect your broker and define your guardrails</h1>
          <div className="mt-5 grid gap-2 md:grid-cols-5">
            {steps.map((label, index) => (
              <div key={label} className={`rounded-full px-4 py-2 text-center text-sm ${index <= step ? "bg-primary text-white" : "bg-panel text-slate-500"}`}>
                {index + 1}. {label}
              </div>
            ))}
          </div>
        </div>

        {step === 0 && (
          <StepBroker
            selectedBroker={payload.broker}
            onSelect={(broker) =>
              setBrokerPayload({
                broker,
                is_paper: true,
                credentials:
                  broker === "ibkr"
                    ? { host: "127.0.0.1", port: 7497, client_id: 1 }
                    : broker === "binance"
                      ? { api_key: "", secret_key: "", testnet: true }
                      : { api_key: "", api_secret: "", paper: true },
              })
            }
          />
        )}
        {step === 1 && <StepCredentials payload={payload} onChange={setBrokerPayload} />}
        {step === 2 && <StepTestConnection testing={testing} result={testResult} error={testError} onTest={handleTest} />}
        {step === 3 && <StepRuleTemplate selectedTemplate={template} onSelect={setTemplate} />}
        {step === 4 && <StepComplete broker={payload.broker} template={template} />}

        <div className="flex justify-between">
          <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0} className="rounded-2xl border border-edge px-5 py-3 text-sm text-slate-300 disabled:opacity-50">
            Back
          </button>
          {step < 3 && (
            <button
              type="button"
              onClick={() => setStep((current) => current + 1)}
              disabled={step === 2 && !testResult?.connected}
              className="rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              Continue
            </button>
          )}
          {step === 3 && (
            <button type="button" onClick={() => setStep(4)} className="rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-white">
              Review Setup
            </button>
          )}
          {step === 4 && (
            <button type="button" onClick={() => void handleFinish()} disabled={finishing} className="rounded-2xl bg-success px-5 py-3 text-sm font-medium text-white disabled:opacity-60">
              {finishing ? "Finishing..." : "Finish Setup"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
