"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Row,
  Col,
  Card,
  Statistic,
  Tag,
  Alert,
  Skeleton,
  Empty,
  Button,
  Badge,
  Space,
  Typography,
} from "antd";
import {
  DollarSign,
  AlertTriangle,
  CheckSquare,
  Clock,
  ArrowRight,
  MessageSquare,
  PhoneCall,
  Flame,
  Mail,
  Instagram,
  Globe,
  Radio,
} from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { KrovaAntdTheme } from "@/components/ui/krova-antd-theme";
import {
  ledger,
  approvals,
  analytics,
  formatPaise,
  type LedgerSummary,
  type Commitment,
  type MessageDraft,
  type AnalyticsOverview,
} from "@/lib/api";

const { Text, Title } = Typography;

const CHANNEL_META: Record<string, { label: string; icon: React.ElementType; iconWrap: string; text: string }> = {
  whatsapp: { label: "WhatsApp", icon: MessageSquare, iconWrap: "bg-seal/10 border-seal/20 text-seal-bright", text: "text-seal-bright" },
  voice: { label: "Voice", icon: PhoneCall, iconWrap: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400", text: "text-cyan-400" },
  instagram: { label: "Instagram", icon: Instagram, iconWrap: "bg-purple-500/10 border-purple-500/20 text-purple-400", text: "text-purple-400" },
  email: { label: "Email", icon: Mail, iconWrap: "bg-amber-500/10 border-amber-500/20 text-amber-400", text: "text-amber-400" },
  web: { label: "Website Widget", icon: Globe, iconWrap: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400", text: "text-indigo-400" },
};
const DEFAULT_CHANNEL_META = { label: "Other", icon: Radio, iconWrap: "bg-white/[0.04] border-white/[0.08] text-os-text-dim", text: "text-os-text-dim" };

/** Only surfaces anything once a draft's reply window is genuinely close to
 * closing - `expire_stale_drafts()` on the backend silently drops an
 * unapproved draft once this passes, so this is the one visible warning
 * an owner gets before that happens. */
function expiryUrgency(expiresAt: string | null): { label: string; color: string } | null {
  if (!expiresAt) return null;
  const msLeft = new Date(expiresAt).getTime() - Date.now();
  if (msLeft <= 0) return { label: "Window closed", color: "error" };
  const hoursLeft = msLeft / 3_600_000;
  if (hoursLeft < 2) {
    const mins = Math.round(msLeft / 60_000);
    return { label: `Expires in ${mins}m`, color: "error" };
  }
  if (hoursLeft < 6) {
    return { label: `Expires in ${Math.round(hoursLeft)}h`, color: "warning" };
  }
  return null;
}

export default function DashboardPage() {
  const [ledgerSummary, setLedgerSummary] = useState<LedgerSummary | null>(null);
  const [pendingDrafts, setPendingDrafts] = useState<MessageDraft[]>([]);
  const [overdueCommitments, setOverdueCommitments] = useState<Commitment[]>([]);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadDashboard = async () => {
      const [sumRes, draftsRes, overdueRes, overRes] = await Promise.allSettled([
        ledger.summary(),
        approvals.list("pending"),
        ledger.commitments({ overdue_only: true, direction: "they_owe", limit: 5 }),
        analytics.overview(),
      ]);
      if (!mounted) return;

      if (sumRes.status === "fulfilled") setLedgerSummary(sumRes.value);
      if (draftsRes.status === "fulfilled") setPendingDrafts(draftsRes.value.slice(0, 5));
      if (overdueRes.status === "fulfilled") setOverdueCommitments(overdueRes.value);
      if (overRes.status === "fulfilled") setOverview(overRes.value);

      const failed = [sumRes, draftsRes, overdueRes, overRes].find(
        (r) => r.status === "rejected",
      );
      if (failed && failed.status === "rejected") {
        setLoadError(
          failed.reason instanceof Error
            ? failed.reason.message
            : "Some dashboard data could not be loaded.",
        );
      }
      setIsLoading(false);
    };

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  const owedToUs = ledgerSummary?.owed_to_us_paise ?? 0;
  // "Receivables" means money customers owe us - scoped to that direction,
  // not the combined overdue_paise/overdue_count (which also includes
  // things we promised customers that are running late, a different kind
  // of overdue entirely).
  const overduePaise = ledgerSummary?.overdue_they_owe_paise ?? 0;
  const overdueCount = ledgerSummary?.overdue_they_owe_count ?? 0;
  const pendingCount = pendingDrafts.length;
  const openCount = ledgerSummary?.open_count ?? 0;
  const unconfirmedCount = ledgerSummary?.unconfirmed_count ?? 0;

  return (
    <KrovaAntdTheme>
      <AppLayout
        title="Executive Command Center"
        subtitle="Autonomous AI Operations & Financial Telemetry"
        actions={
          <Link href="/approvals">
            <Badge count={pendingCount} size="small" offset={[-4, 4]}>
              <Button type="primary" icon={<CheckSquare className="w-3.5 h-3.5" />}>
                Review Pending Drafts
              </Button>
            </Badge>
          </Link>
        }
      >
        <div className="space-y-6 max-w-7xl mx-auto">
          {loadError && <Alert type="error" message={loadError} showIcon closable />}

          {/* Top ROI Impact Banner */}
          <Card
            className="relative overflow-hidden"
            styles={{ body: { padding: 24 } }}
            style={{
              background: "linear-gradient(90deg, rgba(201,151,63,0.08), #121212 60%, #1A1A1A)",
              borderColor: "rgba(201,151,63,0.3)",
            }}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <Space size={8}>
                  <Tag color="success" bordered={false} className="font-mono">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-seal-bright animate-pulse mr-1.5" />
                    AI Watchdog Active
                  </Tag>
                  <Text type="secondary" className="text-xs font-mono">
                    • 24/7 Channel Ingestion
                  </Text>
                </Space>
                <Title
                  level={2}
                  style={{
                    margin: "6px 0 0",
                    fontFamily: "var(--font-fraunces), serif",
                  }}
                >
                  {overview ? overview.owed_to_you : formatPaise(owedToUs)}{" "}
                  <span className="text-base md:text-lg font-sans font-normal text-os-text-dim">
                    Total Receivables Tracked
                  </span>
                </Title>
                <Text type="secondary" className="text-xs max-w-xl block">
                  KROVA is monitoring WhatsApp and Voice streams, extracting commitment promises, and preparing draft responses.
                </Text>
              </div>

              <Space size={16} className="shrink-0">
                <Statistic
                  title="Promises Kept"
                  value={overview?.promises_kept != null ? Math.round(overview.promises_kept * 100) : undefined}
                  suffix={overview?.promises_kept != null ? "%" : undefined}
                  valueStyle={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 18 }}
                />
                <Statistic
                  title="Drafted by Agent"
                  value={overview?.agent.drafted}
                  valueStyle={{ fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 18 }}
                />
              </Space>
            </div>
          </Card>

          {/* 4 Core Financial & Operational Metric Cards */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title={<Space size={6}><DollarSign className="w-3.5 h-3.5" />Owed to You</Space>}
                  value={formatPaise(owedToUs)}
                  valueStyle={{ color: "#79AB90", fontSize: 22 }}
                />
                <Text type="secondary" className="text-[11px]">{openCount} open</Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title={<Space size={6}><AlertTriangle className="w-3.5 h-3.5" />Overdue Receivables</Space>}
                  value={formatPaise(overduePaise)}
                  valueStyle={{ color: "#D0655A", fontSize: 22 }}
                />
                <Tag color="error" bordered={false} className="mt-1">Urgent</Tag>
                <Text type="secondary" className="text-[11px] ml-1">{overdueCount} promises past deadline</Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title={<Space size={6}><CheckSquare className="w-3.5 h-3.5" />Pending Approvals</Space>}
                  value={pendingCount}
                  valueStyle={{ color: "#C9973F", fontSize: 22 }}
                />
                <Text type="secondary" className="text-[11px]">AI replies ready for review</Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title={<Space size={6}><Clock className="w-3.5 h-3.5" />Needs Review</Space>}
                  value={unconfirmedCount}
                  valueStyle={{ color: "#D0A548", fontSize: 22 }}
                />
                <Text type="secondary" className="text-[11px]">AI guesses awaiting confirmation</Text>
              </Card>
            </Col>
          </Row>

          {/* "What Needs Your Attention Today" Priority Grid */}
          <Row gutter={[24, 24]}>
            {/* Column 1: Overdue Commitments Needing Follow-up */}
            <Col xs={24} lg={12}>
              <Card
                title={
                  <Space>
                    <span className="p-1.5 rounded-lg bg-thread/10 border border-thread/20 text-thread-bright inline-flex">
                      <Flame className="w-4 h-4" />
                    </span>
                    <span>
                      <div className="text-sm font-bold">Overdue Commitments</div>
                      <div className="text-[11px] font-normal text-os-text-dim">Oldest unpaid promises requiring attention</div>
                    </span>
                  </Space>
                }
                extra={
                  <Link href="/ledger?filter=overdue" className="text-xs font-semibold text-thread-bright flex items-center gap-1">
                    View All ({overdueCount}) <ArrowRight className="w-3 h-3" />
                  </Link>
                }
              >
                {isLoading ? (
                  <Skeleton active paragraph={{ rows: 3 }} />
                ) : overdueCommitments.length === 0 ? (
                  <Empty description="No overdue commitments! All customers are on track." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <div className="space-y-2.5">
                    {overdueCommitments.map((c) => (
                      <div
                        key={c.id}
                        className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <Text strong className="text-xs truncate">{c.customer_name || "Client"}</Text>
                            <Tag color="error" bordered={false}>Overdue</Tag>
                          </div>
                          <Text type="secondary" className="text-[11px] line-clamp-1 block">
                            "{c.description || c.source_quote || "Payment promised"}"
                          </Text>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold font-mono text-thread-bright">
                            {c.amount_display || formatPaise(c.amount_paise)}
                          </p>
                          <p className="text-[10px] font-mono text-os-text-dim">
                            Due {c.due_at ? new Date(c.due_at).toLocaleDateString("en-IN") : "Past"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-os-text-dim">
                  <span>Auto-reminder campaigns available</span>
                  <Link href="/campaigns" className="text-xs text-brass font-semibold">
                    Send Reminder Broadcast →
                  </Link>
                </div>
              </Card>
            </Col>

            {/* Column 2: Oldest Pending Drafts */}
            <Col xs={24} lg={12}>
              <Card
                title={
                  <Space>
                    <span className="p-1.5 rounded-lg bg-brass/10 border border-brass/20 text-brass inline-flex">
                      <CheckSquare className="w-4 h-4" />
                    </span>
                    <span>
                      <div className="text-sm font-bold">Pending Draft Replies</div>
                      <div className="text-[11px] font-normal text-os-text-dim">AI proposed replies waiting for human approval</div>
                    </span>
                  </Space>
                }
                extra={
                  <Link href="/approvals" className="text-xs font-semibold text-brass flex items-center gap-1">
                    Go to Approvals ({pendingCount}) <ArrowRight className="w-3 h-3" />
                  </Link>
                }
              >
                {isLoading ? (
                  <Skeleton active paragraph={{ rows: 3 }} />
                ) : pendingDrafts.length === 0 ? (
                  <Empty description="Approvals inbox clear! No drafts pending your review." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <div className="space-y-2.5">
                    {pendingDrafts.map((d) => {
                      const urgency = expiryUrgency(d.expires_at);
                      return (
                        <div
                          key={d.id}
                          className="p-3.5 rounded-xl bg-white/[0.02] border border-brass/20 hover:border-brass/40 transition-all flex items-center justify-between gap-3"
                        >
                          <div className="space-y-1 overflow-hidden">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Text strong className="text-xs truncate">{d.customer_name || "Customer"}</Text>
                              <Tag color="gold" bordered={false}>{d.channel.toUpperCase()}</Tag>
                              <Text className="text-[10px] font-mono text-seal-bright">
                                {Math.round(d.confidence * 100)}% Match
                              </Text>
                              {urgency && (
                                <Tag icon={<Clock className="w-2.5 h-2.5" />} color={urgency.color} bordered={false}>
                                  {urgency.label}
                                </Tag>
                              )}
                            </div>
                            <Text type="secondary" className="text-[11px] line-clamp-1 italic block">
                              "{d.body}"
                            </Text>
                          </div>
                          <Link href="/approvals">
                            <Button size="small" type="default" className="shrink-0">Review</Button>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-os-text-dim">
                  <span>Operating in <strong>Draft Mode</strong> (Human-in-the-loop)</span>
                  <Link href="/settings" className="text-xs text-os-text-dim hover:text-white">
                    Configure Autonomy →
                  </Link>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Channel Activity — real message volume per channel, last 30 days */}
          <Card
            title={
              <span className="text-xs font-bold tracking-tight uppercase font-mono">
                Channel Activity <span className="text-os-text-dim font-normal normal-case">(last 30 days)</span>
              </span>
            }
            extra={
              <Link href="/settings" className="text-[11px] text-os-text-dim hover:text-white">
                Connect a channel →
              </Link>
            }
          >
            {isLoading ? (
              <Skeleton active paragraph={{ rows: 2 }} />
            ) : !overview || overview.channels.length === 0 ? (
              <Empty description="No conversations on any channel in the last 30 days yet." image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Row gutter={[16, 16]}>
                {overview.channels.map((c) => {
                  const meta = CHANNEL_META[c.channel] || DEFAULT_CHANNEL_META;
                  const Icon = meta.icon;
                  return (
                    <Col xs={24} sm={12} lg={8} key={c.channel}>
                      <div className="p-4 rounded-xl bg-os-card border border-white/[0.06] flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg border ${meta.iconWrap}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{meta.label}</p>
                          <p className={`text-[11px] font-mono ${meta.text}`}>
                            {c.inbound + c.outbound} messages · {c.customers} customer
                            {c.customers === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            )}
          </Card>
        </div>
      </AppLayout>
    </KrovaAntdTheme>
  );
}
