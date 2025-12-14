import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from "@whiskeysockets/baileys"
import express from "express"

const app = express()
let sock
let isConnecting = false

async function startBot() {
  if (isConnecting) return
  isConnecting = true

  const { state, saveCreds } = await useMultiFileAuthState("auth")
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    auth: state,
    browser: ["Chrome", "Ubuntu", "22.04"],
    printQRInTerminal: false
  })

  sock.ev.on("creds.update", saveCreds)

  // SOLO UNA VEZ
  if (!state.creds.registered) {
    const code = await sock.requestPairingCode(process.env.BOT_NUMBER)
    console.log("📲 CÓDIGO DE VINCULACIÓN:", code)
  }

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update

    if (connection === "open") {
      console.log("✅ WhatsApp conectado correctamente")
      isConnecting = false
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode

      if (reason === DisconnectReason.loggedOut) {
        console.log("❌ Sesión cerrada. Borra auth y vuelve a vincular.")
        process.exit(1)
      }

      console.log("⏳ Reintentando conexión en 10s…")
      setTimeout(() => {
        isConnecting = false
        startBot()
      }, 10000)
    }
  })
}

startBot()

app.get("/", (_, res) => res.send("Bot activo"))
app.listen(3000)
