# Node.js Upgrade Complete ✅

Node.js 22.21.1 has been installed on your system!

## Switch to Node 22

In your terminal, run:

```bash
nvm use 22
```

Or to make it the default:

```bash
nvm alias default 22
nvm use default
```

## Verify

Check that you're using Node 22:

```bash
node --version
# Should show: v22.21.1
```

## Next Steps

Now you can proceed with Capacitor setup:

```bash
# Initialize Capacitor platforms
npm run cap:add:ios      # macOS only
npm run cap:add:android

# Or use the setup script
./scripts/setup-capacitor.sh
```

## Troubleshooting

If `nvm use 22` doesn't work:

1. **Reload nvm:**
   ```bash
   source ~/.nvm/nvm.sh
   nvm use 22
   ```

2. **Check installed versions:**
   ```bash
   nvm ls
   ```

3. **If Node 22 isn't listed, reinstall:**
   ```bash
   nvm install 22
   ```

## Make it Permanent

To automatically use Node 22 in new terminal sessions, add to your `~/.zshrc` (or `~/.bashrc`):

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 22 > /dev/null 2>&1
```

Or set it as default:
```bash
nvm alias default 22
```

