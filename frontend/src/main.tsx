import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Award,
  CheckCircle2,
  Download,
  FileBadge,
  LoaderCircle,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  TriangleAlert,
  Upload
} from "lucide-react";
import { api, certificateUrl } from "./lib/api";
import "./styles.css";

type RecipientDraft = {
  name: string;
  email: string;
  certificate_title?: string;
};

type RecipientResult = {
  id: string;
  position: number;
  name: string | null;
  email: string | null;
  certificate_title: string | null;
  status: "PENDING" | "GENERATED" | "FAILED";
  error_message: string | null;
  download_url: string | null;
};

type Job = {
  id: string;
  event_name: string;
  course_name: string | null;
  issued_on: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "COMPLETED_WITH_ERRORS" | "FAILED";
  total_count: number;
  success_count: number;
  failed_count: number;
  progress_percent: number;
  recipients: RecipientResult[];
};

const sampleRecipients: RecipientDraft[] = [
  { name: "Asha Rao", email: "asha@example.com" },
  { name: "Dev Patel", email: "dev@example.com", certificate_title: "Certificate of Excellence" },
  { name: "Mira Thomas", email: "mira@example.com" }
];

function App() {
  const [eventName, setEventName] = useState("Backend Masterclass");
  const [courseName, setCourseName] = useState("FastAPI Certificate Automation");
  const [issuedOn, setIssuedOn] = useState("2026-10-07");
  const [recipients, setRecipients] = useState<RecipientDraft[]>(sampleRecipients);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function refreshJobs(nextId?: string) {
    const summaries = await api<Array<Omit<Job, "progress_percent" | "recipients">>>("/jobs");
    setJobs(
      summaries.map((job) => ({
        ...job,
        progress_percent: job.total_count ? Math.round(((job.success_count + job.failed_count) / job.total_count) * 100) : 0,
        recipients: []
      }))
    );

    if (nextId || activeJob?.id) {
      const detail = await api<Job>(`/jobs/${nextId || activeJob?.id}`);
      setActiveJob(detail);
    }
  }

  useEffect(() => {
    void refreshJobs();
  }, []);

  const validRows = useMemo(() => recipients.filter((item) => item.name.trim() || item.email.trim()).length, [recipients]);
  const previewName = recipients.find((item) => item.name.trim())?.name || "Recipient Name";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        event_name: eventName,
        course_name: courseName,
        issued_on: issuedOn,
        recipients: recipients.filter((item) => item.name.trim() || item.email.trim())
      };
      const job = await api<Job>("/jobs", { method: "POST", body: JSON.stringify(payload) });
      setActiveJob(job);
      await refreshJobs(job.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the certificate job");
    } finally {
      setSubmitting(false);
    }
  }

  function updateRecipient(index: number, patch: Partial<RecipientDraft>) {
    setRecipients((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function addRecipient() {
    setRecipients((current) => [...current, { name: "", email: "" }]);
  }

  function loadSampleWithFailure() {
    setRecipients([
      { name: "Asha Rao", email: "asha@example.com" },
      { name: "", email: "missing-name@example.com" },
      { name: "FAIL_CERTIFICATE", email: "renderer@example.com" },
      { name: "Nia Shah", email: "nia@example.com" }
    ]);
  }

  return (
    <main className="app">
      <section className="heroBand">
        <div className="heroCopy">
          <span className="eyebrow"><Sparkles size={16} /> Bulk Certificate Generator</span>
          <h1>Generate, track, and retrieve certificate batches from one polished console.</h1>
          <p>
            Submit many recipients in a single job, keep valid certificates moving even when individual records fail,
            and download generated certificates from the job result.
          </p>
          <div className="heroStats">
            <Metric value={String(jobs.length)} label="Jobs" />
            <Metric value={String(activeJob?.success_count ?? 0)} label="Generated" />
            <Metric value={`${activeJob?.progress_percent ?? 0}%`} label="Progress" />
          </div>
        </div>
        <CertificateStage name={previewName} eventName={eventName} issuedOn={issuedOn} />
      </section>

      <section className="workspace">
        <form className="composer" onSubmit={submit}>
          <div className="sectionTitle">
            <div>
              <span>Request</span>
              <h2>Certificate job</h2>
            </div>
            <button type="button" className="ghost" onClick={() => setRecipients(sampleRecipients)}>
              <RotateCcw size={16} /> Reset
            </button>
          </div>

          <div className="fieldGrid">
            <label>Event name<input value={eventName} onChange={(event) => setEventName(event.target.value)} required /></label>
            <label>Course name<input value={courseName} onChange={(event) => setCourseName(event.target.value)} /></label>
            <label>Issued on<input value={issuedOn} onChange={(event) => setIssuedOn(event.target.value)} required /></label>
          </div>

          <div className="recipientHeader">
            <div>
              <span>{validRows} recipients ready</span>
              <h3>Bulk recipients</h3>
            </div>
            <div className="toolbar">
              <button type="button" className="ghost" onClick={loadSampleWithFailure}><TriangleAlert size={16} /> Failure sample</button>
              <button type="button" className="ghost" onClick={addRecipient}><Plus size={16} /> Add row</button>
            </div>
          </div>

          <div className="recipientRows">
            {recipients.map((recipient, index) => (
              <div className="recipientRow" key={index}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <input placeholder="Recipient name" value={recipient.name} onChange={(event) => updateRecipient(index, { name: event.target.value })} />
                <input placeholder="email@example.com" value={recipient.email} onChange={(event) => updateRecipient(index, { email: event.target.value })} />
                <input placeholder="Optional certificate title" value={recipient.certificate_title || ""} onChange={(event) => updateRecipient(index, { certificate_title: event.target.value })} />
              </div>
            ))}
          </div>

          {error && <div className="error">{error}</div>}
          <button className="primary" disabled={submitting || validRows === 0}>
            {submitting ? <LoaderCircle className="spin" size={18} /> : <Send size={18} />}
            Generate certificates
          </button>
        </form>

        <aside className="results">
          <div className="sectionTitle">
            <div>
              <span>Status</span>
              <h2>Generation results</h2>
            </div>
            <button type="button" className="ghost" onClick={() => void refreshJobs()}>
              <Upload size={16} /> Refresh
            </button>
          </div>

          {activeJob ? <JobDetail job={activeJob} /> : <EmptyState />}

          <div className="history">
            <h3>Recent jobs</h3>
            {jobs.map((job) => (
              <button type="button" key={job.id} onClick={() => void refreshJobs(job.id)}>
                <span>{job.event_name}</span>
                <strong>{formatStatus(job.status)}</strong>
              </button>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

function CertificateStage({ name, eventName, issuedOn }: { name: string; eventName: string; issuedOn: string }) {
  return (
    <div className="stage" aria-label="3D certificate preview">
      <div className="certificateStack">
        <div className="certificateCard ghostCard" />
        <div className="certificateCard middleCard" />
        <div className="certificateCard frontCard">
          <Award size={42} />
          <span>Certificate of Completion</span>
          <strong>{name}</strong>
          <p>{eventName}</p>
          <small>{issuedOn}</small>
        </div>
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="metric"><strong>{value}</strong><span>{label}</span></div>;
}

function JobDetail({ job }: { job: Job }) {
  return (
    <div className="jobDetail">
      <div className="progressHead">
        <StatusIcon status={job.status} />
        <div>
                <strong>{formatStatus(job.status)}</strong>
          <span>{job.success_count} generated, {job.failed_count} failed, {job.total_count} total</span>
        </div>
      </div>
      <div className="progressTrack"><span style={{ width: `${job.progress_percent}%` }} /></div>

      <div className="resultList">
        {job.recipients.map((recipient) => (
          <div className="resultItem" key={recipient.id}>
            <div>
              <strong>{recipient.name || "Unnamed recipient"}</strong>
              <span>{recipient.email || recipient.error_message}</span>
            </div>
            {recipient.download_url ? (
              <a href={certificateUrl(recipient.download_url)} target="_blank" rel="noreferrer"><Download size={16} /> Download</a>
            ) : (
              <span className="failed">{recipient.status}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: Job["status"] }) {
  if (status === "COMPLETED") return <CheckCircle2 className="ok" size={28} />;
  if (status === "FAILED" || status === "COMPLETED_WITH_ERRORS") return <TriangleAlert className="warn" size={28} />;
  return <LoaderCircle className="spin" size={28} />;
}

function formatStatus(status: string) {
  return status.split("_").join(" ");
}

function EmptyState() {
  return (
    <div className="empty">
      <FileBadge size={40} />
      <strong>No job selected</strong>
      <span>Create a generation job to see progress, failures, and downloads.</span>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
