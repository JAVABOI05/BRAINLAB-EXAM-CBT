# Private Console Access

The public BrainLab Academy site must not link to the operator console. The console sign-in is reached through a server-configured, non-obvious single-segment path. No secret path or token is stored in source control.

## Environment variables

Configure these as **server-only** environment variables in the deployment platform (Vercel project settings) and in a local `.env.local` when testing. Do not use a `NEXT_PUBLIC_` prefix and never commit real values.

- `BRAINLAB_PRIVATE_ENTRY_PATH`: a random single URL segment, 32–128 characters, using only letters, numbers, underscores or hyphens.
- `BRAINLAB_PRIVATE_ENTRY_TOKEN`: a separate random secret, at least 32 characters. This becomes an HttpOnly, Secure-on-HTTPS, SameSite=Lax cookie scoped to `/admin` for up to eight hours after the private entry path is visited.

Generate two different random values locally. Example PowerShell commands:

```powershell
function New-PrivateValue {
  $bytes = New-Object byte[] 32
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
}

$entryPath = New-PrivateValue
$entryToken = New-PrivateValue
Write-Output "BRAINLAB_PRIVATE_ENTRY_PATH=$entryPath"
Write-Output "BRAINLAB_PRIVATE_ENTRY_TOKEN=$entryToken"
```

Keep the output private. Use separate values for preview and production environments. Configure the variables in the hosting dashboard, not in commits or chat. After changing deployment environment variables, redeploy the relevant environment so the server receives them.

## Behavior and recovery

- If either variable is missing or invalid, all `/admin/**` routes fail closed with a 404 and the private sign-in entry is unavailable.
- Visiting the configured entry path rewrites internally to the sign-in page and sets the entry-gate cookie. The browser URL does not change to `/admin/login`.
- Direct requests to `/admin/**` without the gate cookie return 404. Responses include `X-Robots-Tag: noindex, nofollow, noarchive` and `Cache-Control: no-store`.
- The sign-in screen uses neutral “Private Platform Access” wording and is not linked from public navigation, the landing page, footer or sitemap.
- If the entry path is lost, an authorized deployment owner must set a new random path/token pair in the hosting environment. Do not add a recovery link to the public site.

## Security limitations

This gate only reduces casual discovery and adds a private-entry layer. It is **not** a substitute for Supabase Auth, verified server-side admin authorization, database RLS, least-privilege RPC grants, rate limiting, or monitoring. A person who obtains the path can still reach the sign-in form; a person who obtains the gate cookie can pass this routing layer. Every protected read and mutation must independently deny non-admin users.

This implementation does not change the database, Supabase Auth configuration, existing admin accounts, DNS, or production deployment. Verify the gate in a staging preview after configuring the variables. Do not mark the admin security audit complete until direct-route denial and non-admin database authorization are tested.
