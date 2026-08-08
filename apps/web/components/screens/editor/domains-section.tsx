import { useCallback, useEffect, useState } from "react";
import { isVerifiedDomainStatus } from "@kytelink/schemas";
import { useApp } from "../../../lib/app-context";
import { useEditor } from "../../../lib/editor/editor-context";
import { Button } from "../../ui/button";
import { TextInput } from "../../ui/text-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Badge } from "../../ui/badge";
import type { DomainRecord } from "../../../lib/api/types";

export function DomainsSection() {
  const { api, capabilities, toast, handleError } = useApp();
  const { kyte, allows } = useEditor();
  const canManage = allows("manage_domains");
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [host, setHost] = useState("");
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const result = await api.domains.list({ kyteId: kyte.id });
    setDomains(result.domains);
  }, [api, kyte.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // verify, not status: `status` replays what we last recorded, so polling it
  // could never move a domain off "Awaiting configuration".
  const verifyPending = useCallback(async () => {
    const updated = await Promise.all(
      domains.map(async (domain) => {
        if (isVerifiedDomainStatus(domain.status)) return domain;
        const result = await api.domains.verify({ domainId: domain.id });
        return { ...domain, status: result.status, records: result.records };
      }),
    );
    setDomains(updated);
  }, [domains, api]);

  useEffect(() => {
    const pending = domains.some((domain) => !isVerifiedDomainStatus(domain.status));
    if (!pending) return;
    // Check straight away, not only after the first interval: someone returning
    // to this tab has usually just finished editing their DNS.
    void verifyPending();
    const interval = window.setInterval(() => void verifyPending(), 10000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domains.length, api]);

  async function refresh() {
    setRefreshing(true);
    try {
      await verifyPending();
    } catch (error) {
      handleError(error);
    } finally {
      setRefreshing(false);
    }
  }

  async function add() {
    if (!host.trim()) return;
    setAdding(true);
    try {
      const created = await api.domains.add({ kyteId: kyte.id, host });
      setDomains((current) => [...current, created]);
      setHost("");
      toast("Domain added — set your DNS records", "success");
    } catch (error) {
      handleError(error);
    } finally {
      setAdding(false);
    }
  }

  async function remove(domainId: string) {
    try {
      await api.domains.remove({ domainId });
      setDomains((current) => current.filter((domain) => domain.id !== domainId));
    } catch (error) {
      handleError(error);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom domains</CardTitle>
        <CardDescription>
          {capabilities.domains
            ? "Add the DNS records below at your provider, then we'll verify automatically."
            : "Custom domains aren't set up on this instance."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {capabilities.domains && canManage ? (
          <div className="mb-4 flex gap-2">
            <TextInput
              leftAddon="https://"
              placeholder="you.com"
              value={host}
              onChange={(event) => setHost(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && add()}
            />
            <Button onClick={add} loading={adding}>
              Connect
            </Button>
          </div>
        ) : null}

        {domains.length === 0 ? (
          <p className="text-sm text-muted-foreground">No custom domains yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {domains.map((domain) => (
              <div key={domain.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{domain.host}</span>
                  <div className="flex items-center gap-3">
                    <Badge variant={isVerifiedDomainStatus(domain.status) ? "success" : "warning"}>
                      {isVerifiedDomainStatus(domain.status) ? "Good to go" : "Awaiting configuration"}
                    </Badge>
                    {!isVerifiedDomainStatus(domain.status) ? (
                      <Button variant="ghost" size="sm" loading={refreshing} onClick={refresh}>
                        Refresh
                      </Button>
                    ) : null}
                    {canManage ? (
                      <Button variant="danger-ghost" size="sm" onClick={() => remove(domain.id)}>
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
                <table className="mt-2 w-full text-left text-xs text-muted-foreground">
                  <thead>
                    <tr>
                      <th className="pb-1 font-medium">Type</th>
                      <th className="pb-1 font-medium">Name</th>
                      <th className="pb-1 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {domain.records.map((record) => (
                      <tr key={`${record.type}-${record.name}`}>
                        <td className="pr-3 font-mono">{record.type}</td>
                        <td className="pr-3 font-mono">{record.name}</td>
                        <td className="font-mono">{record.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
