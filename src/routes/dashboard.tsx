import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, KeyRound, ListChecks, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  addQuest,
  addToken,
  deleteQuest,
  deleteToken,
  getDashboard,
  saveSettings,
  toggleToken,
  updateQuestStatus,
} from "@/lib/account.functions";

const title = "แดชบอร์ดของฉัน — Flexozy";
const description = "จัดการโทเคน เควส และการตั้งค่าการแจ้งเตือนของบัญชีคุณ";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: DashboardPage,
});

const statusLabels: Record<string, string> = {
  pending: "รอเริ่ม",
  running: "กำลังทำ",
  done: "สำเร็จ",
  failed: "ล้มเหลว",
};

function DashboardPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard(),
    retry: false,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["dashboard"] });

  const [tokenLabel, setTokenLabel] = useState("");
  const [tokenValue, setTokenValue] = useState("");
  const [questName, setQuestName] = useState("");
  const [questGame, setQuestGame] = useState("");
  const [timezone, setTimezone] = useState("Asia/Bangkok");
  const [autoClaim, setAutoClaim] = useState(true);
  const [notifyDm, setNotifyDm] = useState(true);
  const [channelId, setChannelId] = useState("");

  useEffect(() => {
    if (!data) return;
    setTimezone(data.settings.timezone);
    setAutoClaim(data.settings.auto_claim);
    setNotifyDm(data.settings.notify_dm);
    setChannelId(data.settings.notify_channel_id ?? "");
  }, [data]);

  const tokenMutation = useMutation({
    mutationFn: (input: { label: string; token: string }) => addToken({ data: input }),
    onSuccess: () => {
      setTokenLabel("");
      setTokenValue("");
      toast.success("เพิ่มโทเคนแล้ว");
      refresh();
    },
    onError: () => toast.error("เพิ่มโทเคนไม่สำเร็จ"),
  });

  const questMutation = useMutation({
    mutationFn: (input: { questName: string; game: string | null }) => addQuest({ data: input }),
    onSuccess: () => {
      setQuestName("");
      setQuestGame("");
      toast.success("เพิ่มเควสแล้ว");
      refresh();
    },
    onError: () => toast.error("เพิ่มเควสไม่สำเร็จ"),
  });

  const settingsMutation = useMutation({
    mutationFn: () =>
      saveSettings({
        data: {
          timezone,
          autoClaim,
          notifyDm,
          notifyChannelId: channelId || null,
        },
      }),
    onSuccess: () => {
      toast.success("บันทึกการตั้งค่าแล้ว");
      refresh();
    },
    onError: () => toast.error("บันทึกไม่สำเร็จ"),
  });

  if (isLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-32 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" /> กำลังโหลดข้อมูล...
        </div>
      </Shell>
    );
  }

  if (error || !data) {
    return (
      <Shell>
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="text-2xl font-bold">ต้องเข้าสู่ระบบก่อน</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            กรุณาเข้าสู่ระบบด้วย Discord เพื่อดูแดชบอร์ดของคุณ
          </p>
          <Button variant="hero" size="lg" className="mt-6" asChild>
            <Link to="/login">เข้าสู่ระบบ</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const activeTokens = data.tokens.filter((t) => t.isActive).length;
  const runningQuests = data.quests.filter((q) => q.status === "running").length;
  const doneQuests = data.quests.filter((q) => q.status === "done").length;

  return (
    <Shell>
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              สวัสดี {data.user.globalName ?? data.user.username}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              ภาพรวมโทเคนและเควสทั้งหมดของคุณ
            </p>
          </div>
          <Button variant="outline" asChild>
            <a href="/api/public/auth/logout">ออกจากระบบ</a>
          </Button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard icon={KeyRound} label="โทเคนที่เปิดใช้" value={activeTokens} />
          <StatCard icon={ListChecks} label="เควสที่กำลังทำ" value={runningQuests} />
          <StatCard icon={CheckCircle2} label="เควสที่สำเร็จ" value={doneQuests} />
        </div>

        <Tabs defaultValue="quests" className="mt-10">
          <TabsList>
            <TabsTrigger value="quests">เควส</TabsTrigger>
            <TabsTrigger value="tokens">โทเคน</TabsTrigger>
            <TabsTrigger value="settings">ตั้งค่า</TabsTrigger>
          </TabsList>

          <TabsContent value="quests" className="mt-6 space-y-6">
            <Card className="border-border/70 shadow-soft">
              <CardHeader>
                <CardTitle className="text-base">เพิ่มเควสใหม่</CardTitle>
                <CardDescription>ระบุชื่อเควสและเกม (ถ้ามี)</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!questName.trim()) return;
                    questMutation.mutate({ questName, game: questGame || null });
                  }}
                >
                  <Input
                    value={questName}
                    onChange={(e) => setQuestName(e.target.value)}
                    placeholder="ชื่อเควส"
                  />
                  <Input
                    value={questGame}
                    onChange={(e) => setQuestGame(e.target.value)}
                    placeholder="เกม (ไม่บังคับ)"
                  />
                  <Button type="submit" variant="hero" disabled={questMutation.isPending}>
                    <Plus className="size-4" /> เพิ่ม
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {data.quests.length === 0 ? (
                <EmptyState text="ยังไม่มีเควส เพิ่มรายการแรกได้เลย" />
              ) : (
                data.quests.map((quest) => (
                  <Card key={quest.id} className="border-border/70 shadow-soft">
                    <CardContent className="flex flex-wrap items-center gap-4 p-5">
                      <div className="min-w-48 flex-1">
                        <p className="font-semibold">{quest.quest_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {quest.game ?? "ไม่ระบุเกม"} · {statusLabels[quest.status] ?? quest.status}
                        </p>
                        <Progress value={quest.progress} className="mt-3 h-2" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="soft"
                          onClick={async () => {
                            await updateQuestStatus({
                              data: { id: quest.id, status: "running", progress: 50 },
                            });
                            refresh();
                          }}
                        >
                          กำลังทำ
                        </Button>
                        <Button
                          size="sm"
                          variant="hero"
                          onClick={async () => {
                            await updateQuestStatus({
                              data: { id: quest.id, status: "done", progress: 100 },
                            });
                            refresh();
                          }}
                        >
                          สำเร็จ
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="ลบเควส"
                          onClick={async () => {
                            await deleteQuest({ data: { id: quest.id } });
                            refresh();
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="tokens" className="mt-6 space-y-6">
            <Card className="border-border/70 shadow-soft">
              <CardHeader>
                <CardTitle className="text-base">เพิ่มโทเคน</CardTitle>
                <CardDescription>ค่าจริงจะถูกซ่อนไว้ แสดงเฉพาะบางตัวอักษร</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto]"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!tokenLabel.trim() || tokenValue.trim().length < 20) {
                      toast.error("กรอกชื่อกำกับและโทเคนให้ครบ");
                      return;
                    }
                    tokenMutation.mutate({ label: tokenLabel, token: tokenValue });
                  }}
                >
                  <Input
                    value={tokenLabel}
                    onChange={(e) => setTokenLabel(e.target.value)}
                    placeholder="ชื่อกำกับ เช่น บอทหลัก"
                  />
                  <Input
                    type="password"
                    value={tokenValue}
                    onChange={(e) => setTokenValue(e.target.value)}
                    placeholder="วางโทเคนที่นี่"
                  />
                  <Button type="submit" variant="hero" disabled={tokenMutation.isPending}>
                    <Plus className="size-4" /> เพิ่ม
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {data.tokens.length === 0 ? (
                <EmptyState text="ยังไม่มีโทเคนในคลัง" />
              ) : (
                data.tokens.map((token) => (
                  <Card key={token.id} className="border-border/70 shadow-soft">
                    <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                      <div>
                        <p className="font-semibold">{token.label}</p>
                        <p className="font-mono text-xs text-muted-foreground">{token.preview}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={token.isActive}
                            onCheckedChange={async (checked) => {
                              await toggleToken({ data: { id: token.id, isActive: checked } });
                              refresh();
                            }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {token.isActive ? "เปิดใช้" : "ปิดอยู่"}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="ลบโทเคน"
                          onClick={async () => {
                            await deleteToken({ data: { id: token.id } });
                            refresh();
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card className="max-w-2xl border-border/70 shadow-soft">
              <CardHeader>
                <CardTitle className="text-base">การตั้งค่าระบบ</CardTitle>
                <CardDescription>ปรับพฤติกรรมการทำงานและการแจ้งเตือน</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="tz">โซนเวลา</Label>
                  <Input id="tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="channel">รหัสห้องแจ้งเตือน (ไม่บังคับ)</Label>
                  <Input
                    id="channel"
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    placeholder="เช่น 1429501061877469304"
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-secondary p-4">
                  <div>
                    <p className="text-sm font-medium">รับเควสอัตโนมัติ</p>
                    <p className="text-xs text-muted-foreground">เริ่มเควสใหม่ให้ทันทีที่พบ</p>
                  </div>
                  <Switch checked={autoClaim} onCheckedChange={setAutoClaim} />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-secondary p-4">
                  <div>
                    <p className="text-sm font-medium">แจ้งเตือนทาง DM</p>
                    <p className="text-xs text-muted-foreground">ส่งข้อความส่วนตัวเมื่อเควสเปลี่ยนสถานะ</p>
                  </div>
                  <Switch checked={notifyDm} onCheckedChange={setNotifyDm} />
                </div>
                <Button
                  variant="hero"
                  size="lg"
                  onClick={() => settingsMutation.mutate()}
                  disabled={settingsMutation.isPending}
                >
                  บันทึกการตั้งค่า
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-soft">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof KeyRound;
  label: string;
  value: number;
}) {
  return (
    <Card className="border-border/70 shadow-soft">
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-brand text-primary-foreground">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
