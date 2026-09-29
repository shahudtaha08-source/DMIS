import { useState } from "react";
import { Users, Siren, Building2, Package } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, Dialog, EmptyState, ErrorState, LoadingState, SelectField, SeverityBadge, StatCard, Table, TableContainer, TBody, TD, TextField, TextareaField, TH, THead, TR, useToast } from "../components/ui";

/** Component gallery — development only (not routed in production builds). */
export function DesignSystemPage() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-8">
      <section aria-labelledby="ds-badges">
        <h2 id="ds-badges" className="mb-3 text-lg font-semibold">Severity &amp; status (icon + label + colour)</h2>
        <div className="flex flex-wrap gap-2">
          <SeverityBadge severity="CRITICAL" /><SeverityBadge severity="HIGH" /><SeverityBadge severity="MODERATE" /><SeverityBadge severity="LOW" />
          <Badge tone="safe">Resolved</Badge><Badge tone="neutral">Draft</Badge>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active incidents" value="—" icon={Siren} tone="critical" hint="Example tile" />
        <StatCard label="Shelter capacity" value="—" icon={Building2} tone="info" />
        <StatCard label="Active teams" value="—" icon={Users} tone="safe" />
        <StatCard label="Low-stock items" value="—" icon={Package} tone="warning" />
      </section>
      <section className="flex flex-wrap gap-2">
        <Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="danger">Danger</Button><Button variant="ghost">Ghost</Button><Button loading>Saving</Button>
        <Button variant="secondary" onClick={() => toast.push({ tone: "success", title: "Saved", message: "Toast example" })}>Show toast</Button>
        <Button variant="secondary" onClick={() => setOpen(true)}>Open dialog</Button>
      </section>
      <Card>
        <CardHeader title="Form controls" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <TextField label="Title" placeholder="Flood in low-lying area" />
          <TextField label="With error" error="This field is required" defaultValue="" />
          <SelectField label="Severity"><option>Low</option><option>Critical</option></SelectField>
          <TextareaField label="Description" hint="Plain text only" />
        </CardBody>
      </Card>
      <TableContainer>
        <Table>
          <THead><TR><TH>Sample</TH><TH>Severity</TH></TR></THead>
          <TBody><TR><TD>Example row</TD><TD><SeverityBadge severity="HIGH" /></TD></TR></TBody>
        </Table>
      </TableContainer>
      <LoadingState label="Loading example…" />
      <ErrorState title="Analytics temporarily unavailable" message="Try again in a moment." onRetry={() => undefined} />
      <EmptyState title="No incidents yet" description="Reported incidents will appear here." />
      <Dialog open={open} onClose={() => setOpen(false)} title="Confirm action" description="Dialog example" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => setOpen(false)}>Confirm</Button></>}>
        <p className="text-sm text-slate-700">Press Escape or click outside to close.</p>
      </Dialog>
    </div>
  );
}
