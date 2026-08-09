# rootathome.diy

Coming-soon site for [root@home](https://github.com/rouzitalab/rootathome) — self-hosted household media.

Custom domain: `www.rootathome.diy` (see `CNAME`).

## Local preview

```bash
python3 -m http.server 4173
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173).

## Deploy (GitHub Pages)

Serve the repo root; `index.html` is the entry.

### Enforce HTTPS

Static files cannot force TLS alone — GitHub Pages must issue the cert and redirect.

1. Push `CNAME` (`www.rootathome.diy`).
2. Repo **Settings → Pages → Custom domain**: `www.rootathome.diy` → Save → wait until DNS check is green.
3. Wait until **Enforce HTTPS** is clickable (cert usually ready within minutes; can take up to 24h).
4. Check **Enforce HTTPS**.

After that, `http://` requests redirect to `https://`.

**DNS tip:** apex `rootathome.diy` should use only GitHub Pages A records (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`). Extra GoDaddy forwarding IPs can break HTTPS for the bare domain.
