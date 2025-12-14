import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from "@whiskeysockets/baileys"
import express from "express"

const app = express()
let pairingRequested = false // 🔑 FLAG CRÍTICO

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth")
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    browser: ["Chrome", "Ubuntu", "22.04"],
    printQRInTerminal: false
  })

  sock.ev.on("creds.update", saveCreds)

  // ✅ PEDIR PAIRING SOLO UNA VEZ
  if (!state.creds.registered && !pairingRequested) {
    pairingRequested = true
    const phoneNumber = process.env.BOT_NUMBER
    const code = await sock.requestPairingCode(phoneNumber)
    console.log("📲 CÓDIGO DE VINCULACIÓN:", code)
  }

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update

    if (connection === "open") {
      console.log("✅ WhatsApp vinculado y conectado")
    }

    if (connection === "close") {
      const status = lastDisconnect?.error?.output?.statusCode
      if (status !== DisconnectReason.loggedOut) {
        console.log("🔄 Reconectando sin pedir pairing…")
        startBot()
      }
    }
  })
}

startBot()

app.get("/", (_, res) => res.send("Bot activo"))
app.listen(3000)


