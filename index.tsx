// AnyPlayerControls: vibe-coded with AI assistance, lightly tested. GPL-3.0-or-later (see LICENSE).
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { React, useEffect, useState } from "@webpack/common";

const Native = VencordNative.pluginHelpers.AnyPlayerControls as PluginNative<typeof import("./native")>;

const settings = definePluginSettings({
    player: {
        type: OptionType.STRING,
        description: "playerctl player name (see `playerctl -l`). Empty = first active player.",
        default: ""
    },
    pollMs: {
        type: OptionType.NUMBER,
        description: "Poll interval in ms",
        default: 1000
    }
});

interface State {
    status: string; title: string; artist: string; album: string;
    lengthMs: number; positionMs: number; art: string;
}

const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const STRONG = "var(--text-strong, var(--text-default, #fff))";
const NORMAL = "var(--text-default, #fff)";
const MUTED = "var(--text-muted, rgba(255,255,255,0.6))";

const Icon = ({ d }: { d: string; }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d={d} /></svg>
);
const PREV = "M6 6h2v12H6zm3.5 6 8.5 6V6z";
const NEXT = "M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z";
const PLAY = "M8 5v14l11-7z";
const PAUSE = "M6 19h4V5H6v14zm8-14v14h4V5h-4z";

function Player() {
    const { player, pollMs } = settings.use(["player", "pollMs"]);
    const [s, setS] = useState<State | null>(null);

    useEffect(() => {
        let alive = true;
        const tick = async () => {
            const r = await Native.getState(player);
            if (alive) setS(r);
        };
        tick();
        const id = setInterval(tick, Math.max(500, pollMs));
        return () => { alive = false; clearInterval(id); };
    }, [player, pollMs]);

    if (!s || s.status === "Stopped" || !s.title) return null;

    const btn: React.CSSProperties = {
        background: "none", border: "none", cursor: "pointer",
        color: NORMAL, padding: "4px 10px", display: "flex", alignItems: "center"
    };
    const pct = s.lengthMs ? Math.min(100, (s.positionMs / s.lengthMs) * 100) : 0;
    const ellipsis: React.CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

    return (
        <div style={{
            padding: 8, color: NORMAL,
            background: "rgba(0, 0, 0, 0.25)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)"
        }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {s.art && <img src={s.art} width={48} height={48} style={{ borderRadius: 4 }} />}
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: STRONG, fontWeight: 600, ...ellipsis }}>{s.title}</div>
                    <div style={{ color: MUTED, fontSize: 12, ...ellipsis }}>{s.artist}{s.album ? ` — ${s.album}` : ""}</div>
                </div>
            </div>
            <div style={{ height: 3, background: "rgba(255, 255, 255, 0.15)", borderRadius: 2, margin: "8px 0 2px" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: "var(--brand-500, #5865f2)", borderRadius: 2 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: MUTED, fontSize: 11 }}>
                <span>{fmt(s.positionMs)}</span><span>{fmt(s.lengthMs)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
                <button style={btn} aria-label="Previous" onClick={() => Native.command(player, "previous")}><Icon d={PREV} /></button>
                <button style={btn} aria-label="Play/Pause" onClick={() => Native.command(player, "play-pause")}><Icon d={s.status === "Playing" ? PAUSE : PLAY} /></button>
                <button style={btn} aria-label="Next" onClick={() => Native.command(player, "next")}><Icon d={NEXT} /></button>
            </div>
        </div>
    );
}

export default definePlugin({
    name: "AnyPlayerControls",
    description: "Media player widget above the account panel for any MPRIS player on Linux (Navidrome clients, VLC, mpv, browsers, ...)",
    authors: [{ name: "kaiiress", id: 0n }],
    settings,

    patches: [
        {
            find: "#{intl::USER_PROFILE_ACCOUNT_POPOUT_BUTTON_A11Y_LABEL}",
            replacement: {
                match: /(?<=\i\.jsxs?\)\()(\i),{(?=[^}]*?userTag:\i,occluded:)/,
                replace: "$self.PanelWrapper,{VencordOriginal:$1,"
            }
        }
    ],

    PanelWrapper({ VencordOriginal, ...props }) {
        return (
            <>
                <ErrorBoundary noop>
                    <Player />
                </ErrorBoundary>

                <VencordOriginal {...props} />
            </>
        );
    }
});
