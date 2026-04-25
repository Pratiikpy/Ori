'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { AppShell } from '@/components/app-shell'
import { AgentPolicySection } from '@/components/agent-policy-section'
import { MerchantSection } from '@/components/merchant-section'
import { PageHeader, Serif } from '@/components/page-header'
import { useSession } from '@/hooks/use-session'
import { useAutoSign } from '@/hooks/use-auto-sign'
import { ORI_CHAIN_ID } from '@/lib/chain-config'
import { getProfile, type ProfileData } from '@/lib/api'
import {
  msgSetSlug,
  msgUpdateAvatar,
  msgUpdateBio,
  msgUpdateLinks,
  msgUpdatePrivacy,
  msgUpdateTheme,
} from '@/lib/contracts'
import { buildAutoSignFee, sendTx } from '@/lib/tx'

export default function SettingsPage() {
  const router = useRouter()
  const kit = useInterwovenKit()
  const { initiaAddress, isConnected } = kit
  const { status, isAuthenticated, signOut } = useSession()
  const { isEnabled: autoSign } = useAutoSign()

  useEffect(() => {
    if (!isConnected) router.replace('/')
    else if (status === 'unauthenticated') router.replace('/onboard')
  }, [isConnected, status, router])

  const { data: profile, refetch } = useQuery<ProfileData>({
    queryKey: ['profile', initiaAddress],
    queryFn: () => getProfile(initiaAddress),
    enabled: Boolean(initiaAddress) && isAuthenticated,
    staleTime: 30_000,
  })

  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [links, setLinks] = useState<Array<{ label: string; url: string }>>([])
  const [hideBalance, setHideBalance] = useState(false)
  const [hideActivity, setHideActivity] = useState(false)
  const [whitelistOnly, setWhitelistOnly] = useState(false)
  const [slug, setSlug] = useState('')
  const [accentColor, setAccentColor] = useState('#6c7bff')

  const [busySection, setBusySection] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    setBio(profile.bio)
    setAvatarUrl(profile.avatarUrl)
    setLinks(profile.links)
    setHideBalance(profile.hideBalance)
    setHideActivity(profile.hideActivity)
    setWhitelistOnly(profile.whitelistOnly)
  }, [profile])

  const fire = async <T,>(
    key: string,
    body: () => Promise<T>,
  ): Promise<T | null> => {
    setBusySection(key)
    try {
      const r = await body()
      await refetch()
      toast.success('Saved')
      return r
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
      return null
    } finally {
      setBusySection(null)
    }
  }

  const saveBio = () =>
    fire('bio', () =>
      sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msgUpdateBio(initiaAddress, bio.slice(0, 280))],
        autoSign,
        fee: autoSign ? buildAutoSignFee(300_000) : undefined,
      }),
    )

  const saveAvatar = () =>
    fire('avatar', () =>
      sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msgUpdateAvatar(initiaAddress, avatarUrl.slice(0, 512))],
        autoSign,
        fee: autoSign ? buildAutoSignFee(300_000) : undefined,
      }),
    )

  const saveLinks = () =>
    fire('links', () =>
      sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [
          msgUpdateLinks(
            initiaAddress,
            links.map((l) => l.url),
            links.map((l) => l.label),
          ),
        ],
        autoSign,
        fee: autoSign ? buildAutoSignFee(400_000) : undefined,
      }),
    )

  const savePrivacy = () =>
    fire('privacy', () =>
      sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msgUpdatePrivacy(initiaAddress, hideBalance, hideActivity, whitelistOnly)],
        autoSign,
        fee: autoSign ? buildAutoSignFee(300_000) : undefined,
      }),
    )

  const saveSlug = () =>
    fire('slug', () =>
      sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [msgSetSlug(initiaAddress, slug.trim().toLowerCase())],
        autoSign,
        fee: autoSign ? buildAutoSignFee(300_000) : undefined,
      }),
    )

  const saveTheme = () =>
    fire('theme', () =>
      sendTx(kit, {
        chainId: ORI_CHAIN_ID,
        messages: [
          msgUpdateTheme(
            initiaAddress,
            JSON.stringify({ accent: accentColor }),
          ),
        ],
        autoSign,
        fee: autoSign ? buildAutoSignFee(300_000) : undefined,
      }),
    )

  return (
    <AppShell title="Settings">
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader
          kicker="06 · Settings"
          title={
            <>
              Your <Serif>profile</Serif> and caps.
            </>
          }
          sub="Bio, privacy, agent policy, and the kill switch — everything that's only yours to flip."
        />

        <AgentPolicySection />

        <Section title="Bio" busy={busySection === 'bio'} onSave={saveBio}>
          <textarea
            rows={3}
            maxLength={280}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full rounded-xl bg-muted border border-border px-3 py-3 focus:outline-none focus:border-primary"
          />
          <div className="mt-1 text-[11px] text-muted-foreground text-right">
            {bio.length} / 280
          </div>
        </Section>

        <Section title="Avatar" busy={busySection === 'avatar'} onSave={saveAvatar}>
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="ipfs://… or https://…"
            className="w-full rounded-xl bg-muted border border-border px-3 py-2 font-mono focus:outline-none focus:border-primary"
          />
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt=""
              className="mt-3 w-20 h-20 rounded-xl object-cover border border-border"
              onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')}
            />
          )}
        </Section>

        <Section title="Links" busy={busySection === 'links'} onSave={saveLinks}>
          <div className="space-y-2">
            {links.map((l, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  value={l.label}
                  onChange={(e) => {
                    const copy = [...links]
                    copy[i] = { ...l, label: e.target.value }
                    setLinks(copy)
                  }}
                  placeholder="Label"
                  className="w-28 rounded-lg bg-muted border border-border px-2 py-1.5 text-sm focus:outline-none focus:border-primary"
                />
                <input
                  value={l.url}
                  onChange={(e) => {
                    const copy = [...links]
                    copy[i] = { ...l, url: e.target.value }
                    setLinks(copy)
                  }}
                  placeholder="https://…"
                  className="flex-1 rounded-lg bg-muted border border-border px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-primary"
                />
                <button
                  onClick={() => setLinks(links.filter((_, j) => j !== i))}
                  aria-label="Remove link"
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {links.length < 10 && (
              <button
                onClick={() => setLinks([...links, { label: '', url: '' }])}
                className="w-full rounded-xl border border-dashed border-border py-2 text-sm text-muted-foreground inline-flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add link
              </button>
            )}
          </div>
        </Section>

        <Section title="Privacy" busy={busySection === 'privacy'} onSave={savePrivacy}>
          <PrivacyToggle
            label="Hide my balance on profile"
            value={hideBalance}
            onChange={setHideBalance}
          />
          <PrivacyToggle
            label="Hide my activity feed"
            value={hideActivity}
            onChange={setHideActivity}
          />
          <PrivacyToggle
            label="Only allow messages from people I follow"
            value={whitelistOnly}
            onChange={setWhitelistOnly}
          />
        </Section>

        <Section title="Slug" busy={busySection === 'slug'} onSave={saveSlug}>
          <input
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
            }
            placeholder="custom-short-link"
            maxLength={32}
            className="w-full rounded-xl bg-muted border border-border px-3 py-2 font-mono focus:outline-none focus:border-primary"
          />
          <div className="mt-1.5 text-[11px] text-ink-3">
            Your profile will also be reachable at /{slug || 'your-slug'}
          </div>
        </Section>

        <Section title="Accent color" busy={busySection === 'theme'} onSave={saveTheme}>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-12 h-12 rounded-lg cursor-pointer bg-transparent border border-border"
              aria-label="Pick accent color"
            />
            <input
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="flex-1 rounded-xl bg-muted border border-border px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="mt-2 text-[11px] text-ink-3">
            Shown on your public profile header.
          </div>
        </Section>

        <MerchantSection />

        <div className="pt-2">
          <button
            onClick={() => void signOut()}
            className="w-full rounded-xl py-2 bg-muted border border-border text-sm text-muted-foreground"
          >
            Sign out of Ori
          </button>
        </div>
      </div>
    </AppShell>
  )
}

function Section({
  title,
  busy,
  onSave,
  children,
}: {
  title: string
  busy: boolean
  onSave: () => void | Promise<unknown>
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-border-strong)] bg-white/[0.022] p-5">
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="text-[11px] uppercase tracking-[0.14em] text-ink-3 font-mono">
          {title}
        </h2>
        <button
          onClick={() => void onSave()}
          disabled={busy}
          className="rounded-full h-7 px-3 text-[11.5px] font-medium bg-primary text-primary-foreground disabled:opacity-50 inline-flex items-center gap-1.5 hover:-translate-y-[1px] transition will-change-transform"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Save
        </button>
      </div>
      {children}
    </section>
  )
}

function PrivacyToggle({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between py-2">
      <span className="text-sm">{label}</span>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={
          'relative w-10 h-6 rounded-full transition ' +
          (value ? 'bg-primary' : 'bg-border')
        }
      >
        <span
          className={
            'absolute top-0.5 w-5 h-5 rounded-full bg-foreground transition ' +
            (value ? 'left-[18px]' : 'left-0.5')
          }
        />
      </button>
    </label>
  )
}
