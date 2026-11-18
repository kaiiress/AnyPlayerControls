// AnyPlayerControls: vibe-coded with AI assistance, lightly tested. GPL-3.0-or-later (see LICENSE).
import { execFile } from "child_process";
import { IpcMainInvokeEvent } from "electron";

const run = (args: string[]) =>
    new Promise<string>(resolve =>
        execFile("playerctl", args, { timeout: 2000 }, (err, stdout) => resolve(err ? "" : stdout.trim()))
    );

const pArgs = (player: string) => (player ? ["-p", player] : []);

let artCache = { url: "", data: "" };

async function toDataUrl(url: string): Promise<string> {
    if (!url) return "";
    if (artCache.url === url) return artCache.data;
    try {
        const r = await fetch(url);
        if (!r.ok) return "";
        const mime = r.headers.get("content-type") ?? "image/jpeg";
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length > 5_000_000) return "";
        const data = `data:${mime};base64,${buf.toString("base64")}`;
        artCache = { url, data };
        return data;
    } catch {
        return "";
    }
}

export async function getState(_: IpcMainInvokeEvent, player: string) {
    const fmt = ["status", "title", "artist", "album", "mpris:artUrl", "mpris:length", "position"]
        .map(k => `{{${k}}}`).join("\t");
    const out = await run([...pArgs(player), "metadata", "--format", fmt]);
    if (!out) return null;

    const [status, title, artist, album, artUrl, length, position] = out.split("\t");
    return {
        status,
        title,
        artist,
        album,
        lengthMs: Number(length) / 1000 || 0,
        positionMs: Number(position) / 1000 || 0,
        art: /^https?:\/\//.test(artUrl) ? await toDataUrl(artUrl) : ""
    };
}

export async function command(_: IpcMainInvokeEvent, player: string, cmd: string) {
    if (!["play-pause", "next", "previous"].includes(cmd)) return;
    await run([...pArgs(player), cmd]);
}
