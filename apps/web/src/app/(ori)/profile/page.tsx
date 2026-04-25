'use client'

/**
 * Profile page — verbatim port of ui-ref-orii/frontend/src/pages/Profile.jsx.
 *
 * Real wiring (TODO):
 *   currentUser → useInterwovenKit() initiaAddress + useResolve() name.
 *   authorizedAgents → agent_policy.move query for the connected user.
 *   profileActions → profile_registry.move + reputation.move msg helpers.
 *   achievements / quests → on-chain badge + quest progression queries.
 *   privacy / push toggles → profile_registry.move privacy field +
 *     /v1/push/subscribe endpoint.
 */
import { useState } from 'react'
import {
  BadgeCheck,
  Bell,
  Bot,
  Link as LinkIcon,
  ShieldCheck,
  Store,
  Trophy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActionCard, ActionDialog, type Action, type ActionRecord } from '@/components/action-dialog'
import {
  achievements,
  authorizedAgents,
  currentUser,
  profileActions,
  quests,
} from '@/data/ori-data'

export default function ProfilePage() {
  const [modalAction, setModalAction] = useState<Action | null>(null)
  const [recentAction, setRecentAction] = useState<ActionRecord | null>(null)
  const [privacy, setPrivacy] = useState(true)
  const [pushEnabled, setPushEnabled] = useState(true)
  const [autoSign, setAutoSign] = useState(false)
  const [agentLimit, setAgentLimit] = useState<number[]>([250])

  return (
    <section className="p-4 sm:p-6 lg:p-8" data-testid="profile-page">
      <div
        className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]"
        data-testid="profile-header-grid"
      >
        <div
          className="border border-black/10 bg-[#F5F5F5] p-6"
          data-testid="profile-identity-card"
        >
          <p
            className="text-xs font-bold uppercase tracking-[0.2em] text-[#52525B]"
            data-testid="profile-overline"
          >
            Profile registry
          </p>
          <h2
            className="mt-3 font-heading text-5xl font-black tracking-tighter"
            data-testid="profile-handle"
          >
            {currentUser.handle}
          </h2>
          <p
            className="mt-4 max-w-2xl text-sm leading-6 text-[#52525B]"
            data-testid="profile-bio"
          >
            {currentUser.bio}
          </p>
          <div
            className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
            data-testid="profile-stats-grid"
          >
            <div className="border border-black/10 bg-white p-4" data-testid="profile-address-box">
              <p className="text-xs uppercase tracking-[0.18em] text-[#52525B]">Address</p>
              <p className="mt-2 font-mono text-sm" data-testid="profile-address">
                {currentUser.address}
              </p>
            </div>
            <div className="border border-black/10 bg-white p-4" data-testid="profile-followers-box">
              <p className="text-xs uppercase tracking-[0.18em] text-[#52525B]">Followers</p>
              <p className="mt-2 font-mono text-lg font-black" data-testid="profile-followers">
                {currentUser.followers}
              </p>
            </div>
            <div className="border border-black/10 bg-white p-4" data-testid="profile-following-box">
              <p className="text-xs uppercase tracking-[0.18em] text-[#52525B]">Following</p>
              <p className="mt-2 font-mono text-lg font-black" data-testid="profile-following">
                {currentUser.following}
              </p>
            </div>
            <div className="border border-black/10 bg-white p-4" data-testid="profile-trust-box">
              <p className="text-xs uppercase tracking-[0.18em] text-[#52525B]">Trust</p>
              <p className="mt-2 font-mono text-lg font-black" data-testid="profile-trust">
                {currentUser.trust}/100
              </p>
            </div>
          </div>
        </div>
        <div
          className="border border-black bg-black p-6 text-white"
          data-testid="agent-policy-card"
        >
          <Bot className="h-7 w-7 text-[#0022FF]" />
          <h3
            className="mt-5 font-heading text-3xl font-black tracking-tight"
            data-testid="agent-policy-title"
          >
            MCP agent policy
          </h3>
          <p className="mt-2 text-sm text-white/70" data-testid="agent-policy-copy">
            Claude Desktop runs on the user&rsquo;s machine. Ori only stores the rulebook: caps, allowed tools, revoke, and kill switch.
          </p>
          <div className="mt-6">
            <div className="mb-3 flex justify-between font-mono text-sm">
              <span data-testid="agent-limit-label">Daily cap</span>
              <span data-testid="agent-limit-value">{agentLimit[0]} INIT</span>
            </div>
            <Slider
              value={agentLimit}
              onValueChange={setAgentLimit}
              max={500}
              step={10}
              className="[&_[role=slider]]:rounded-none [&_[role=slider]]:bg-white"
              data-testid="agent-limit-slider"
            />
          </div>
          <div
            className="mt-6 flex items-center justify-between border border-white/20 p-4"
            data-testid="privacy-row"
          >
            <span className="flex items-center gap-2 text-sm" data-testid="privacy-label">
              <ShieldCheck className="h-4 w-4" /> Private follows
            </span>
            <Switch
              checked={privacy}
              onCheckedChange={setPrivacy}
              className="data-[state=checked]:bg-[#0022FF]"
              data-testid="privacy-switch"
            />
          </div>
          <div className="mt-4 space-y-3" data-testid="authorized-agent-list">
            {authorizedAgents.map((agent) => (
              <div
                key={agent.id}
                className="border border-white/20 p-4"
                data-testid={`profile-authorized-agent-${agent.id}`}
              >
                <p
                  className="font-heading text-lg font-bold"
                  data-testid={`profile-authorized-agent-name-${agent.id}`}
                >
                  {agent.name}
                </p>
                <p
                  className="font-mono text-xs text-white/60"
                  data-testid={`profile-authorized-agent-address-${agent.id}`}
                >
                  {agent.address}
                </p>
                <p
                  className="mt-2 font-mono text-xs text-[#00C566]"
                  data-testid={`profile-authorized-agent-status-${agent.id}`}
                >
                  {agent.status}
                </p>
                <p
                  className="mt-3 text-xs text-white/70"
                  data-testid={`profile-authorized-agent-methods-${agent.id}`}
                >
                  Allowed: {agent.methods.join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4"
        data-testid="profile-secondary-grid"
      >
        <article
          className="border border-black/10 bg-white p-6"
          data-testid="achievements-card"
        >
          <Trophy className="h-6 w-6 text-[#FFB800]" />
          <h3
            className="mt-5 font-heading text-2xl font-black tracking-tight"
            data-testid="achievements-title"
          >
            Achievements
          </h3>
          <div className="mt-4 space-y-3">
            {achievements.map((badge) => (
              <div
                key={badge.id}
                className="border border-black/10 p-3"
                data-testid={`achievement-${badge.id}`}
              >
                <p
                  className="flex items-center gap-2 font-semibold"
                  data-testid={`achievement-name-${badge.id}`}
                >
                  <BadgeCheck className="h-4 w-4 text-[#0022FF]" />
                  {badge.name}
                </p>
                <p
                  className="mt-1 text-sm text-[#52525B]"
                  data-testid={`achievement-detail-${badge.id}`}
                >
                  {badge.detail}
                </p>
              </div>
            ))}
          </div>
        </article>
        <article
          className="border border-black/10 bg-white p-6"
          data-testid="quests-card"
        >
          <Bell className="h-6 w-6 text-[#0022FF]" />
          <h3
            className="mt-5 font-heading text-2xl font-black tracking-tight"
            data-testid="quests-title"
          >
            Quests
          </h3>
          <div className="mt-4 space-y-4">
            {quests.map((quest, index) => (
              <div key={quest} data-testid={`quest-${index}`}>
                <div className="mb-2 flex justify-between text-sm">
                  <span data-testid={`quest-title-${index}`}>{quest}</span>
                  <span className="font-mono" data-testid={`quest-progress-${index}`}>
                    {index + 1}/3
                  </span>
                </div>
                <Progress
                  value={(index + 1) * 28}
                  className="rounded-none bg-black/10"
                  data-testid={`quest-progress-bar-${index}`}
                />
              </div>
            ))}
          </div>
        </article>
        <article
          className="border border-black/10 bg-white p-6"
          data-testid="links-merchant-card"
        >
          <Store className="h-6 w-6 text-[#0022FF]" />
          <h3
            className="mt-5 font-heading text-2xl font-black tracking-tight"
            data-testid="merchant-title"
          >
            Merchant + links
          </h3>
          {['ori.app/mira', 'x402 merchant ready', 'A2A agent card online'].map((link) => (
            <Button
              key={link}
              variant="ghost"
              className="mt-3 h-auto w-full justify-start rounded-none border border-black/10 px-3 py-3 hover:bg-black hover:text-white"
              data-testid={`merchant-link-${link
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')}`}
            >
              <LinkIcon className="h-4 w-4" />
              {link}
            </Button>
          ))}
        </article>
        <article
          className="border border-black/10 bg-white p-6"
          data-testid="notifications-card"
        >
          <Bell className="h-6 w-6 text-[#0022FF]" />
          <h3
            className="mt-5 font-heading text-2xl font-black tracking-tight"
            data-testid="notifications-title"
          >
            Notifications
          </h3>
          <div className="mt-5 space-y-3">
            <div
              className="flex items-center justify-between border border-black/10 p-3"
              data-testid="push-notification-row"
            >
              <span className="text-sm" data-testid="push-notification-label">
                Phone push
              </span>
              <Switch
                checked={pushEnabled}
                onCheckedChange={setPushEnabled}
                className="data-[state=checked]:bg-[#0022FF]"
                data-testid="push-notification-switch"
              />
            </div>
            <div
              className="flex items-center justify-between border border-black/10 p-3"
              data-testid="auto-sign-row"
            >
              <span className="text-sm" data-testid="auto-sign-label">
                One-tap auto-sign
              </span>
              <Switch
                checked={autoSign}
                onCheckedChange={setAutoSign}
                className="data-[state=checked]:bg-[#0022FF]"
                data-testid="auto-sign-switch"
              />
            </div>
            <p className="font-mono text-xs text-[#52525B]" data-testid="auto-sign-limit">
              Small tx limit: 5 INIT
            </p>
          </div>
        </article>
      </div>

      <Tabs defaultValue="identity" className="mt-8" data-testid="profile-tabs">
        <TabsList
          className="flex h-auto w-full flex-wrap justify-start rounded-none border border-black/10 bg-white p-0"
          data-testid="profile-tabs-list"
        >
          {profileActions.map((section) => (
            <TabsTrigger
              key={section.id}
              value={section.id}
              className="rounded-none border-r border-black/10 px-4 py-3 data-[state=active]:bg-[#0022FF] data-[state=active]:text-white"
              data-testid={`profile-tab-${section.id}`}
            >
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {profileActions.map((section) => (
          <TabsContent
            key={section.id}
            value={section.id}
            className="mt-4"
            data-testid={`profile-tab-content-${section.id}`}
          >
            <div
              className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
              data-testid={`profile-actions-grid-${section.id}`}
            >
              {section.actions.map((action) => (
                <ActionCard
                  key={action.id}
                  scope={`profile-${section.id}`}
                  action={action as Action}
                  onOpen={setModalAction}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {recentAction && (
        <p className="mt-6 font-mono text-sm text-[#0022FF]" data-testid="profile-recent-action">
          {recentAction.title} simulated.
        </p>
      )}
      <ActionDialog
        action={modalAction}
        onClose={() => setModalAction(null)}
        onComplete={setRecentAction}
      />
    </section>
  )
}
